import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as mammoth from 'mammoth';

import { Resume, ResumeDocument } from './schemas/resume.schema';
import { User, UserDocument } from '../authentication/schemas/user.schema';
import { GoogleDriveService } from '../../integrations/google-drive/google-drive.service';

// pdf-parse CJS import
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (
  buffer: Buffer,
) => Promise<{ text: string }>;

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

@Injectable()
export class ResumeService {
  private readonly logger = new Logger(ResumeService.name);

  constructor(
    @InjectModel(Resume.name)
    private readonly resumeModel: Model<ResumeDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly driveService: GoogleDriveService,
  ) {}

  async uploadResume(
    userId: string,
    file: Express.Multer.File,
    label: string,
  ): Promise<ResumeDocument> {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Only PDF and Word documents (.pdf, .doc, .docx) are allowed',
      );
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException('File size exceeds the 5MB limit');
    }

    const userDoc = await this.userModel.findById(userId).select('+googleRefreshToken').exec();
    const parsedText = await this.extractText(file.buffer, file.mimetype);
    const driveResult = await this.driveService.uploadFile(
      userDoc?.googleRefreshToken,
      file.buffer,
      file.originalname,
      file.mimetype,
    );

    const userObjectId = new Types.ObjectId(userId);
    const existingCount = await this.resumeModel.countDocuments({
      userId: userObjectId,
    });
    const isDefault = existingCount === 0;

    const resume = await this.resumeModel.create({
      userId: userObjectId,
      label: label || file.originalname,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: driveResult.sizeBytes || file.size,
      driveFileId: driveResult.fileId,
      driveWebViewLink: driveResult.webViewLink,
      driveDownloadLink: driveResult.webContentLink,
      parsedText,
      isDefault,
    });

    this.logger.log(`Resume uploaded: ${resume.label} for user: ${userId}`);
    return resume;
  }

  async getUserResumes(userId: string): Promise<ResumeDocument[]> {
    return this.resumeModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ isDefault: -1, createdAt: -1 })
      .exec();
  }

  async getResume(userId: string, resumeId: string): Promise<ResumeDocument> {
    const resume = await this.resumeModel
      .findOne({
        _id: new Types.ObjectId(resumeId),
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (!resume) throw new NotFoundException('Resume not found');
    return resume;
  }

  async deleteResume(userId: string, resumeId: string): Promise<void> {
    const resume = await this.getResume(userId, resumeId);
    const userDoc = await this.userModel.findById(userId).select('+googleRefreshToken').exec();
    await this.driveService.deleteFile(userDoc?.googleRefreshToken, resume.driveFileId);
    await this.resumeModel.deleteOne({ _id: resume._id });

    if (resume.isDefault) {
      const next = await this.resumeModel
        .findOne({ userId: new Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .exec();
      if (next) {
        await this.resumeModel.updateOne(
          { _id: next._id },
          { $set: { isDefault: true } },
        );
      }
    }
    this.logger.log(`Resume deleted: ${resumeId} for user: ${userId}`);
  }

  async setDefaultResume(
    userId: string,
    resumeId: string,
  ): Promise<ResumeDocument> {
    const resume = await this.getResume(userId, resumeId);
    await this.resumeModel.updateMany(
      { userId: new Types.ObjectId(userId) },
      { $set: { isDefault: false } },
    );
    await this.resumeModel.updateOne(
      { _id: resume._id },
      { $set: { isDefault: true } },
    );
    resume.isDefault = true;
    return resume;
  }

  /**
   * Downloads a resume to a temporary local file so Playwright can attach it.
   * Returns the absolute path to the local file.
   */
  async downloadResumeLocally(userId: string, resumeId: string): Promise<string> {
    const fs = require('fs/promises');
    const path = require('path');
    
    const resume = await this.getResume(userId, resumeId);
    const userDoc = await this.userModel.findById(userId).select('+googleRefreshToken').exec();
    
    const buffer = await this.driveService.downloadFile(userDoc?.googleRefreshToken, resume.driveFileId);
    
    const tmpDir = path.join(process.cwd(), '.tmp-resumes');
    await fs.mkdir(tmpDir, { recursive: true });
    
    const filePath = path.join(tmpDir, `${resume._id}_${resume.originalFilename}`);
    await fs.writeFile(filePath, buffer);
    
    this.logger.log(`Resume downloaded locally for upload: ${filePath}`);
    return filePath;
  }

  private async extractText(buffer: Buffer, mimeType: string): Promise<string> {
    try {
      if (mimeType === 'application/pdf') {
        const data = await pdfParse(buffer);
        return data.text.trim();
      }
      if (mimeType.includes('word')) {
        const result = await mammoth.extractRawText({ buffer });
        return result.value.trim();
      }
      return '';
    } catch (err: unknown) {
      this.logger.warn(
        `Text extraction failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return '';
    }
  }
}

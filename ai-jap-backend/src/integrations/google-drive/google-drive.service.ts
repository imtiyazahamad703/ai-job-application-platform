import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';
import * as path from 'path';

export interface DriveUploadResult {
  fileId: string;
  fileName: string;
  webViewLink: string;
  webContentLink: string;
  mimeType: string;
  sizeBytes: number;
}

@Injectable()
export class GoogleDriveService {
  private readonly logger = new Logger(GoogleDriveService.name);
  private drive: drive_v3.Drive;
  private readonly folderId: string;

  constructor(private readonly configService: ConfigService) {
    // Service Account key file path
    const keyFilePath = path.resolve(
      process.cwd(),
      'ai-job-platform-dev-4eca15ad6181.json',
    );

    const auth = new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    this.drive = google.drive({ version: 'v3', auth });
    this.folderId = this.configService.get<string>(
      'GOOGLE_DRIVE_FOLDER_ID',
      '',
    );
  }

  /**
   * Upload a file buffer to Google Drive and make it publicly readable.
   */
  async uploadFile(
    buffer: Buffer,
    originalFilename: string,
    mimeType: string,
  ): Promise<DriveUploadResult> {
    try {
      const stream = Readable.from(buffer);
      const timestamp = Date.now();
      const ext = path.extname(originalFilename);
      const baseName = path.basename(originalFilename, ext);
      const fileName = `${baseName}_${timestamp}${ext}`;

      const requestBody: drive_v3.Schema$File = { name: fileName };
      if (this.folderId) {
        requestBody.parents = [this.folderId];
      }

      // Upload the file
      const uploadResponse = await this.drive.files.create({
        requestBody,
        media: { mimeType, body: stream },
        fields: 'id, name, size, webViewLink, webContentLink',
      });

      const fileId = uploadResponse.data.id!;

      // Make the file publicly readable (anyone with link)
      await this.drive.permissions.create({
        fileId,
        requestBody: { role: 'reader', type: 'anyone' },
      });

      this.logger.log(`Uploaded to Drive: ${fileName} (id: ${fileId})`);

      return {
        fileId,
        fileName: uploadResponse.data.name ?? fileName,
        webViewLink: uploadResponse.data.webViewLink ?? '',
        webContentLink: uploadResponse.data.webContentLink ?? '',
        mimeType,
        sizeBytes: parseInt(uploadResponse.data.size ?? '0', 10),
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Google Drive upload failed: ${msg}`);
      throw new InternalServerErrorException(
        'Failed to upload file to storage',
      );
    }
  }

  /**
   * Delete a file from Google Drive.
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      await this.drive.files.delete({ fileId });
      this.logger.log(`Deleted from Drive: ${fileId}`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Google Drive delete failed for ${fileId}: ${msg}`);
      throw new InternalServerErrorException(
        'Failed to delete file from storage',
      );
    }
  }

  /**
   * Get file metadata from Google Drive.
   */
  async getFileMetadata(fileId: string): Promise<drive_v3.Schema$File> {
    try {
      const response = await this.drive.files.get({
        fileId,
        fields: 'id, name, size, webViewLink, webContentLink, mimeType',
      });
      return response.data;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Google Drive get metadata failed for ${fileId}: ${msg}`,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve file metadata',
      );
    }
  }
}

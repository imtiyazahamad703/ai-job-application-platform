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

  constructor(private readonly configService: ConfigService) {}

  private getDriveClient(refreshToken?: string): drive_v3.Drive {
    if (!refreshToken) {
      throw new InternalServerErrorException(
        'Google Drive account not connected. Please sign in with Google.',
      );
    }
    const oAuth2Client = new google.auth.OAuth2(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
      this.configService.get<string>('GOOGLE_REDIRECT_URI'),
    );
    oAuth2Client.setCredentials({ refresh_token: refreshToken });
    return google.drive({ version: 'v3', auth: oAuth2Client });
  }

  /**
   * Upload a file buffer to Google Drive and make it publicly readable.
   */
  async uploadFile(
    refreshToken: string | undefined,
    buffer: Buffer,
    originalFilename: string,
    mimeType: string,
  ): Promise<DriveUploadResult> {
    try {
      const drive = this.getDriveClient(refreshToken);
      const stream = Readable.from(buffer);
      const timestamp = Date.now();
      const ext = path.extname(originalFilename);
      const baseName = path.basename(originalFilename, ext);
      const fileName = `${baseName}_${timestamp}${ext}`;

      const requestBody: drive_v3.Schema$File = { name: fileName };
      
      const folderId = this.configService.get<string>('GOOGLE_DRIVE_FOLDER_ID');
      if (folderId) {
        requestBody.parents = [folderId];
      }

      // Upload the file
      const uploadResponse = await drive.files.create({
        requestBody,
        media: { mimeType, body: stream },
        fields: 'id, name, size, webViewLink, webContentLink',
      });

      const fileId = uploadResponse.data.id!;

      // Make the file publicly readable (anyone with link)
      await drive.permissions.create({
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
  async deleteFile(refreshToken: string | undefined, fileId: string): Promise<void> {
    try {
      const drive = this.getDriveClient(refreshToken);
      await drive.files.delete({ fileId });
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
  async getFileMetadata(refreshToken: string | undefined, fileId: string): Promise<drive_v3.Schema$File> {
    try {
      const drive = this.getDriveClient(refreshToken);
      const response = await drive.files.get({
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

  /**
   * Download a file from Google Drive and return its Buffer.
   */
  async downloadFile(refreshToken: string | undefined, fileId: string): Promise<Buffer> {
    try {
      const drive = this.getDriveClient(refreshToken);
      const response = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'arraybuffer' }
      );
      this.logger.log(`Downloaded file from Drive: ${fileId}`);
      return Buffer.from(response.data as any);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Google Drive download failed for ${fileId}: ${msg}`);
      throw new InternalServerErrorException('Failed to download file from storage');
    }
  }
}

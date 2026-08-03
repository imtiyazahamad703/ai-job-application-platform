import { Module, Global } from '@nestjs/common';
import { GoogleDriveService } from './google-drive.service';

@Global()
@Module({
  providers: [GoogleDriveService],
  exports: [GoogleDriveService],
})
export class GoogleDriveModule {}

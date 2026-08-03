import { Module } from '@nestjs/common';
import { LinkedinService } from './linkedin/linkedin.service';
import { PlaywrightModule } from '../playwright/playwright.module';

@Module({
  imports: [PlaywrightModule],
  providers: [LinkedinService],
  exports: [LinkedinService],
})
export class PlatformsModule {}

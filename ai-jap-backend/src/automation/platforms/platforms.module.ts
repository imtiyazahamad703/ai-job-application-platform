import { Module } from '@nestjs/common';
import { LinkedinService } from './linkedin/linkedin.service';
import { LinkedinApplyService } from './linkedin/linkedin-apply.service';
import { PlaywrightModule } from '../playwright/playwright.module';
import { DomParserService } from '../services/dom-parser.service';
import { FormFillerService } from '../services/form-filler.service';
import { GeminiModule } from '../../../ai/gemini/gemini.module';

@Module({
  imports: [PlaywrightModule, GeminiModule],
  providers: [LinkedinService, LinkedinApplyService, DomParserService, FormFillerService],
  exports: [LinkedinService, LinkedinApplyService],
})
export class PlatformsModule {}

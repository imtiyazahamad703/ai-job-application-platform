import { Module } from '@nestjs/common';
import { LinkedinService } from './linkedin/linkedin.service';
import { LinkedinApplyService } from './linkedin/linkedin-apply.service';
import { PlaywrightModule } from '../playwright/playwright.module';
import { DomParserService } from '../services/dom-parser.service';
import { FormFillerService } from '../services/form-filler.service';
import { GeminiModule } from '../../../ai/gemini/gemini.module';
import { ResumeModule } from '../../modules/resume/resume.module';
import { GenericApplyService } from './generic/generic-apply.service';

@Module({
  imports: [PlaywrightModule, GeminiModule, ResumeModule],
  providers: [LinkedinService, LinkedinApplyService, GenericApplyService, DomParserService, FormFillerService],
  exports: [LinkedinService, LinkedinApplyService, GenericApplyService],
})
export class PlatformsModule {}

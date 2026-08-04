import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PlaywrightModule } from './playwright/playwright.module';
import { PlatformsModule } from './platforms/platforms.module';
import { DomParserService } from './services/dom-parser.service';
import { FormFillerService } from './services/form-filler.service';
import { PlatformDetectorService } from './services/platform-detector.service';
import { GeminiModule } from '../ai/gemini/gemini.module';
import { AutomationController } from './automation.controller';
import { ApplicationsModule } from '../modules/applications/applications.module';
import { ProfileModule } from '../modules/profile/profile.module';
import { Job, JobSchema } from '../modules/jobs/schemas/job.schema';
import { SearchPersona, SearchPersonaSchema } from '../modules/jobs/schemas/search-persona.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Job.name, schema: JobSchema },
      { name: SearchPersona.name, schema: SearchPersonaSchema }
    ]),
    PlaywrightModule, 
    PlatformsModule, 
    GeminiModule,
    ApplicationsModule,
    ProfileModule
  ],
  controllers: [AutomationController],
  providers: [DomParserService, FormFillerService, PlatformDetectorService],
  exports: [DomParserService, FormFillerService, PlatformDetectorService, PlatformsModule, PlaywrightModule],
})
export class AutomationModule {}

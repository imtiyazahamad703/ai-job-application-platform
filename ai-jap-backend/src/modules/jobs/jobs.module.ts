import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { PreFilterService } from './pre-filter.service';
import { Job, JobSchema } from './schemas/job.schema';
import { SearchPersona, SearchPersonaSchema } from './schemas/search-persona.schema';
import { SearchCache, SearchCacheSchema } from './schemas/search-cache.schema';
import { PlatformsModule } from '../../automation/platforms/platforms.module';
import { ProfileModule } from '../profile/profile.module';
import { ResumeModule } from '../resume/resume.module';
import { AiModule } from '../../ai/ai.module';
import { ApplicationsModule } from '../applications/applications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Job.name, schema: JobSchema },
      { name: SearchPersona.name, schema: SearchPersonaSchema },
      { name: SearchCache.name, schema: SearchCacheSchema }
    ]),
    PlatformsModule,
    ProfileModule,
    ResumeModule,
    AiModule,
    ApplicationsModule,
  ],
  controllers: [JobsController],
  providers: [JobsService, PreFilterService],
  exports: [JobsService],
})
export class JobsModule {}

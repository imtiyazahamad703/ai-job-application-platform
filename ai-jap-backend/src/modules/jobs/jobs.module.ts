import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { Job, JobSchema } from './schemas/job.schema';
import { JobSearchPreference, JobSearchPreferenceSchema } from './schemas/job-search-preference.schema';
import { PlatformsModule } from '../../automation/platforms/platforms.module';
import { ProfileModule } from '../profile/profile.module';
import { AiModule } from '../../ai/ai.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Job.name, schema: JobSchema },
      { name: JobSearchPreference.name, schema: JobSearchPreferenceSchema }
    ]),
    PlatformsModule,
    ProfileModule,
    AiModule,
  ],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}

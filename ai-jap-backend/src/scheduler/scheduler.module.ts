import { Module } from '@nestjs/common';
import { DailyJobSearchService } from './daily-job-search/daily-job-search.service';
import { JobsModule } from '../modules/jobs/jobs.module';
import { ProfileModule } from '../modules/profile/profile.module';

@Module({
  imports: [JobsModule, ProfileModule],
  providers: [DailyJobSearchService],
})
export class SchedulerModule {}

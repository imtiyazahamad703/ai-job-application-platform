import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JobsService } from '../../modules/jobs/jobs.service';
import { ProfileService } from '../../modules/profile/profile.service';

@Injectable()
export class DailyJobSearchService {
  private readonly logger = new Logger(DailyJobSearchService.name);

  constructor(
    private readonly jobsService: JobsService,
    private readonly profileService: ProfileService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT) // Runs every midnight
  async handleDailyJobSearch() {
    this.logger.log('Starting daily job search cron task...');
    try {
      const profiles = await this.profileService.getAllProfiles();
      this.logger.log(`Found ${profiles.length} profiles to search jobs for.`);

      for (const profile of profiles) {
        if (!profile.userId) continue;

        try {
          await this.jobsService.searchAndSaveJobs(profile.userId.toString());
          // Add a delay between profiles to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 5000));
        } catch (error) {
          this.logger.error(`Failed job search for user ${profile.userId}`, error);
        }
      }
      this.logger.log('Daily job search cron task completed.');
    } catch (e) {
      this.logger.error('Error during daily job search cron task', e);
    }
  }
}

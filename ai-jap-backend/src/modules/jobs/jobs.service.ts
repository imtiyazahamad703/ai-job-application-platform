import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Job, JobDocument } from './schemas/job.schema';
import { LinkedinService } from '../../automation/platforms/linkedin/linkedin.service';
import { ProfileService } from '../profile/profile.service';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectModel(Job.name) private readonly jobModel: Model<JobDocument>,
    private readonly linkedinService: LinkedinService,
    private readonly profileService: ProfileService,
  ) {}

  async getJobs(limit: number = 20, skip: number = 0): Promise<Job[]> {
    return this.jobModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit).exec();
  }

  async searchAndSaveJobs(userId: string): Promise<Job[]> {
    try {
      const profile = await this.profileService.getProfile(userId);
      if (!profile) {
        throw new Error('User profile not found');
      }

      const keywords = [];
      if (profile.headline) keywords.push(profile.headline);
      if (profile.skills && profile.skills.length > 0) {
        keywords.push(...profile.skills);
      }

      if (keywords.length === 0) {
        this.logger.warn('No keywords found in profile. Falling back to default.');
        keywords.push('Software Engineer');
      }

      // Search using the most prominent keyword (or randomly pick one in future)
      const searchQuery = keywords[0]; 
      const location = profile.preferredLocations?.[0] || 'Worldwide';

      this.logger.log(`Initiating job search for user ${userId} with query: ${searchQuery} in ${location}`);

      const scrapedJobs = await this.linkedinService.searchJobs(searchQuery, location);
      
      const savedJobs: Job[] = [];
      for (const jobData of scrapedJobs) {
        try {
          // Upsert to avoid duplicates
          const updatedJob = await this.jobModel.findOneAndUpdate(
            { url: jobData.url, platform: jobData.platform },
            { $set: jobData },
            { new: true, upsert: true }
          );
          savedJobs.push(updatedJob);
        } catch (e) {
          // If unique constraint error, just ignore
          if (e.code !== 11000) {
            this.logger.error('Error saving job', e);
          }
        }
      }

      this.logger.log(`Saved ${savedJobs.length} new or updated jobs to DB.`);
      return savedJobs;
    } catch (error) {
      this.logger.error('Failed to search and save jobs', error);
      throw new InternalServerErrorException('Failed to search jobs');
    }
  }
}

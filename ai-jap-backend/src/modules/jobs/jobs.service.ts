import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Job, JobDocument } from './schemas/job.schema';
import { JobSearchPreference, JobSearchPreferenceDocument } from './schemas/job-search-preference.schema';
import { UpdateJobSearchPreferenceDto } from './dto/update-job-search-preference.dto';
import { LinkedinService } from '../../automation/platforms/linkedin/linkedin.service';
import { ProfileService } from '../profile/profile.service';
import { GeminiService } from '../../ai/gemini/gemini.service';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectModel(Job.name) private readonly jobModel: Model<JobDocument>,
    @InjectModel(JobSearchPreference.name) private readonly preferenceModel: Model<JobSearchPreferenceDocument>,
    private readonly linkedinService: LinkedinService,
    private readonly profileService: ProfileService,
    private readonly geminiService: GeminiService,
  ) {}

  async getJobs(limit: number = 20, skip: number = 0): Promise<Job[]> {
    return this.jobModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit).exec();
  }

  async getPreferences(userId: string): Promise<JobSearchPreferenceDocument> {
    const userObjectId = new (require('mongoose').Types.ObjectId)(userId);
    let prefs = await this.preferenceModel.findOne({ userId: userObjectId }).exec();
    if (!prefs) {
      prefs = await this.preferenceModel.create({ userId: userObjectId });
    }
    return prefs;
  }

  async updatePreferences(userId: string, dto: UpdateJobSearchPreferenceDto): Promise<JobSearchPreferenceDocument> {
    const userObjectId = new (require('mongoose').Types.ObjectId)(userId);
    return this.preferenceModel.findOneAndUpdate(
      { userId: userObjectId },
      { $set: dto },
      { new: true, upsert: true }
    ).exec();
  }

  async searchAndSaveJobs(userId: string): Promise<Job[]> {
    try {
      const prefs = await this.getPreferences(userId);
      
      let titlesToSearch = prefs.desiredJobTitles;
      if (!titlesToSearch || titlesToSearch.length === 0) {
        // Fallback to old behavior via profile if no preferences are set
        const profile = await this.profileService.getProfile(userId);
        titlesToSearch = [];
        if (profile?.headline) titlesToSearch.push(profile.headline);
        if (profile?.skills && profile.skills.length > 0) titlesToSearch.push(...profile.skills);
        if (titlesToSearch.length === 0) titlesToSearch.push('Software Engineer');
      }

      this.logger.log(`Initiating job search for user ${userId} with ${titlesToSearch.length} titles`);

      const allScrapedJobs: any[] = [];

      for (const title of titlesToSearch) {
        this.logger.log(`Scraping for title: ${title}`);
        const scraped = await this.linkedinService.searchJobs(
          title, 
          prefs.preferredLocations,
          prefs.workMode,
          prefs.employmentType
        );
        allScrapedJobs.push(...scraped);
        
        // Small delay between multiple title searches to prevent rate limit
        if (titlesToSearch.length > 1) {
          await new Promise(r => setTimeout(r, 3000));
        }
      }

      // Deduplicate before AI evaluation
      const uniqueScrapedJobs: any[] = [];
      const seenUrls = new Set();
      for (const job of allScrapedJobs) {
        if (!seenUrls.has(job.url)) {
          seenUrls.add(job.url);
          uniqueScrapedJobs.push(job);
        }
      }

      // AI Filtering Gate
      const relevantJobs = await this.geminiService.filterRelevantJobs(
        prefs.desiredJobTitles,
        prefs.includeKeywords,
        uniqueScrapedJobs
      );

      const savedJobs: Job[] = [];
      for (const jobData of relevantJobs) {
        try {
          const updatedJob = await this.jobModel.findOneAndUpdate(
            { url: jobData.url, platform: jobData.platform },
            { $set: jobData },
            { new: true, upsert: true }
          );
          savedJobs.push(updatedJob);
        } catch (e) {
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

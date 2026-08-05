import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Application, ApplicationDocument, ApplicationStatus } from '../../modules/applications/schemas/application.schema';
import { LinkedinApplyService } from '../platforms/linkedin/linkedin-apply.service';
import { GenericApplyService } from '../platforms/generic/generic-apply.service';
import { Job, JobDocument } from '../../modules/jobs/schemas/job.schema';
import { Profile, ProfileDocument } from '../../modules/profile/schemas/profile.schema';
import { SearchPersona, SearchPersonaDocument } from '../../modules/jobs/schemas/search-persona.schema';

@Injectable()
export class AutomationQueueService {
  private readonly logger = new Logger(AutomationQueueService.name);
  private isProcessing = false;

  constructor(
    @InjectModel(Application.name) private applicationModel: Model<ApplicationDocument>,
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    @InjectModel(Profile.name) private profileModel: Model<ProfileDocument>,
    @InjectModel(SearchPersona.name) private personaModel: Model<SearchPersonaDocument>,
    private readonly linkedinApplyService: LinkedinApplyService,
    private readonly genericApplyService: GenericApplyService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleQueue() {
    if (this.isProcessing) return;

    try {
      this.isProcessing = true;

      // Find one pending application and lock it by setting status to PROCESSING atomically
      const application = await this.applicationModel.findOneAndUpdate(
        { status: ApplicationStatus.PENDING },
        { $set: { status: ApplicationStatus.PROCESSING } },
        { new: true }
      ).exec();

      if (!application) {
        this.isProcessing = false;
        return;
      }

      this.logger.log(`Found pending application for Job ID: ${application.jobId}. Starting automation...`);

      // Fetch related data
      const job = await this.jobModel.findById(application.jobId).exec();
      const profile = await this.profileModel.findOne({ userId: application.userId }).exec();
      const persona = await this.personaModel.findById(application.personaId).exec();

      if (!job || !profile || !persona) {
        this.logger.error(`Missing related data for application ${application._id}`);
        application.status = ApplicationStatus.FAILED;
        application.logs.push('Failed to fetch Job, Profile, or Persona data');
        await application.save();
        this.isProcessing = false;
        return;
      }

      // Execute Automation
      let result;
      if (application.platform === 'LinkedIn') {
        result = await this.linkedinApplyService.applyToJob(job.url, profile as any, persona);
      } else {
        result = await this.genericApplyService.applyToJob(job.url, profile as any, persona);
      }

      if (result.success) {
        application.status = ApplicationStatus.APPLIED;
        application.logs.push(...result.logs, 'Application submitted successfully.');
      } else {
        application.status = ApplicationStatus.FAILED;
        application.logs.push(...result.logs, 'Application failed during execution.');
      }

      await application.save();
      this.logger.log(`Finished processing application ${application._id}. Final status: ${application.status}`);

    } catch (error) {
      this.logger.error(`Error in queue processor: ${error.message}`);
    } finally {
      this.isProcessing = false;
    }
  }
}

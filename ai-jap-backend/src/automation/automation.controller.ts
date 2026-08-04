import { Controller, Post, Param, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../modules/authentication/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserDocument } from '../modules/authentication/schemas/user.schema';
import { LinkedinApplyService } from './platforms/linkedin/linkedin-apply.service';
import { PlatformDetectorService, AtsPlatform } from './services/platform-detector.service';
import { JobsService } from '../modules/jobs/jobs.service';
import { ApplicationsService } from '../modules/applications/applications.service';
import { ProfileService } from '../modules/profile/profile.service';
import { ApplicationStatus } from '../modules/applications/schemas/application.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Job, JobDocument } from '../modules/jobs/schemas/job.schema';
import { SearchPersona, SearchPersonaDocument } from '../modules/jobs/schemas/search-persona.schema';

@ApiTags('Automation')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('automation')
export class AutomationController {
  constructor(
    private readonly linkedinApplyService: LinkedinApplyService,
    private readonly platformDetectorService: PlatformDetectorService,
    private readonly applicationsService: ApplicationsService,
    private readonly profileService: ProfileService,
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    @InjectModel(SearchPersona.name) private personaModel: Model<SearchPersonaDocument>,
  ) {}

  @Post('auto-apply/:jobId')
  @ApiOperation({ summary: 'Trigger Browser Automation to Auto-Apply for a Job' })
  async autoApply(@CurrentUser() user: UserDocument, @Param('jobId') jobId: string) {
    const userId = user._id.toString();

    // 1. Fetch Job
    const job = await this.jobModel.findById(jobId).exec();
    if (!job) {
      throw new HttpException('Job not found', HttpStatus.NOT_FOUND);
    }

    // 2. Fetch User Profile
    const profile = await this.profileService.getProfile(userId);
    if (!profile) {
      throw new HttpException('User profile not found. Please complete your profile first.', HttpStatus.BAD_REQUEST);
    }

    // 3. Fetch Persona used for this job
    if (!job.matchedPersonaId) {
      throw new HttpException('Job has no associated Persona to use for application', HttpStatus.BAD_REQUEST);
    }
    const persona = await this.personaModel.findById(job.matchedPersonaId).exec();
    if (!persona) {
      throw new HttpException('Associated Persona not found', HttpStatus.NOT_FOUND);
    }

    // 4. Detect Platform
    const platform = this.platformDetectorService.detectPlatform(job.url);
    if (platform !== AtsPlatform.LINKEDIN_EASY_APPLY) {
      throw new HttpException('Only LinkedIn Easy Apply is supported for MVP', HttpStatus.NOT_IMPLEMENTED);
    }

    // 5. Create Initial Application Record
    const application = await this.applicationsService.createApplication({
      userId: user._id as any,
      jobId: job._id as any,
      personaId: persona._id as any,
      status: ApplicationStatus.APPLIED, // Will update to FAILED if it fails
      platform: 'LinkedIn',
      logs: ['Application started...']
    });

    // 6. Execute Automation
    // Note: In a production app, this should be pushed to a queue (e.g. BullMQ) 
    // instead of awaiting synchronously, but for MVP local execution, this is fine.
    try {
      const result = await this.linkedinApplyService.applyToJob(job.url, profile as any, persona);
      
      if (result.success) {
        // Update log and keep status APPLIED
        application.logs.push(...result.logs);
        await application.save();
        return { message: 'Application successful', logs: result.logs };
      } else {
        // Mark as FAILED
        application.status = ApplicationStatus.FAILED;
        application.logs.push(...result.logs, 'Application failed during execution.');
        await application.save();
        throw new HttpException({ message: 'Application failed', logs: application.logs }, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    } catch (error) {
      application.status = ApplicationStatus.FAILED;
      application.logs.push(`System Error: ${error.message}`);
      await application.save();
      throw new HttpException('Automation process encountered a critical error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

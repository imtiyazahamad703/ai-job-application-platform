import { Controller, Post, Param, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../modules/authentication/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserDocument } from '../modules/authentication/schemas/user.schema';
import { LinkedinApplyService } from './platforms/linkedin/linkedin-apply.service';
import { GenericApplyService } from './platforms/generic/generic-apply.service';
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
    private readonly genericApplyService: GenericApplyService,
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

    // 5. Create Initial Application Record as PENDING
    await this.applicationsService.createApplication({
      userId: user._id as any,
      jobId: job._id as any,
      personaId: persona._id as any,
      status: ApplicationStatus.PENDING,
      platform: platform === AtsPlatform.LINKEDIN_EASY_APPLY ? 'LinkedIn' : 'External',
      logs: ['Application queued for background processing...']
    });

    return { message: 'Application queued successfully' };
  }
}

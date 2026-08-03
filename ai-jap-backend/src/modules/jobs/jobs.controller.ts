import { Controller, Get, Post, Put, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiBody } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { UpdateJobSearchPreferenceDto } from './dto/update-job-search-preference.dto';
import { JwtAuthGuard } from '../authentication/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserDocument } from '../authentication/schemas/user.schema';

@ApiTags('Jobs')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get('preferences')
  @ApiOperation({ summary: 'Get Job Search Preferences' })
  async getPreferences(@CurrentUser() user: UserDocument) {
    return this.jobsService.getPreferences(user._id.toString());
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Update Job Search Preferences' })
  @ApiBody({ type: UpdateJobSearchPreferenceDto })
  async updatePreferences(@CurrentUser() user: UserDocument, @Body() dto: UpdateJobSearchPreferenceDto) {
    return this.jobsService.updatePreferences(user._id.toString(), dto);
  }

  @Get()
  @ApiOperation({ summary: 'List fetched jobs' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  async getJobs(
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
  ) {
    const jobs = await this.jobsService.getJobs(
      limit ? parseInt(limit.toString()) : 20,
      skip ? parseInt(skip.toString()) : 0,
    );
    return { jobs };
  }

  @Post('search')
  @ApiOperation({ summary: 'Trigger manual job search based on user profile' })
  async triggerSearch(@CurrentUser() user: UserDocument) {
    const jobs = await this.jobsService.searchAndSaveJobs(user._id.toString());
    return { message: 'Job search completed', count: jobs.length, jobs };
  }
}

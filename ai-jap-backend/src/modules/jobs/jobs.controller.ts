import { Controller, Get, Post, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { JwtAuthGuard } from '../authentication/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserDocument } from '../authentication/schemas/user.schema';

@ApiTags('Jobs')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

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

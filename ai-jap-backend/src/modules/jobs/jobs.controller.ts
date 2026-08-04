import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiBody } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { CreateSearchPersonaDto, UpdateSearchPersonaDto } from './dto/search-persona.dto';
import { JwtAuthGuard } from '../authentication/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserDocument } from '../authentication/schemas/user.schema';

@ApiTags('Jobs')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get('personas')
  @ApiOperation({ summary: 'Get Search Personas' })
  async getPersonas(@CurrentUser() user: UserDocument) {
    return this.jobsService.getPersonas(user._id.toString());
  }

  @Post('personas')
  @ApiOperation({ summary: 'Create Search Persona' })
  @ApiBody({ type: CreateSearchPersonaDto })
  async createPersona(@CurrentUser() user: UserDocument, @Body() dto: CreateSearchPersonaDto) {
    return this.jobsService.createPersona(user._id.toString(), dto);
  }

  @Post('personas/generate-from-resume/:resumeId')
  @ApiOperation({ summary: 'Auto-generate Persona from a Resume' })
  @ApiBody({ schema: { type: 'object', properties: { targetRole: { type: 'string', example: 'Java Backend' } } } })
  async generatePersonaFromResume(
    @CurrentUser() user: UserDocument, 
    @Param('resumeId') resumeId: string,
    @Body('targetRole') targetRole?: string
  ) {
    return this.jobsService.generatePersonaFromResume(user._id.toString(), resumeId, targetRole);
  }

  @Put('personas/:id')
  @ApiOperation({ summary: 'Update Search Persona (Versioning)' })
  @ApiBody({ type: UpdateSearchPersonaDto })
  async updatePersona(@CurrentUser() user: UserDocument, @Param('id') id: string, @Body() dto: UpdateSearchPersonaDto) {
    return this.jobsService.updatePersona(user._id.toString(), id, dto);
  }

  @Delete('personas/:id')
  @ApiOperation({ summary: 'Delete/Deactivate Search Persona' })
  async deletePersona(@CurrentUser() user: UserDocument, @Param('id') id: string) {
    return this.jobsService.deletePersona(user._id.toString(), id);
  }

  @Get()
  @ApiOperation({ summary: 'List fetched jobs' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'location', required: false, type: String })
  async getJobs(
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
    @Query('location') location?: string,
  ) {
    const { jobs, totalCount } = await this.jobsService.getJobs(
      limit ? parseInt(limit.toString()) : 20,
      skip ? parseInt(skip.toString()) : 0,
      location
    );
    return { jobs, totalCount };
  }

  @Post('search')
  @ApiOperation({ summary: 'Trigger manual job search based on user profile' })
  async triggerSearch(@CurrentUser() user: UserDocument) {
    const jobs = await this.jobsService.searchAndSaveJobs(user._id.toString());
    return { message: 'Job search completed', count: jobs.length, jobs };
  }
}

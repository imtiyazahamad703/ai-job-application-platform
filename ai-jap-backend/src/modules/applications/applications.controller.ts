import { Controller, Get, Param, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApplicationsService } from './applications.service';
import { JwtAuthGuard } from '../authentication/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserDocument } from '../authentication/schemas/user.schema';
import { ApplicationStatus } from './schemas/application.schema';

@ApiTags('Applications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all applications for the current user' })
  async getMyApplications(@CurrentUser() user: UserDocument) {
    return this.applicationsService.getApplicationsByUser(user._id.toString());
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update application status manually (e.g. for interviewing)' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: ApplicationStatus
  ) {
    return this.applicationsService.updateStatus(id, status);
  }
}

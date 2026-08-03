import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../authentication/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserDocument } from '../authentication/schemas/user.schema';

@ApiTags('Profile')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser() user: UserDocument) {
    const profile = await this.profileService.getProfile(user._id.toString());
    const completionScore = await this.profileService.getProfileCompletionScore(
      user._id.toString(),
    );
    return { profile, completionScore };
  }

  @Put()
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(
    @CurrentUser() user: UserDocument,
    @Body() dto: UpdateProfileDto,
  ) {
    const profile = await this.profileService.updateProfile(
      user._id.toString(),
      dto,
    );
    return { message: 'Profile updated successfully', profile };
  }
}

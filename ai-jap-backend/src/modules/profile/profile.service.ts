import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Profile, ProfileDocument } from './schemas/profile.schema';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    @InjectModel(Profile.name)
    private readonly profileModel: Model<ProfileDocument>,
  ) {}

  async getProfile(userId: string): Promise<ProfileDocument> {
    const userObjectId = new Types.ObjectId(userId);
    let profile = await this.profileModel
      .findOne({ userId: userObjectId })
      .exec();

    if (!profile) {
      profile = await this.profileModel.create({ userId: userObjectId });
      this.logger.log(`Auto-created profile for user: ${userId}`);
    }
    return profile;
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<ProfileDocument> {
    const userObjectId = new Types.ObjectId(userId);
    const profile = await this.profileModel
      .findOneAndUpdate(
        { userId: userObjectId },
        { $set: dto },
        { new: true, upsert: true, runValidators: true },
      )
      .exec();

    this.logger.log(`Profile updated for user: ${userId}`);
    return profile;
  }

  async getProfileCompletionScore(userId: string): Promise<number> {
    const profile = await this.getProfile(userId);
    const fields = [
      profile.firstName,
      profile.lastName,
      profile.phone,
      profile.headline,
      profile.currentRole,
      profile.professionalSummary,
    ];
    const arrays = [profile.skills, profile.education, profile.experience];
    const filledFields = fields.filter(Boolean).length;
    const filledArrays = arrays.filter((arr) => arr?.length > 0).length;
    return Math.round(
      ((filledFields + filledArrays) / (fields.length + arrays.length)) * 100,
    );
  }
}

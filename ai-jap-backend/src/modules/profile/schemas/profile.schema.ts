import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';

export type ProfileDocument = HydratedDocument<Profile>;

@Schema({ _id: false })
class Education {
  @Prop({ required: true }) degree: string;
  @Prop({ required: true }) institution: string;
  @Prop() fieldOfStudy?: string;
  @Prop() startYear?: number;
  @Prop() endYear?: number;
  @Prop({ default: false }) isCurrentlyStudying?: boolean;
}

@Schema({ _id: false })
class Experience {
  @Prop({ required: true }) company: string;
  @Prop({ required: true }) role: string;
  @Prop() startDate?: string;
  @Prop() endDate?: string;
  @Prop({ default: false }) isCurrentRole?: boolean;
  @Prop() description?: string;
  @Prop({ type: [String], default: [] }) technologies?: string[];
}

@Schema({ _id: false })
class Project {
  @Prop({ required: true }) name: string;
  @Prop() description?: string;
  @Prop() url?: string;
  @Prop({ type: [String], default: [] }) technologies?: string[];
}

@Schema({ timestamps: true, collection: 'profiles' })
export class Profile {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({ trim: true }) firstName?: string;
  @Prop({ trim: true }) lastName?: string;
  @Prop({ trim: true }) phone?: string;
  @Prop({ trim: true }) headline?: string;
  @Prop({ trim: true }) city?: string;
  @Prop({ trim: true }) country?: string;

  @Prop({ trim: true }) currentCompany?: string;
  @Prop({ trim: true }) currentRole?: string;
  @Prop() totalExperienceYears?: number;
  @Prop() currentSalary?: number;
  @Prop() expectedSalary?: number;
  @Prop({ trim: true }) noticePeriod?: string;

  @Prop({ type: [String], default: [] }) skills: string[];
  @Prop({ type: [String], default: [] }) preferredLocations: string[];
  @Prop({ type: [String], default: [] }) certifications: string[];
  @Prop({ type: [Education], default: [] }) education: Education[];
  @Prop({ type: [Experience], default: [] }) experience: Experience[];
  @Prop({ type: [Project], default: [] }) projects: Project[];

  @Prop({ trim: true }) linkedinUrl?: string;
  @Prop({ trim: true }) githubUrl?: string;
  @Prop({ trim: true }) portfolioUrl?: string;

  @Prop({ type: [String], default: [] }) employmentTypes: string[];
  @Prop({ default: false }) openToRemote: boolean;
  @Prop({ default: false }) openToRelocation: boolean;

  @Prop() professionalSummary?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const ProfileSchema = SchemaFactory.createForClass(Profile);

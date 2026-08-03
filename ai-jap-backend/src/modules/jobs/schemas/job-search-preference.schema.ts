import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type JobSearchPreferenceDocument = HydratedDocument<JobSearchPreference>;

@Schema({ timestamps: true, collection: 'job_search_preferences' })
export class JobSearchPreference {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: [String], required: true, default: [] })
  desiredJobTitles: string[];

  @Prop({ type: [String], required: true, default: [] })
  preferredLocations: string[];

  @Prop({ type: [String], default: [] }) // e.g., 'Remote', 'Hybrid', 'Onsite'
  workMode: string[];

  @Prop({ type: [String], default: [] }) // e.g., 'Full Time', 'Internship', 'Contract'
  employmentType: string[];

  @Prop({ trim: true })
  experienceLevel?: string; // e.g., 'Entry level', 'Mid-Senior level'

  @Prop({ type: [String], default: [] })
  preferredCompanies: string[];

  @Prop({ type: [String], default: [] })
  excludedCompanies: string[];

  @Prop({ type: [String], default: [] })
  includeKeywords: string[];

  @Prop({ type: [String], default: [] })
  excludeKeywords: string[];

  createdAt: Date;
  updatedAt: Date;
}

export const JobSearchPreferenceSchema = SchemaFactory.createForClass(JobSearchPreference);

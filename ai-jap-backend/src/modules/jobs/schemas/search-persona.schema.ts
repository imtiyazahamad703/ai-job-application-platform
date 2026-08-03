import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SearchPersonaDocument = HydratedDocument<SearchPersona>;

@Schema({ _id: false })
export class TechCategory {
  @Prop({ type: [String], default: [] })
  programmingLanguages: string[];

  @Prop({ type: [String], default: [] })
  backendFrameworks: string[];

  @Prop({ type: [String], default: [] })
  frontendFrameworks: string[];

  @Prop({ type: [String], default: [] })
  databases: string[];

  @Prop({ type: [String], default: [] })
  cloud: string[];

  @Prop({ type: [String], default: [] })
  devOps: string[];

  @Prop({ type: [String], default: [] })
  aiLlm: string[];
}

@Schema({ timestamps: true, collection: 'search_personas' })
export class SearchPersona {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  personaName: string;

  @Prop({ required: true, default: 1 })
  version: number;

  @Prop({ type: Types.ObjectId, ref: 'Resume' })
  linkedResumeId?: Types.ObjectId;

  @Prop()
  aiRoleSummary?: string;

  @Prop({ type: [String], required: true, default: [] })
  desiredJobTitles: string[];

  @Prop({ type: [String], required: true, default: [] })
  locations: string[];

  @Prop({ type: [String], default: [] }) // e.g., 'Remote', 'Hybrid', 'Onsite'
  workMode: string[];

  @Prop({ type: [String], default: [] }) // e.g., 'Full Time', 'Internship', 'Contract'
  jobType: string[];

  @Prop({ type: TechCategory, default: () => ({}) })
  mandatoryTech: TechCategory;

  @Prop({ required: true, default: 1 })
  minimumRequiredMatch: number;

  @Prop({ type: TechCategory, default: () => ({}) })
  preferredTech: TechCategory;

  @Prop({ type: [String], default: [] })
  excludedTech: string[];

  @Prop({ type: [String], default: [] })
  excludedKeywords: string[];

  @Prop({ default: true })
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const SearchPersonaSchema = SchemaFactory.createForClass(SearchPersona);

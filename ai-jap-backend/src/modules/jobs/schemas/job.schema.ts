import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type JobDocument = HydratedDocument<Job>;

@Schema({ _id: false })
export class JobTechExtraction {
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

@Schema({ _id: false })
export class StructuredExplanation {
  @Prop({ type: String, required: true })
  titleMatch: string;

  @Prop({ type: [String], default: [] })
  mandatoryMatches: string[];

  @Prop({ type: [String], default: [] })
  preferredMatches: string[];

  @Prop({ type: String, required: true })
  reasoning: string;
}

@Schema({ timestamps: true, collection: 'jobs' })
export class Job {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  company: string;

  @Prop()
  location?: string;

  @Prop()
  description?: string;

  @Prop({ required: true, unique: true })
  url: string;

  @Prop({ required: true })
  platform: string;

  @Prop({ type: [String], default: [] })
  skills: string[];

  @Prop({ default: false })
  isRemote: boolean;

  @Prop()
  postedAt?: string;

  @Prop({ default: 'PENDING' })
  status: string; // PENDING, APPLIED, FAILED, IGNORED

  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId; // If tied to a specific user search

  @Prop({ type: Types.ObjectId, ref: 'SearchPersona' })
  matchedPersonaId?: Types.ObjectId;

  @Prop()
  personaVersion?: number;

  @Prop({ type: Types.ObjectId, ref: 'Resume' })
  linkedResumeId?: Types.ObjectId;

  @Prop({ type: JobTechExtraction, default: () => ({}) })
  extractedTech?: JobTechExtraction;

  @Prop({ type: Number })
  matchScore?: number;

  @Prop({ type: Number })
  titleMatchScore?: number;

  @Prop({ type: Number })
  mandatoryTechScore?: number;

  @Prop({ type: Number })
  preferredTechScore?: number;

  @Prop({ type: Number })
  aiSemanticScore?: number;

  @Prop({ type: StructuredExplanation })
  structuredExplanation?: StructuredExplanation;

  createdAt: Date;
  updatedAt: Date;
}

export const JobSchema = SchemaFactory.createForClass(Job);
JobSchema.index({ platform: 1, url: 1 }, { unique: true });

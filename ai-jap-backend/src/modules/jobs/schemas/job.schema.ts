import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type JobDocument = HydratedDocument<Job>;

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

  createdAt: Date;
  updatedAt: Date;
}

export const JobSchema = SchemaFactory.createForClass(Job);
JobSchema.index({ platform: 1, url: 1 }, { unique: true });

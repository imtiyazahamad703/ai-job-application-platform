import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum ApplicationStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  APPLIED = 'APPLIED',
  FAILED = 'FAILED',
  INTERVIEWING = 'INTERVIEWING',
  REJECTED = 'REJECTED',
  OFFER = 'OFFER'
}

@Schema({ timestamps: true })
export class Application {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Job', required: true })
  jobId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'SearchPersona', required: true })
  personaId: Types.ObjectId;

  @Prop({ required: true, enum: ApplicationStatus, default: ApplicationStatus.APPLIED })
  status: ApplicationStatus;

  @Prop({ required: true })
  platform: string;

  @Prop({ type: [String], default: [] })
  logs: string[];

  @Prop()
  notes?: string;
}

export type ApplicationDocument = Application & Document;
export const ApplicationSchema = SchemaFactory.createForClass(Application);

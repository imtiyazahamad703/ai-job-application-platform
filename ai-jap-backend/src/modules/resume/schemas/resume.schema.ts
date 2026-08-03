import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';

export type ResumeDocument = HydratedDocument<Resume>;

@Schema({
  timestamps: true,
  collection: 'resumes',
  toJSON: { virtuals: true },
})
export class Resume {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  label: string;

  @Prop({ required: true })
  originalFilename: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ default: 0 })
  sizeBytes: number;

  @Prop({ required: true, index: true })
  driveFileId: string;

  @Prop({ required: true })
  driveWebViewLink: string;

  @Prop({ required: true })
  driveDownloadLink: string;

  @Prop({ select: false })
  parsedText?: string;

  @Prop({ default: false })
  isDefault: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const ResumeSchema = SchemaFactory.createForClass(Resume);
ResumeSchema.index({ userId: 1, isDefault: 1 });

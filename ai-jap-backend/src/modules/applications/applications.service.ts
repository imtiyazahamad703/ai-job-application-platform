import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Application, ApplicationDocument, ApplicationStatus } from './schemas/application.schema';

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(
    @InjectModel(Application.name) private applicationModel: Model<ApplicationDocument>
  ) {}

  async createApplication(data: Partial<Application>): Promise<ApplicationDocument> {
    const app = new this.applicationModel(data);
    return app.save();
  }

  async getApplicationsByUser(userId: string): Promise<ApplicationDocument[]> {
    return this.applicationModel.find({ userId }).populate('jobId').sort({ createdAt: -1 }).exec();
  }

  async updateStatus(id: string, status: ApplicationStatus): Promise<ApplicationDocument> {
    return this.applicationModel.findByIdAndUpdate(id, { status }, { new: true }).exec();
  }
}

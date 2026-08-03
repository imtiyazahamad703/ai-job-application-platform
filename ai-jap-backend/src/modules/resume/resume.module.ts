import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { ResumeController } from './resume.controller';
import { ResumeService } from './resume.service';
import { Resume, ResumeSchema } from './schemas/resume.schema';
import { AuthModule } from '../authentication/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Resume.name, schema: ResumeSchema }]),
    MulterModule.register({ storage: memoryStorage() }), // store in memory, then send to Drive
    AuthModule,
  ],
  controllers: [ResumeController],
  providers: [ResumeService],
  exports: [ResumeService],
})
export class ResumeModule {}

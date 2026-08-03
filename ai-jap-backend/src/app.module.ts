import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { LoggerModule } from './common/logger/logger.module';
import { GoogleDriveModule } from './integrations/google-drive/google-drive.module';

import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/authentication/auth.module';
import { ProfileModule } from './modules/profile/profile.module';
import { ResumeModule } from './modules/resume/resume.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtAuthGuard } from './modules/authentication/guards/jwt-auth.guard';

@Module({
  imports: [
    // ─── Core Infrastructure ─────────────────────────────────────────────
    ConfigModule, // @nestjs/config with Joi validation (global)
    DatabaseModule, // MongoDB/Mongoose connection
    LoggerModule, // Winston logger (global)
    GoogleDriveModule, // Google Drive service (global)

    // ─── Feature Modules ─────────────────────────────────────────────────
    HealthModule,
    AuthModule,
    ProfileModule,
    ResumeModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Apply JwtAuthGuard globally — use @Public() to bypass
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}

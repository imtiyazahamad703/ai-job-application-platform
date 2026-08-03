import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('app.mongoDbUri'),
        retryAttempts: 3,
        retryDelay: 1000,
      }),
    }),
  ],
})
export class DatabaseModule {}

import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoDbUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiration: process.env.JWT_EXPIRATION || '7d',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
}));

export const configValidationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  MONGODB_URI: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRATION: Joi.string().default('7d'),
  CORS_ORIGIN: Joi.string().default('http://localhost:5173'),
  // We can add other keys like GEMINI_API_KEY later when needed
});

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '../logger/logger.service';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const messageText =
      typeof message === 'object' && message !== null && 'message' in message
        ? message.message
        : message;

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: messageText,
    };

    if (status >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url} - ${status} - ${JSON.stringify(errorResponse)}`,
        exception instanceof Error ? exception.stack : '',
        'HttpExceptionFilter',
      );
    } else {
      this.logger.warn(
        `[${request.method}] ${request.url} - ${status} - ${JSON.stringify(errorResponse)}`,
        'HttpExceptionFilter',
      );
    }

    response.status(status).json(errorResponse);
  }
}

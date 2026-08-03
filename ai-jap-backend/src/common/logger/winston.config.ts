import * as winston from 'winston';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const devFormat = printf(
  ({ level, message, timestamp: ts, context, stack }) => {
    const ctx = context ? ` [${context as string}]` : '';
    const err = stack ? `\n${stack as string}` : '';
    return `${String(ts)}${ctx} ${String(level)}: ${String(message)}${err}`;
  },
);

export function createWinstonConfig(context?: string): winston.LoggerOptions {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    level: isProduction ? 'info' : 'debug',
    defaultMeta: { context: context ?? 'App' },
    transports: [
      new winston.transports.Console({
        format: isProduction
          ? combine(timestamp(), errors({ stack: true }), json())
          : combine(
              colorize({ all: true }),
              timestamp({ format: 'HH:mm:ss' }),
              errors({ stack: true }),
              devFormat,
            ),
      }),
      ...(isProduction
        ? [
            new winston.transports.File({
              filename: 'logs/error.log',
              level: 'error',
              format: combine(timestamp(), errors({ stack: true }), json()),
            }),
            new winston.transports.File({
              filename: 'logs/combined.log',
              format: combine(timestamp(), errors({ stack: true }), json()),
            }),
          ]
        : []),
    ],
  };
}

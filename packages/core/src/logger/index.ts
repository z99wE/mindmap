/**
 * Centralized Logging with Pino
 */

import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: {
    service: 'thought-gps',
    version: process.env.npm_package_version || '0.0.0',
    environment: process.env.NODE_ENV || 'development',
  },
  transport:
    process.env.NODE_ENV === 'production'
      ? undefined
      : {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
            singleLine: false,
          },
        },
});

// Export typed logger methods
export const log = {
  info: (context: Record<string, unknown>, message: string) =>
    logger.info(context, message),
  error: (context: Record<string, unknown>, message: string) =>
    logger.error(context, message),
  warn: (context: Record<string, unknown>, message: string) =>
    logger.warn(context, message),
  debug: (context: Record<string, unknown>, message: string) =>
    logger.debug(context, message),
};

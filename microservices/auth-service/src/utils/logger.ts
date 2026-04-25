/**
 * Winston Logger Configuration
 * Structured logging with JSON output for production
 */

import winston from 'winston';
import { appConfig } from '../config';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;

  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }

  return msg;
});

// Create logger instance
export const logger = winston.createLogger({
  level: appConfig.LOG_LEVEL,
  defaultMeta: { service: appConfig.SERVICE_NAME },
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    appConfig.NODE_ENV === 'production' ? json() : logFormat
  ),
  transports: [
    // Console transport
    new winston.transports.Console({
      format: combine(
        colorize({ all: appConfig.NODE_ENV !== 'production' }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        logFormat
      ),
    }),
  ],
  exitOnError: false,
});

// Create child logger with additional context
export function createLogger(context: Record<string, any>) {
  return logger.child(context);
}

// Stream for Morgan HTTP logging (if needed)
export const loggerStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

export default logger;

/**
 * Application Configuration - Order Service
 */

import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3004'),
  DATABASE_URL: z.string().default('postgresql://ecommerce:postgres_secret_password@localhost:5433/ecommerce_db'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  KAFKA_BROKERS: z.string().default('localhost:9092'),
  KAFKA_CLIENT_ID: z.string().default('order-service'),
  AUTH_SERVICE_URL: z.string().default('http://localhost:3001'),
  PAYMENT_SERVICE_URL: z.string().default('http://localhost:3005'),
  SERVICE_NAME: z.string().default('order-service'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

export type EnvConfig = z.infer<typeof envSchema>;

let config: EnvConfig;

try {
  config = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('Invalid environment configuration:');
    console.error(error.errors);
    process.exit(1);
  }
  throw error;
}

export const appConfig = config;
export const isProduction = config.NODE_ENV === 'production';
export default config;

import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  JWT_SECRET: z.string().default('your-super-secret-jwt-key-change-in-production'),
  CORS_ORIGIN: z.string().default('*'),
  RATE_LIMIT_WINDOW_MS: z.string().default('60000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('200'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  
  // Downstream service endpoints
  AUTH_SERVICE_URL: z.string().default('http://localhost:3001'),
  USER_SERVICE_URL: z.string().default('http://localhost:3008'),
  PRODUCT_SERVICE_URL: z.string().default('http://localhost:3003'),
  CART_SERVICE_URL: z.string().default('http://localhost:3006'),
  ORDER_SERVICE_URL: z.string().default('http://localhost:3004'),
  PAYMENT_SERVICE_URL: z.string().default('http://localhost:3015'),
  SEARCH_SERVICE_URL: z.string().default('http://localhost:3005'),
  REVIEW_SERVICE_URL: z.string().default('http://localhost:3009'),
  RECOMMENDATION_SERVICE_URL: z.string().default('http://localhost:3010'),
  NOTIFICATION_SERVICE_URL: z.string().default('http://localhost:3007'),
  ANALYTICS_SERVICE_URL: z.string().default('http://localhost:3014'),
  CHAT_SERVICE_URL: z.string().default('http://localhost:3011'),
});

export const config = envSchema.parse(process.env);
export default config;

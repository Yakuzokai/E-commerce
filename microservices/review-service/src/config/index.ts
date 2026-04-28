import dotenv from 'dotenv';
dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3009'),

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433'),
    database: process.env.DB_NAME || 'review_db',
    user: process.env.DB_USER || 'shophub',
    password: process.env.DB_PASSWORD || 'password',
  },

  redis: {
    url: `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || '6379'}`,
  },

  kafka: {
    brokers: (process.env.KAFKA_BROKERS || '127.0.0.1:9092').split(','),
  },
};

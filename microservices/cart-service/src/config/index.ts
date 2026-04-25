import dotenv from 'dotenv';
dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3006'),

  redis: {
    url: process.env.REDIS_PASSWORD
      ? `redis://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`
      : `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`,
  },

  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  },

  cart: {
    ttl: parseInt(process.env.CART_TTL || '604800'),
    maxItems: parseInt(process.env.MAX_ITEMS_PER_CART || '100'),
    maxQuantity: parseInt(process.env.MAX_QUANTITY_PER_ITEM || '99'),
  },
};

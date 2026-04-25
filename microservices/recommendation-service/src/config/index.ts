import dotenv from 'dotenv';
dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3010'),

  elasticsearch: {
    url: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  },

  redis: {
    url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`,
  },

  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  },

  ml: {
    trendingWindowHours: parseInt(process.env.TRENDING_WINDOW_HOURS || '24'),
    recentlyViewedLimit: parseInt(process.env.RECENTLY_VIEWED_LIMIT || '50'),
    similarProductsLimit: parseInt(process.env.SIMILAR_PRODUCTS_LIMIT || '20'),
    personalizedLimit: parseInt(process.env.PERSONALIZED_LIMIT || '50'),
  },
};

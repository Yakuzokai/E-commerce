import dotenv from 'dotenv';
dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3005'),

  elasticsearch: {
    url: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    username: process.env.ELASTICSEARCH_USERNAME || '',
    password: process.env.ELASTICSEARCH_PASSWORD || '',
  },

  redis: {
    url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`,
  },

  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  },

  search: {
    indexName: process.env.SEARCH_INDEX_NAME || 'products',
    maxResults: parseInt(process.env.SEARCH_MAX_RESULTS || '100'),
    suggestionLimit: parseInt(process.env.SEARCH_SUGGESTION_LIMIT || '10'),
  },
};

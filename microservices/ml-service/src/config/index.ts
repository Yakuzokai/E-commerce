import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3012', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/ml_service',
  },

  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },

  kafka: {
    brokers: (process.env.KAFKA_BROKERS || '127.0.0.1:9092').split(','),
    clientId: 'ml-service',
    groupId: 'ml-service-group',
  },

  ml: {
    embeddingDim: parseInt(process.env.EMBEDDING_DIM || '128', 10),
    collaborativeFilterThreshold: parseFloat(process.env.COLLABORATIVE_FILTER_THRESHOLD || '0.3'),
    trainingBatchSize: parseInt(process.env.TRAINING_BATCH_SIZE || '1000', 10),
    modelUpdateInterval: process.env.MODEL_UPDATE_INTERVAL || '0 6 * * *',
  },
};
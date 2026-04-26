import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3013', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fraud_detection',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },

  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: 'fraud-detection-service',
    groupId: 'fraud-detection-group',
  },

  fraud: {
    threshold: parseFloat(process.env.FRAUD_THRESHOLD || '0.7'),
    anomalyThreshold: parseFloat(process.env.ANOMALY_THRESHOLD || '2.5'),
    minTransactionsForLearning: parseInt(process.env.MIN_TRANSACTIONS_FOR_LEARNING || '100', 10),
    riskScoreWeights: JSON.parse(process.env.RISK_SCORE_WEIGHTS || '{"velocity":0.3,"amount":0.25,"geolocation":0.2,"device":0.15,"history":0.1}'),
  },
};
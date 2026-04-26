import express from 'express';
import { config } from './config';
import { logger } from './utils/logger';
import { kafkaService } from './services/kafka.service';
import { collaborativeFilteringService } from './services/collaborative-filtering.service';
import { abTestingService } from './services/ab-testing.service';
import mlRoutes from './routes/ml.routes';
import healthRoutes from './routes/health.routes';
import cron from 'node-cron';

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

app.use('/', healthRoutes);
app.use('/api/v1/ml', mlRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  try {
    await kafkaService.connect();
    logger.info('Connected to Kafka');

    await collaborativeFilteringService.initialize();
    await abTestingService.initialize();

    // Schedule daily model retraining
    cron.schedule(config.ml.modelUpdateInterval, async () => {
      logger.info('Starting scheduled model retraining');
      try {
        await collaborativeFilteringService.train();
      } catch (error) {
        logger.error('Scheduled training failed:', error);
      }
    });

    app.listen(config.port, () => {
      logger.info(`ML Service listening on port ${config.port}`);
    });
  } catch (error) {
    logger.error('Failed to start:', error);
    process.exit(1);
  }
}

async function shutdown() {
  logger.info('Shutting down...');
  await kafkaService.disconnect();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();
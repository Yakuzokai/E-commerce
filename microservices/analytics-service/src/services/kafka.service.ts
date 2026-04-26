import { Kafka, Consumer } from 'kafkajs';
import { config } from '../config';
import { logger } from '../utils/logger';

export class KafkaService {
  private kafka: Kafka;
  private consumer: Consumer;
  private isConnected = false;

  constructor() {
    this.kafka = new Kafka({
      clientId: config.kafka.clientId,
      brokers: config.kafka.brokers,
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });

    this.consumer = this.kafka.consumer({ groupId: config.kafka.groupId });
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      await this.consumer.connect();
      this.isConnected = true;
      logger.info('Kafka connected');
    } catch (error) {
      logger.error('Kafka connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.consumer.disconnect();
    this.isConnected = false;
  }

  async subscribe(
    topic: string,
    handler: (message: any) => Promise<void>
  ): Promise<void> {
    if (!this.isConnected) await this.connect();

    await this.consumer.subscribe({ topic, fromBeginning: false });

    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const value = message.value?.toString();
          if (value) {
            const data = JSON.parse(value);
            await handler(data);
          }
        } catch (error) {
          logger.error(`Error processing message from ${topic}:`, error);
        }
      },
    });

    logger.info(`Subscribed to topic: ${topic}`);
  }
}

export const kafkaService = new KafkaService();
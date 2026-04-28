import { Kafka, Consumer } from 'kafkajs';
import { config } from '../config';
import { logger } from '../utils/logger';

export class KafkaService {
  private kafka: Kafka;
  private consumer: Consumer;
  private isConnected = false;
  private isRunning = false;
  private subscriptions: Map<string, (message: any) => Promise<void>> = new Map();

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
    this.isRunning = false;
  }

  async subscribe(
    topic: string,
    handler: (message: any) => Promise<void>
  ): Promise<void> {
    if (!this.isConnected) await this.connect();
    if (this.isRunning) {
      throw new Error('Cannot subscribe to a topic after the consumer has started');
    }

    // Store handler for later use
    this.subscriptions.set(topic, handler);

    // Subscribe to topic
    await this.consumer.subscribe({ topic, fromBeginning: false });
    logger.info(`Subscribed to topic: ${topic}`);

  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    if (!this.isConnected) await this.connect();

    this.isRunning = true;
    try {
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const value = message.value?.toString();
            if (value) {
              const data = JSON.parse(value);
              const handler = this.subscriptions.get(topic);
              if (handler) {
                await handler(data);
              }
            }
          } catch (error) {
            logger.error(`Error processing message from ${topic}:`, error);
          }
        },
      });
    } catch (error) {
      this.isRunning = false;
      throw error;
    }
  }
}

export const kafkaService = new KafkaService();
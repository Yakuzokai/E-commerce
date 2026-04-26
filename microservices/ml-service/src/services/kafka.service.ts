import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';
import { config } from '../config';
import { logger } from '../utils/logger';
import { UserBehavior } from '../models/types';

export class KafkaService {
  private kafka: Kafka;
  private producer: Producer;
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

    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: config.kafka.groupId });
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      await this.producer.connect();
      await this.consumer.connect();
      this.isConnected = true;
      logger.info('Kafka connected');
    } catch (error) {
      logger.error('Kafka connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
    await this.consumer.disconnect();
    this.isConnected = false;
  }

  async publish(topic: string, message: Record<string, any>): Promise<void> {
    if (!this.isConnected) await this.connect();

    await this.producer.send({
      topic,
      messages: [{ value: JSON.stringify(message) }],
    });
    logger.debug(`Published to ${topic}:`, message);
  }

  async subscribe(
    topic: string,
    handler: (message: UserBehavior | Record<string, any>) => Promise<void>
  ): Promise<void> {
    if (!this.isConnected) await this.connect();

    await this.consumer.subscribe({ topic, fromBeginning: false });

    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
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

  async publishBatch(topic: string, messages: Record<string, any>[]): Promise<void> {
    if (!this.isConnected) await this.connect();

    await this.producer.send({
      topic,
      messages: messages.map(m => ({ value: JSON.stringify(m) })),
    });
  }
}

export const kafkaService = new KafkaService();
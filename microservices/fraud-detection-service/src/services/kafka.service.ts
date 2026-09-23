import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';
import { config } from '../config';
import { logger } from '../utils/logger';
import { Transaction } from '../types';

export class KafkaService {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private isConnected = false;
  private handlers: Map<string, ((data: any) => Promise<void>)[]> = new Map();
  private isRunning = false;

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
    this.isRunning = false;
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
    handler: (message: Transaction | Record<string, any>) => Promise<void>
  ): Promise<void> {
    if (!this.isConnected) await this.connect();

    const topicHandlers = this.handlers.get(topic) || [];
    topicHandlers.push(handler);
    this.handlers.set(topic, topicHandlers);

    await this.consumer.subscribe({ topic, fromBeginning: false });
    logger.info(`Subscribed to topic: ${topic}`);
  }

  async run(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
        try {
          const value = message.value?.toString();
          if (value) {
            const data = JSON.parse(value);
            const topicHandlers = this.handlers.get(topic);
            if (topicHandlers) {
              await Promise.all(topicHandlers.map(handler => handler(data)));
            }
          }
        } catch (error) {
          logger.error(`Error processing message from ${topic}:`, error);
        }
      },
    });
    logger.info('Kafka consumer group is running');
  }
}

export const kafkaService = new KafkaService();
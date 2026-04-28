/**
 * Kafka Service for Product Service
 */

import { Kafka, Producer } from 'kafkajs';
import { appConfig } from '../config';
import { logger } from '../utils/logger';

const kafka = new Kafka({
  clientId: appConfig.KAFKA_CLIENT_ID,
  brokers: appConfig.KAFKA_BROKERS.split(','),
  retry: { initialRetryTime: 100, retries: 8 },
});

let producer: Producer;
let isConnected = false;

export const Topics = {
  PRODUCT_CREATED: 'products.created',
  PRODUCT_UPDATED: 'products.updated',
  PRODUCT_DELETED: 'products.deleted',
  PRODUCT_STOCK_CHANGED: 'products.stock_changed',
  PRODUCT_VIEWED: 'user.product_viewed',
} as const;

export async function initProducer(): Promise<void> {
  try {
    producer = kafka.producer({ allowAutoTopicCreation: true });
    await producer.connect();
    isConnected = true;
    logger.info('Kafka producer connected');
  } catch (error) {
    logger.warn('Kafka initialization failed (non-critical)', { error: (error as Error).message });
  }
}

export async function publishEvent(topic: string, event: any): Promise<void> {
  if (!isConnected) return;

  try {
    await producer.send({
      topic,
      messages: [{ key: event.eventId || event.data?.id, value: JSON.stringify(event) }],
    });
  } catch (error) {
    logger.error('Failed to publish event', { topic, error: (error as Error).message });
  }
}

export async function disconnectKafka(): Promise<void> {
  if (producer) await producer.disconnect();
}

export default { initProducer, publishEvent, disconnectKafka, Topics };

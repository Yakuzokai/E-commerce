/**
 * Kafka Service - Search events
 */

import { Kafka, Consumer, logLevel } from 'kafkajs';
import { config } from '../config';
import { logger } from '../utils/logger';
import { indexProduct, deleteProduct } from './elasticsearch.service';

const kafka = new Kafka({
  clientId: 'search-service',
  brokers: config.kafka.brokers,
  logLevel: logLevel.WARN,
});

let consumer: Consumer | null = null;

export const SEARCH_TOPICS = {
  PRODUCT_CREATED: 'products.created',
  PRODUCT_UPDATED: 'products.updated',
  PRODUCT_DELETED: 'products.deleted',
  PRODUCT_INDEX: 'products.index',
} as const;

export async function startConsumer(): Promise<void> {
  try {
    consumer = kafka.consumer({ groupId: 'search-service-group' });
    await consumer.connect();

    await consumer.subscribe({
      topics: Object.values(SEARCH_TOPICS),
      fromBeginning: false,
    });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const value = JSON.parse(message.value?.toString() || '{}');
          logger.debug('Received message', { topic, key: message.key?.toString() });

          switch (topic) {
            case SEARCH_TOPICS.PRODUCT_CREATED:
            case SEARCH_TOPICS.PRODUCT_UPDATED:
            case SEARCH_TOPICS.PRODUCT_INDEX:
              await indexProduct(value.data);
              break;

            case SEARCH_TOPICS.PRODUCT_DELETED:
              await deleteProduct(value.data.id);
              break;
          }
        } catch (error: any) {
          logger.error('Error processing message', { topic, error: error.message });
        }
      },
    });

    logger.info('Kafka consumer started');
  } catch (error) {
    logger.error('Failed to start Kafka consumer', { error });
  }
}

export async function stopConsumer(): Promise<void> {
  if (consumer) {
    await consumer.disconnect();
    consumer = null;
    logger.info('Kafka consumer stopped');
  }
}

export default {
  startConsumer,
  stopConsumer,
  SEARCH_TOPICS,
};

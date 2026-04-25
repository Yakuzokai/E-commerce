/**
 * Kafka Service
 * Event publishing for the event-driven architecture
 */

import { Kafka, Producer, Consumer, Admin, EachMessagePayload } from 'kafkajs';
import { appConfig } from '../config';
import { logger } from '../utils/logger';

// Create Kafka client
const kafka = new Kafka({
  clientId: appConfig.KAFKA_CLIENT_ID,
  brokers: appConfig.KAFKA_BROKERS.split(','),
  retry: {
    initialRetryTime: 100,
    retries: 8,
  },
});

let producer: Producer;
let admin: Admin;
let isConnected = false;

/**
 * Kafka Topics
 */
export const Topics = {
  USER_CREATED: 'users.created',
  USER_UPDATED: 'users.updated',
  USER_DELETED: 'users.deleted',
  USER_LOGGED_IN: 'auth.user.logged_in',
  USER_LOGGED_OUT: 'auth.user.logged_out',
  TOKEN_REVOKED: 'auth.token.revoked',
} as const;

export type TopicName = (typeof Topics)[keyof typeof Topics];

/**
 * Initialize Kafka producer
 */
export async function initProducer(): Promise<void> {
  try {
    producer = kafka.producer({
      allowAutoTopicCreation: true,
      transactionTimeout: 30000,
    });

    await producer.connect();
    isConnected = true;
    logger.info('Kafka producer connected');
  } catch (error) {
    logger.error('Failed to connect Kafka producer', {
      error: (error as Error).message,
    });
    // Don't throw - Kafka is optional for auth service
  }
}

/**
 * Initialize Kafka admin
 */
export async function initAdmin(): Promise<void> {
  try {
    admin = kafka.admin();
    await admin.connect();

    // Ensure topics exist
    await admin.createTopics({
      topics: [
        { topic: Topics.USER_CREATED, numPartitions: 3 },
        { topic: Topics.USER_UPDATED, numPartitions: 3 },
        { topic: Topics.USER_DELETED, numPartitions: 3 },
        { topic: Topics.USER_LOGGED_IN, numPartitions: 3 },
        { topic: Topics.USER_LOGGED_OUT, numPartitions: 3 },
        { topic: Topics.TOKEN_REVOKED, numPartitions: 3 },
      ],
    });

    logger.info('Kafka admin initialized');
  } catch (error) {
    logger.error('Failed to initialize Kafka admin', {
      error: (error as Error).message,
    });
  }
}

/**
 * Publish an event to Kafka
 */
export async function publishEvent<T = any>(
  topic: TopicName,
  event: {
    eventId: string;
    eventType: string;
    timestamp: string;
    version: string;
    data: T;
  }
): Promise<void> {
  if (!isConnected) {
    logger.warn('Kafka producer not connected, skipping event publish', {
      topic,
      eventId: event.eventId,
    });
    return;
  }

  try {
    await producer.send({
      topic,
      messages: [
        {
          key: event.data && typeof (event.data as any).id === 'string'
            ? (event.data as any).id
            : event.eventId,
          value: JSON.stringify(event),
          headers: {
            'event-type': event.eventType,
            'event-id': event.eventId,
            'content-type': 'application/json',
          },
        },
      ],
    });

    logger.debug('Event published', { topic, eventId: event.eventId });
  } catch (error) {
    logger.error('Failed to publish event', {
      topic,
      eventId: event.eventId,
      error: (error as Error).message,
    });
    // Don't throw - event publishing should not break the main flow
  }
}

/**
 * Create a consumer for a topic
 */
export async function createConsumer(
  groupId: string,
  topics: TopicName[]
): Promise<Consumer> {
  const consumer = kafka.consumer({ groupId });

  await consumer.connect();
  await consumer.subscribe({
    topics,
    fromBeginning: false,
  });

  logger.info('Consumer created', { groupId, topics });
  return consumer;
}

/**
 * Run a consumer with message handler
 */
export async function runConsumer(
  consumer: Consumer,
  handler: (payload: EachMessagePayload) => Promise<void>
): Promise<void> {
  await consumer.run({
    eachMessage: async (payload) => {
      try {
        await handler(payload);
      } catch (error) {
        logger.error('Error processing message', {
          topic: payload.topic,
          partition: payload.partition,
          offset: payload.message.offset,
          error: (error as Error).message,
        });
      }
    },
  });
}

/**
 * Disconnect Kafka
 */
export async function disconnectKafka(): Promise<void> {
  try {
    if (producer) {
      await producer.disconnect();
    }
    if (admin) {
      await admin.disconnect();
    }
    logger.info('Kafka disconnected');
  } catch (error) {
    logger.error('Error disconnecting Kafka', {
      error: (error as Error).message,
    });
  }
}

/**
 * Health check
 */
export function kafkaHealthCheck(): boolean {
  return isConnected;
}

export { kafka, producer, admin };
export default {
  initProducer,
  initAdmin,
  publishEvent,
  createConsumer,
  runConsumer,
  disconnectKafka,
  kafkaHealthCheck,
  Topics,
};

/**
 * Kafka Service - Event publishing for order events
 */

import { Kafka, Producer, logLevel } from 'kafkajs';
import config from '../config';
import { logger } from '../utils/logger';

const kafka = new Kafka({
  clientId: config.KAFKA_CLIENT_ID || 'order-service',
  brokers: (config.KAFKA_BROKERS || 'localhost:9092').split(','),
  logLevel: logLevel.WARN,
  retry: {
    initialRetryTime: 100,
    retries: 10,
  },
});

const producer: Producer = kafka.producer();

let isConnected = false;

/**
 * Connect to Kafka
 */
export async function connectProducer(): Promise<void> {
  try {
    await producer.connect();
    isConnected = true;
    logger.info('Kafka producer connected');
  } catch (error) {
    logger.error('Failed to connect Kafka producer', { error });
    throw error;
  }
}

/**
 * Disconnect from Kafka
 */
export async function disconnectProducer(): Promise<void> {
  try {
    await producer.disconnect();
    isConnected = false;
    logger.info('Kafka producer disconnected');
  } catch (error) {
    logger.error('Failed to disconnect Kafka producer', { error });
  }
}

/**
 * Publish an event to Kafka
 */
export async function publishEvent(
  topic: string,
  event: any
): Promise<void> {
  if (!isConnected) {
    logger.warn('Kafka producer not connected, skipping event publish');
    return;
  }

  try {
    await producer.send({
      topic,
      messages: [
        {
          key: event.data?.orderId || event.eventId,
          value: JSON.stringify(event),
          headers: {
            eventType: event.eventType,
            timestamp: event.timestamp,
            version: event.version,
          },
        },
      ],
    });
    logger.debug('Event published', { topic, eventType: event.eventType });
  } catch (error) {
    logger.error('Failed to publish event', { topic, error });
    // Don't throw - event publishing failure shouldn't block the main operation
  }
}

// Kafka topics
export const ORDER_TOPICS = {
  ORDER_CREATED: 'orders.created',
  ORDER_UPDATED: 'orders.updated',
  ORDER_STATUS_CHANGED: 'orders.status_changed',
  ORDER_CANCELLED: 'orders.cancelled',
  PAYMENT_COMPLETED: 'payments.completed',
  PAYMENT_FAILED: 'payments.failed',
  INVENTORY_RESERVED: 'inventory.reserved',
  INVENTORY_RELEASED: 'inventory.released',
  SHIPMENT_CREATED: 'shipments.created',
  SHIPMENT_UPDATED: 'shipments.updated',
  NOTIFICATION_ORDER: 'notifications.order',
  NOTIFICATION_PAYMENT: 'notifications.payment',
} as const;

export default {
  connectProducer,
  disconnectProducer,
  publishEvent,
  ORDER_TOPICS,
};

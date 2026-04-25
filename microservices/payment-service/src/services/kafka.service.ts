/**
 * Kafka Service - Payment events
 */

import { Kafka, Producer, logLevel } from 'kafkajs';
import { config } from '../config';
import { logger } from '../utils/logger';

const kafka = new Kafka({
  clientId: 'payment-service',
  brokers: config.kafka.brokers,
  logLevel: logLevel.WARN,
  retry: {
    initialRetryTime: 100,
    retries: 3,
  },
});

const producer: Producer = kafka.producer();
let isConnected = false;

export const PAYMENT_TOPICS = {
  PAYMENT_CREATED: 'payments.created',
  PAYMENT_COMPLETED: 'payments.completed',
  PAYMENT_FAILED: 'payments.failed',
  PAYMENT_REFUNDED: 'payments.refunded',
  REFUND_CREATED: 'refunds.created',
  REFUND_COMPLETED: 'refunds.completed',
  REFUND_FAILED: 'refunds.failed',
  NOTIFICATION_PAYMENT: 'notifications.payment',
  ORDER_STATUS_CHANGED: 'orders.status_changed',
} as const;

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

export async function disconnectProducer(): Promise<void> {
  try {
    await producer.disconnect();
    isConnected = false;
    logger.info('Kafka producer disconnected');
  } catch (error) {
    logger.error('Failed to disconnect Kafka producer', { error });
  }
}

export async function publishEvent(topic: string, event: any): Promise<void> {
  if (!isConnected) {
    logger.warn('Kafka producer not connected, skipping event');
    return;
  }

  try {
    await producer.send({
      topic,
      messages: [{
        key: event.data?.paymentId || event.eventId,
        value: JSON.stringify(event),
        headers: {
          eventType: event.eventType,
          timestamp: event.timestamp,
          version: event.version,
        },
      }],
    });
    logger.debug('Event published', { topic, eventType: event.eventType });
  } catch (error) {
    logger.error('Failed to publish event', { topic, error });
  }
}

export default {
  connectProducer,
  disconnectProducer,
  publishEvent,
  PAYMENT_TOPICS,
};

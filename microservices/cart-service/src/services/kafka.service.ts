/**
 * Kafka Service - Cart events
 */

import { Kafka, Producer, logLevel } from 'kafkajs';
import { config } from '../config';
import { logger } from '../utils/logger';

const kafka = new Kafka({
  clientId: 'cart-service',
  brokers: config.kafka.brokers,
  logLevel: logLevel.WARN,
});

const producer: Producer = kafka.producer();
let isConnected = false;

export const CART_TOPICS = {
  CART_UPDATED: 'cart.updated',
  CART_CLEARED: 'cart.cleared',
  CART_CHECKOUT_STARTED: 'cart.checkout_started',
  PRODUCT_ADDED_TO_CART: 'products.added_to_cart',
  PRODUCT_REMOVED_FROM_CART: 'products.removed_from_cart',
} as const;

export async function connectProducer(): Promise<void> {
  try {
    await producer.connect();
    isConnected = true;
    logger.info('Kafka producer connected');
  } catch (error) {
    logger.error('Failed to connect Kafka producer', { error });
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
        key: event.data?.userId || event.eventId,
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
  CART_TOPICS,
};

/**
 * Kafka Service - Recommendation events
 */

import { Kafka, Consumer, Producer, logLevel } from 'kafkajs';
import { config } from '../config';
import { logger } from '../utils/logger';
import { trackBehavior, addBoughtTogetherRelationship, addViewedTogetherRelationship } from './recommendation.service';

const kafka = new Kafka({
  clientId: 'recommendation-service',
  brokers: config.kafka.brokers,
  logLevel: logLevel.WARN,
});

let consumer: Consumer | null = null;
let producer: Producer | null = null;
let isConnected = false;

export const RECOMMENDATION_TOPICS = {
  PRODUCT_VIEWED: 'products.viewed',
  PRODUCT_PURCHASED: 'orders.completed',
  PRODUCT_ADDED_TO_CART: 'cart.updated',
  BEHAVIOR_TRACKED: 'recommendations.behavior_tracked',
  SEARCH_QUERY: 'search.queries',
} as const;

export async function startConsumer(): Promise<void> {
  try {
    consumer = kafka.consumer({ groupId: 'recommendation-service-group' });
    producer = kafka.producer();

    await Promise.all([
      consumer.connect(),
      producer.connect(),
    ]);

    isConnected = true;

    await consumer.subscribe({
      topics: [
        RECOMMENDATION_TOPICS.PRODUCT_VIEWED,
        RECOMMENDATION_TOPICS.PRODUCT_PURCHASED,
        RECOMMENDATION_TOPICS.PRODUCT_ADDED_TO_CART,
      ],
      fromBeginning: false,
    });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const value = JSON.parse(message.value?.toString() || '{}');
          const data = value.data || value;

          switch (topic) {
            case RECOMMENDATION_TOPICS.PRODUCT_VIEWED:
              await trackBehavior({
                userId: data.userId,
                productId: data.productId,
                eventType: 'view',
                timestamp: new Date(),
                metadata: data.metadata,
              });
              // Track viewed together
              if (data.sessionId) {
                const recentProducts = data.recentProducts || [];
                for (const recentProductId of recentProducts) {
                  if (recentProductId !== data.productId) {
                    await addViewedTogetherRelationship(data.productId, recentProductId);
                  }
                }
              }
              break;

            case RECOMMENDATION_TOPICS.PRODUCT_PURCHASED:
              await trackBehavior({
                userId: data.userId,
                productId: data.productId,
                eventType: 'purchase',
                timestamp: new Date(),
              });
              // Track bought together
              if (data.orderItems) {
                for (const item1 of data.orderItems) {
                  for (const item2 of data.orderItems) {
                    if (item1.productId !== item2.productId) {
                      await addBoughtTogetherRelationship(item1.productId, item2.productId);
                    }
                  }
                }
              }
              break;

            case RECOMMENDATION_TOPICS.PRODUCT_ADDED_TO_CART:
              await trackBehavior({
                userId: data.userId,
                productId: data.productId,
                eventType: 'add_to_cart',
                timestamp: new Date(),
              });
              break;
          }
        } catch (error: any) {
          logger.error('Error processing message', { topic, error: error.message });
        }
      },
    });

    logger.info('Recommendation consumer started');
  } catch (error) {
    logger.error('Failed to start consumer', { error });
  }
}

export async function publishEvent(topic: string, event: any): Promise<void> {
  if (!isConnected || !producer) {
    logger.warn('Kafka not connected, skipping event');
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
  } catch (error) {
    logger.error('Failed to publish event', { topic, error });
  }
}

export async function stopConsumer(): Promise<void> {
  if (consumer) {
    await consumer.disconnect();
    consumer = null;
  }
  if (producer) {
    await producer.disconnect();
    producer = null;
  }
  isConnected = false;
  logger.info('Kafka stopped');
}

export default {
  startConsumer,
  stopConsumer,
  publishEvent,
  RECOMMENDATION_TOPICS,
};

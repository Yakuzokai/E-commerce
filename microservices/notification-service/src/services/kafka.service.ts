/**
 * Kafka Service - Notification events consumer
 */

import { Kafka, Consumer, logLevel } from 'kafkajs';
import { config } from '../config';
import { logger } from '../utils/logger';
import { createNotification } from './notification.service';

const kafka = new Kafka({
  clientId: 'notification-service',
  brokers: config.kafka.brokers,
  logLevel: logLevel.WARN,
});

let consumer: Consumer | null = null;

export const NOTIFICATION_TOPICS = {
  ORDER_CREATED: 'orders.created',
  ORDER_STATUS_CHANGED: 'orders.status_changed',
  ORDER_CANCELLED: 'orders.cancelled',
  PAYMENT_COMPLETED: 'payments.completed',
  PAYMENT_FAILED: 'payments.failed',
  REFUND_COMPLETED: 'refunds.completed',
  NOTIFICATION_ORDER: 'notifications.order',
  NOTIFICATION_PAYMENT: 'notifications.payment',
  PUSH_NOTIFICATION: 'notifications.push',
  SMS_NOTIFICATION: 'notifications.sms',
  NOTIFICATION_READ: 'notifications.read',
  CHAT_MESSAGE: 'chat.messages',
} as const;

const TOPIC_HANDLERS: Record<string, (data: any) => Promise<void>> = {
  [NOTIFICATION_TOPICS.ORDER_STATUS_CHANGED]: async (data) => {
    const statusMessages: Record<string, { title: string; message: string }> = {
      confirmed: {
        title: 'Order Confirmed!',
        message: `Your order #${data.orderId} has been confirmed and is being prepared.`,
      },
      shipped: {
        title: 'Order Shipped!',
        message: `Your order #${data.orderId} has been shipped. Track your package now!`,
      },
      delivered: {
        title: 'Order Delivered!',
        message: `Your order #${data.orderId} has been delivered. Enjoy your purchase!`,
      },
    };

    const content = statusMessages[data.newStatus] || {
      title: 'Order Update',
      message: `Your order #${data.orderId} status has been updated.`,
    };

    await createNotification({
      userId: data.userId,
      type: 'order_' + data.newStatus,
      ...content,
      data: { orderId: data.orderId },
      channels: ['in_app', 'email'],
    });
  },

  [NOTIFICATION_TOPICS.PAYMENT_COMPLETED]: async (data) => {
    await createNotification({
      userId: data.userId,
      type: 'payment_received',
      title: 'Payment Received!',
      message: `We received your payment of $${data.amount} for order #${data.orderId}.`,
      data: { orderId: data.orderId, amount: data.amount },
      channels: ['in_app'],
    });
  },

  [NOTIFICATION_TOPICS.PAYMENT_FAILED]: async (data) => {
    await createNotification({
      userId: data.userId,
      type: 'payment_failed',
      title: 'Payment Failed',
      message: `Your payment for order #${data.orderId} failed. Please try again.`,
      data: { orderId: data.orderId, error: data.error },
      channels: ['in_app', 'email'],
    });
  },

  [NOTIFICATION_TOPICS.CHAT_MESSAGE]: async (data) => {
    await createNotification({
      userId: data.receiverId,
      type: 'chat_message',
      title: 'New Message',
      message: `You have a new message from ${data.senderName}`,
      data: { chatId: data.chatId, senderId: data.senderId },
      channels: ['in_app', 'push'],
    });
  },
};

export async function startConsumer(): Promise<void> {
  try {
    consumer = kafka.consumer({ groupId: 'notification-service-group' });
    await consumer.connect();

    const topics = Object.values(NOTIFICATION_TOPICS);
    await consumer.subscribe({ topics, fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const value = JSON.parse(message.value?.toString() || '{}');
          logger.debug('Received notification event', { topic, key: message.key?.toString() });

          const handler = TOPIC_HANDLERS[topic];
          if (handler) {
            await handler(value.data || value);
          }
        } catch (error: any) {
          logger.error('Error processing notification event', { topic, error: error.message });
        }
      },
    });

    logger.info('Notification consumer started');
  } catch (error) {
    logger.error('Failed to start notification consumer', { error });
  }
}

export async function stopConsumer(): Promise<void> {
  if (consumer) {
    await consumer.disconnect();
    consumer = null;
    logger.info('Notification consumer stopped');
  }
}

export async function publishEvent(topic: string, event: any): Promise<void> {
  // This service mainly consumes, but can publish for push/sms
  logger.debug('Would publish event', { topic, eventType: event.eventType });
}

export default {
  startConsumer,
  stopConsumer,
  publishEvent,
  NOTIFICATION_TOPICS,
};

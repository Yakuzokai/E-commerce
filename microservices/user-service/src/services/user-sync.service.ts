/**
 * Kafka Consumer - Sync users from Auth Service
 */

import { Kafka, Consumer, logLevel } from 'kafkajs';
import { config } from '../config';
import { logger } from '../utils/logger';
import { queryOne } from '../db';

const kafka = new Kafka({
  clientId: 'user-service-consumer',
  brokers: config.kafka.brokers,
  logLevel: logLevel.WARN,
});

const consumer: Consumer = kafka.consumer({ groupId: 'user-service-sync' });

export async function startUserSync(): Promise<void> {
  try {
    await consumer.connect();
    await consumer.subscribe({ topic: 'auth.user.created', fromBeginning: true });
    await consumer.subscribe({ topic: 'auth.user.updated', fromBeginning: true });

    await consumer.run({
      eachMessage: async ({ topic, message }) => {
        const value = message.value?.toString();
        if (!value) return;

        try {
          const event = JSON.parse(value);
          const userData = event.data;

          if (topic === 'auth.user.created') {
            await syncUser(userData);
          } else if (topic === 'auth.user.updated') {
            await syncUser(userData);
          }
        } catch (err) {
          logger.error('Error processing user sync message', { error: err });
        }
      },
    });

    logger.info('User sync consumer started');
  } catch (error) {
    logger.error('Failed to start user sync consumer', { error });
  }
}

async function syncUser(userData: any): Promise<void> {
  try {
    await queryOne(
      `INSERT INTO users (id, email, first_name, last_name, status)
       VALUES ($1, $2, $3, $4, 'active')
       ON CONFLICT (id) DO UPDATE SET
         email = EXCLUDED.email,
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         updated_at = CURRENT_TIMESTAMP`,
      [userData.id, userData.email, userData.firstName, userData.lastName]
    );
    logger.info('User synced from Auth Service', { userId: userData.id });
  } catch (error) {
    logger.error('Failed to sync user', { userId: userData.id, error });
  }
}

export async function stopUserSync(): Promise<void> {
  await consumer.disconnect();
}

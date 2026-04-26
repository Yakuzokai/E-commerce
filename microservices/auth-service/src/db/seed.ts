/**
 * Seeding script for Auth Service - Improved
 */

import { v4 as uuidv4 } from 'uuid';
import { hashPassword } from '../services/jwt.service';
import { query, closePool, transaction } from './index';
import { logger } from '../utils/logger';

async function seed() {
  logger.info('Starting auth database seeding...');

  try {
    await transaction(async (client) => {
      // Clear existing users
      await client.query('DELETE FROM users CASCADE');

      // Create a default user using the service's own hashing logic
      const userId = uuidv4();
      const passwordHash = await hashPassword('password123');
      
      await client.query(
        `INSERT INTO users (id, email, password_hash, first_name, last_name, role, status, email_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [userId, 'user@example.com', passwordHash, 'Test', 'User', 'customer', 'active', true]
      );

      logger.info('Default user created: user@example.com / password123');
    });

    logger.info('Seeding completed successfully');
  } catch (error) {
    logger.error('Seeding failed', { error: (error as Error).message });
    throw error;
  } finally {
    await closePool();
  }
}

seed().then(() => process.exit(0)).catch(() => process.exit(1));

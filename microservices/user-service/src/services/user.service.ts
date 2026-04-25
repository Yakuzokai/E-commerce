/**
 * User Service - Business Logic
 */

import { query, queryOne } from '../db';
import { User, Address, UserPreferences, CreateAddressRequest, UpdateUserRequest, PaginatedResponse } from '../types';
import { publishEvent, USER_TOPICS } from './kafka.service';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  return queryOne<User>(
    'SELECT * FROM users WHERE id = $1',
    [userId]
  );
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  return queryOne<User>(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
}

/**
 * Create user (called from Auth Service after registration)
 */
export async function createUser(data: {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
}): Promise<User> {
  const user = await queryOne<User>(
    `INSERT INTO users (id, email, username, first_name, last_name, status, is_verified)
     VALUES ($1, $2, $3, $4, $5, 'active', FALSE)
     RETURNING *`,
    [data.id, data.email, data.username, data.firstName, data.lastName]
  );

  // Create default preferences
  await query(
    `INSERT INTO user_preferences (user_id) VALUES ($1)`,
    [data.id]
  );

  await publishEvent(USER_TOPICS.USER_CREATED, {
    eventType: 'USER_CREATED',
    eventId: uuidv4(),
    timestamp: new Date().toISOString(),
    version: '1.0',
    data: user,
  });

  logger.info('User created', { userId: data.id });
  return user!;
}

/**
 * Update user profile
 */
export async function updateUser(userId: string, data: UpdateUserRequest): Promise<User | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.firstName !== undefined) {
    fields.push(`first_name = $${paramIndex++}`);
    values.push(data.firstName);
  }
  if (data.lastName !== undefined) {
    fields.push(`last_name = $${paramIndex++}`);
    values.push(data.lastName);
  }
  if (data.phone !== undefined) {
    fields.push(`phone = $${paramIndex++}`);
    values.push(data.phone);
  }
  if (data.avatar !== undefined) {
    fields.push(`avatar = $${paramIndex++}`);
    values.push(data.avatar);
  }
  if (data.gender !== undefined) {
    fields.push(`gender = $${paramIndex++}`);
    values.push(data.gender);
  }
  if (data.dateOfBirth !== undefined) {
    fields.push(`date_of_birth = $${paramIndex++}`);
    values.push(data.dateOfBirth);
  }

  if (fields.length === 0) {
    return getUserById(userId);
  }

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(userId);

  const user = await queryOne<User>(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  if (user) {
    await publishEvent(USER_TOPICS.USER_UPDATED, {
      eventType: 'USER_UPDATED',
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
      version: '1.0',
      data: user,
    });
  }

  logger.info('User updated', { userId });
  return user;
}

/**
 * Get user addresses
 */
export async function getUserAddresses(userId: string): Promise<Address[]> {
  return query<Address>(
    'SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
    [userId]
  );
}

/**
 * Get address by ID
 */
export async function getAddressById(addressId: string): Promise<Address | null> {
  return queryOne<Address>(
    'SELECT * FROM addresses WHERE id = $1',
    [addressId]
  );
}

/**
 * Add address
 */
export async function addAddress(userId: string, data: CreateAddressRequest): Promise<Address> {
  // If this is default, unset other defaults
  if (data.isDefault) {
    await query(
      'UPDATE addresses SET is_default = FALSE WHERE user_id = $1',
      [userId]
    );
  }

  const address = await queryOne<Address>(
    `INSERT INTO addresses (user_id, type, label, recipient_name, phone, address_line_1, address_line_2, city, state, postal_code, country, is_default)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [userId, data.type, data.label, data.recipientName, data.phone, data.addressLine1, data.addressLine2, data.city, data.state, data.postalCode, data.country, data.isDefault || false]
  );

  logger.info('Address added', { userId, addressId: address!.id });
  return address!;
}

/**
 * Update address
 */
export async function updateAddress(addressId: string, data: Partial<CreateAddressRequest>): Promise<Address | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      fields.push(`${snakeKey} = $${paramIndex++}`);
      values.push(value);
    }
  }

  if (fields.length === 0) {
    return getAddressById(addressId);
  }

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(addressId);

  return queryOne<Address>(
    `UPDATE addresses SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
}

/**
 * Delete address
 */
export async function deleteAddress(addressId: string, userId: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM addresses WHERE id = $1 AND user_id = $2',
    [addressId, userId]
  );
  return (result as any).rowCount > 0;
}

/**
 * Set default address
 */
export async function setDefaultAddress(addressId: string, userId: string): Promise<Address | null> {
  await query(
    'UPDATE addresses SET is_default = FALSE WHERE user_id = $1',
    [userId]
  );

  return queryOne<Address>(
    'UPDATE addresses SET is_default = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 RETURNING *',
    [addressId, userId]
  );
}

/**
 * Get user preferences
 */
export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
  return queryOne<UserPreferences>(
    'SELECT * FROM user_preferences WHERE user_id = $1',
    [userId]
  );
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(
  userId: string,
  data: Partial<UserPreferences>
): Promise<UserPreferences | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && key !== 'userId') {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      fields.push(`${snakeKey} = $${paramIndex++}`);
      values.push(value);
    }
  }

  if (fields.length === 0) {
    return getUserPreferences(userId);
  }

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(userId);

  return queryOne<UserPreferences>(
    `UPDATE user_preferences SET ${fields.join(', ')} WHERE user_id = $${paramIndex} RETURNING *`,
    values
  );
}

/**
 * Follow seller
 */
export async function followSeller(userId: string, sellerId: string): Promise<void> {
  await query(
    `INSERT INTO user_follows (user_id, seller_id) VALUES ($1, $2)
     ON CONFLICT (user_id, seller_id) DO NOTHING`,
    [userId, sellerId]
  );

  await publishEvent(USER_TOPICS.SELLER_FOLLOWED, {
    eventType: 'SELLER_FOLLOWED',
    eventId: uuidv4(),
    timestamp: new Date().toISOString(),
    version: '1.0',
    data: { userId, sellerId },
  });

  logger.info('User followed seller', { userId, sellerId });
}

/**
 * Unfollow seller
 */
export async function unfollowSeller(userId: string, sellerId: string): Promise<void> {
  await query(
    'DELETE FROM user_follows WHERE user_id = $1 AND seller_id = $2',
    [userId, sellerId]
  );

  await publishEvent(USER_TOPICS.SELLER_UNFOLLOWED, {
    eventType: 'SELLER_UNFOLLOWED',
    eventId: uuidv4(),
    timestamp: new Date().toISOString(),
    version: '1.0',
    data: { userId, sellerId },
  });
}

/**
 * Get user's followed sellers
 */
export async function getFollowedSellers(userId: string): Promise<string[]> {
  const results = await query<{ seller_id: string }>(
    'SELECT seller_id FROM user_follows WHERE user_id = $1',
    [userId]
  );
  return results.map(r => r.seller_id);
}

/**
 * Get seller's followers
 */
export async function getSellerFollowers(sellerId: string, page: number = 1, limit: number = 20): Promise<PaginatedResponse<User>> {
  const offset = (page - 1) * limit;

  const [followers, countResult] = await Promise.all([
    query<User>(
      `SELECT u.* FROM users u
       INNER JOIN user_follows uf ON u.id = uf.user_id
       WHERE uf.seller_id = $1
       ORDER BY uf.created_at DESC
       LIMIT $2 OFFSET $3`,
      [sellerId, limit, offset]
    ),
    queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM user_follows WHERE seller_id = $1',
      [sellerId]
    ),
  ]);

  const total = parseInt(countResult?.count || '0');

  return {
    data: followers,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export default {
  getUserById,
  getUserByEmail,
  createUser,
  updateUser,
  getUserAddresses,
  getAddressById,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getUserPreferences,
  updateUserPreferences,
  followSeller,
  unfollowSeller,
  getFollowedSellers,
  getSellerFollowers,
};

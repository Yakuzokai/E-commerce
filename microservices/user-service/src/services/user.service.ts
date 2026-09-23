/**
 * User Service - Business Logic
 */

import { query, queryOne, transaction } from '../db';
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
 * Map database row to Address type
 */
function mapAddress(row: any): Address {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    label: row.label,
    recipientName: row.recipient_name,
    phone: row.phone,
    addressLine1: row.address_line_1,
    addressLine2: row.address_line_2,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    country: row.country,
    latitude: row.latitude ? parseFloat(row.latitude) : undefined,
    longitude: row.longitude ? parseFloat(row.longitude) : undefined,
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Get user addresses
 */
export async function getUserAddresses(userId: string): Promise<Address[]> {
  const rows = await query<any>(
    'SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
    [userId]
  );
  return rows.map(mapAddress);
}

/**
 * Get address by ID
 */
export async function getAddressById(addressId: string): Promise<Address | null> {
  const row = await queryOne<any>(
    'SELECT * FROM addresses WHERE id = $1',
    [addressId]
  );
  return row ? mapAddress(row) : null;
}

/**
 * Add address
 */
export async function addAddress(userId: string, data: CreateAddressRequest): Promise<Address> {
  return transaction(async (client) => {
    // Check if user already has addresses
    const existingResult = await client.query('SELECT COUNT(*) FROM addresses WHERE user_id = $1', [userId]);
    const addressCount = parseInt(existingResult.rows[0].count);

    // If this is default or if it's the first address, unset other defaults
    const shouldBeDefault = data.isDefault || addressCount === 0;

    if (shouldBeDefault) {
      await client.query('UPDATE addresses SET is_default = FALSE WHERE user_id = $1', [userId]);
    }

    const res = await client.query(
      `INSERT INTO addresses (user_id, type, label, recipient_name, phone, address_line_1, address_line_2, city, state, postal_code, country, is_default, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        userId, 
        data.type, 
        data.label, 
        data.recipientName, 
        data.phone, 
        data.addressLine1, 
        data.addressLine2 || null, 
        data.city, 
        data.state, 
        data.postalCode, 
        data.country, 
        shouldBeDefault,
        data.latitude,
        data.longitude
      ]
    );

    const address = mapAddress(res.rows[0]);
    logger.info('Address added', { userId, addressId: address.id, isDefault: shouldBeDefault });
    return address;
  });
}

/**
 * Update address
 */
export async function updateAddress(addressId: string, data: Partial<CreateAddressRequest>): Promise<Address | null> {
  return transaction(async (client) => {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Get current address to check user_id
    const currentRes = await client.query('SELECT user_id, is_default FROM addresses WHERE id = $1', [addressId]);
    if (currentRes.rows.length === 0) return null;
    const { user_id: userId } = currentRes.rows[0];

    if (data.isDefault === true) {
      await client.query('UPDATE addresses SET is_default = FALSE WHERE user_id = $1', [userId]);
    }

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        let snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        
        // Fix specific mapping for address lines which have underscores before the number
        if (snakeKey === 'address_line1') snakeKey = 'address_line_1';
        if (snakeKey === 'address_line2') snakeKey = 'address_line_2';
        
        fields.push(`${snakeKey} = $${paramIndex++}`);
        values.push(value === '' ? null : value);
      }
    }

    if (fields.length === 0) {
      const res = await client.query('SELECT * FROM addresses WHERE id = $1', [addressId]);
      return mapAddress(res.rows[0]);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    
    // Add addressId and userId to params
    const finalValues = [...values, addressId, userId];
    const addrIdIdx = paramIndex;
    const usrIdIdx = paramIndex + 1;

    const res = await client.query(
      `UPDATE addresses SET ${fields.join(', ')} WHERE id = $${addrIdIdx} AND user_id = $${usrIdIdx} RETURNING *`,
      finalValues
    );

    return res.rows[0] ? mapAddress(res.rows[0]) : null;
  });
}

/**
 * Delete address
 */
export async function deleteAddress(addressId: string, userId: string): Promise<boolean> {
  return transaction(async (client) => {
    // Check if we are deleting the default address
    const checkRes = await client.query('SELECT is_default FROM addresses WHERE id = $1 AND user_id = $2', [addressId, userId]);
    if (checkRes.rows.length === 0) return false;
    
    const wasDefault = checkRes.rows[0].is_default;

    const deleteRes = await client.query(
      'DELETE FROM addresses WHERE id = $1 AND user_id = $2',
      [addressId, userId]
    );

    if (deleteRes.rowCount > 0 && wasDefault) {
      // Pick the next most recent address and make it default
      await client.query(
        `UPDATE addresses SET is_default = TRUE 
         WHERE id = (SELECT id FROM addresses WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1)`,
        [userId]
      );
    }

    return deleteRes.rowCount > 0;
  });
}

/**
 * Set default address
 */
export async function setDefaultAddress(addressId: string, userId: string): Promise<Address | null> {
  return transaction(async (client) => {
    await client.query(
      'UPDATE addresses SET is_default = FALSE WHERE user_id = $1',
      [userId]
    );

    const res = await client.query(
      'UPDATE addresses SET is_default = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 RETURNING *',
      [addressId, userId]
    );

    return res.rows[0] ? mapAddress(res.rows[0]) : null;
  });
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

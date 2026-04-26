/**
 * User Service
 * User management operations
 */

import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../db';
import { User, UserRole, UserStatus, PaginatedResponse } from '../models/types';
import { hashPassword } from './jwt.service';
import { publishEvent, Topics } from './kafka.service';
import { cacheGet, cacheSet, cacheDelete, CacheKeys, CacheTTL } from './cache.service';
import { logger } from '../utils/logger';

/**
 * Create a new user
 */
export async function createUser(data: {
  email: string;
  password?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
}): Promise<User> {
  const id = uuidv4();
  const passwordHash = data.password ? await hashPassword(data.password) : null;

  const result = await query<User>(
    `INSERT INTO users (
      id, email, password_hash, phone, first_name, last_name, role
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [id, data.email, passwordHash, data.phone, data.firstName, data.lastName, data.role || 'customer']
  );

  const user = result.rows[0];

  // Cache user profile
  await cacheSet(
    CacheKeys.userProfile(user.id),
    formatUserPublic(user),
    CacheTTL.userProfile
  );

  // Publish user created event
  await publishEvent(Topics.USER_CREATED, {
    eventId: uuidv4(),
    eventType: 'USER_CREATED',
    timestamp: new Date().toISOString(),
    version: '1.0',
    data: formatUserPublic(user),
  });

  logger.info('User created', { userId: user.id, email: user.email });

  return user;
}

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<User | null> {
  // Check cache first
  const cached = await cacheGet<User>(CacheKeys.userProfile(id));
  if (cached) {
    return cached;
  }

  const result = await query<User>(
    'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const user = result.rows[0];

  // Cache user profile
  await cacheSet(CacheKeys.userProfile(id), user, CacheTTL.userProfile);

  return user;
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await query<any>(
    'SELECT id, email, password_hash, phone, first_name, last_name, avatar_url, role, status, email_verified, phone_verified, last_login_at, created_at, updated_at FROM users WHERE email = $1 AND deleted_at IS NULL',
    [email]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  // Explicitly map snake_case from DB to camelCase if needed, 
  // but most importantly ensure passwordHash is populated
  return {
    ...row,
    passwordHash: row.password_hash,
    firstName: row.first_name,
    lastName: row.last_name,
    avatarUrl: row.avatar_url,
    emailVerified: row.email_verified,
    phoneVerified: row.phone_verified,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as User;
}

/**
 * Get user by phone
 */
export async function getUserByPhone(phone: string): Promise<User | null> {
  const result = await query<User>(
    'SELECT * FROM users WHERE phone = $1 AND deleted_at IS NULL',
    [phone]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

/**
 * Update user
 */
export async function updateUser(
  id: string,
  data: Partial<{
    firstName: string;
    lastName: string;
    phone: string;
    avatarUrl: string;
  }>
): Promise<User | null> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.firstName !== undefined) {
    updates.push(`first_name = $${paramIndex++}`);
    values.push(data.firstName);
  }
  if (data.lastName !== undefined) {
    updates.push(`last_name = $${paramIndex++}`);
    values.push(data.lastName);
  }
  if (data.phone !== undefined) {
    updates.push(`phone = $${paramIndex++}`);
    values.push(data.phone);
  }
  if (data.avatarUrl !== undefined) {
    updates.push(`avatar_url = $${paramIndex++}`);
    values.push(data.avatarUrl);
  }

  if (updates.length === 0) {
    return getUserById(id);
  }

  updates.push(`updated_at = NOW()`);
  values.push(id);

  const result = await query<User>(
    `UPDATE users SET ${updates.join(', ')}
     WHERE id = $${paramIndex} AND deleted_at IS NULL
     RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    return null;
  }

  const user = result.rows[0];

  // Invalidate cache
  await cacheDelete(CacheKeys.userProfile(id));

  // Publish user updated event
  await publishEvent(Topics.USER_UPDATED, {
    eventId: uuidv4(),
    eventType: 'USER_UPDATED',
    timestamp: new Date().toISOString(),
    version: '1.0',
    data: formatUserPublic(user),
  });

  return user;
}

/**
 * Update user role (admin only)
 */
export async function updateUserRole(
  id: string,
  role: UserRole
): Promise<User | null> {
  const result = await query<User>(
    `UPDATE users SET role = $1, updated_at = NOW()
     WHERE id = $2 AND deleted_at IS NULL
     RETURNING *`,
    [role, id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const user = result.rows[0];

  // Invalidate cache
  await cacheDelete(CacheKeys.userProfile(id));

  // Publish user updated event
  await publishEvent(Topics.USER_UPDATED, {
    eventId: uuidv4(),
    eventType: 'USER_UPDATED',
    timestamp: new Date().toISOString(),
    version: '1.0',
    data: formatUserPublic(user),
  });

  logger.info('User role updated', { userId: id, newRole: role });

  return user;
}

/**
 * Update user status
 */
export async function updateUserStatus(
  id: string,
  status: UserStatus
): Promise<User | null> {
  const result = await query<User>(
    `UPDATE users SET status = $1, updated_at = NOW()
     WHERE id = $2 AND deleted_at IS NULL
     RETURNING *`,
    [status, id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const user = result.rows[0];

  // Invalidate cache
  await cacheDelete(CacheKeys.userProfile(id));

  return user;
}

/**
 * Update last login timestamp
 */
export async function updateLastLogin(id: string): Promise<void> {
  await query(
    'UPDATE users SET last_login_at = NOW() WHERE id = $1',
    [id]
  );
}

/**
 * Soft delete user
 */
export async function deleteUser(id: string): Promise<boolean> {
  const result = await query(
    `UPDATE users SET deleted_at = NOW(), status = 'inactive'
     WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );

  if (result.rowCount === 0) {
    return false;
  }

  // Invalidate cache
  await cacheDelete(CacheKeys.userProfile(id));

  // Publish user deleted event
  await publishEvent(Topics.USER_DELETED, {
    eventId: uuidv4(),
    eventType: 'USER_DELETED',
    timestamp: new Date().toISOString(),
    version: '1.0',
    data: { id, email: '', firstName: '', lastName: '', avatarUrl: '', role: 'customer' as UserRole },
  });

  return true;
}

/**
 * List users with pagination (admin only)
 */
export async function listUsers(params: {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  role?: UserRole;
  status?: UserStatus;
  search?: string;
}): Promise<PaginatedResponse<User>> {
  const { page, limit, sortBy = 'created_at', sortOrder = 'desc', role, status, search } = params;

  const conditions: string[] = ['deleted_at IS NULL'];
  const values: any[] = [];
  let paramIndex = 1;

  if (role) {
    conditions.push(`role = $${paramIndex++}`);
    values.push(role);
  }

  if (status) {
    conditions.push(`status = $${paramIndex++}`);
    values.push(status);
  }

  if (search) {
    conditions.push(`(email ILIKE $${paramIndex} OR first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex})`);
    values.push(`%${search}%`);
    paramIndex++;
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // Get total count
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM users ${whereClause}`,
    values
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Get users
  const offset = (page - 1) * limit;
  values.push(limit, offset);

  const result = await query<User>(
    `SELECT * FROM users ${whereClause}
     ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    values
  );

  return {
    data: result.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  };
}

/**
 * Format user for public exposure (removes sensitive fields)
 */
export function formatUserPublic(user: User) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
    role: user.role,
  };
}

/**
 * Check if email is available
 */
export async function isEmailAvailable(email: string): Promise<boolean> {
  const result = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM users WHERE email = $1 AND deleted_at IS NULL',
    [email]
  );
  return parseInt(result.rows[0].count, 10) === 0;
}

/**
 * Check if phone is available
 */
export async function isPhoneAvailable(phone: string): Promise<boolean> {
  const result = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM users WHERE phone = $1 AND deleted_at IS NULL',
    [phone]
  );
  return parseInt(result.rows[0].count, 10) === 0;
}

export default {
  createUser,
  getUserById,
  getUserByEmail,
  getUserByPhone,
  updateUser,
  updateUserRole,
  updateUserStatus,
  updateLastLogin,
  deleteUser,
  listUsers,
  formatUserPublic,
  isEmailAvailable,
  isPhoneAvailable,
};

/**
 * Session Service
 * Session management with Redis caching
 */

import { v4 as uuidv4 } from 'uuid';
import { query } from '../db';
import { Session } from '../models/types';
import {
  hashRefreshToken,
  compareRefreshToken,
  generateRefreshToken,
} from './jwt.service';
import {
  cacheSet,
  cacheDelete,
  cacheGet,
  CacheKeys,
  CacheTTL,
} from './cache.service';
import { publishEvent, Topics } from './kafka.service';
import { logger } from '../utils/logger';

/**
 * Create a new session
 */
export async function createSession(data: {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: {
    browser?: string;
    os?: string;
    device?: string;
  };
}): Promise<{ session: Session; refreshToken: string }> {
  const sessionId = uuidv4();
  const refreshToken = generateRefreshToken(data.userId, sessionId);
  const refreshTokenHash = await hashRefreshToken(refreshToken);

  // Calculate expiration (7 days from now)
  const expiresAt = new Date(Date.now() + CacheTTL.session * 1000);

  const result = await query<Session>(
    `INSERT INTO sessions (
      id, user_id, refresh_token_hash, ip_address, user_agent, device_info, expires_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [
      sessionId,
      data.userId,
      refreshTokenHash,
      data.ipAddress,
      data.userAgent,
      data.deviceInfo ? JSON.stringify(data.deviceInfo) : null,
      expiresAt,
    ]
  );

  const session = result.rows[0];

  // Cache session in Redis
  await cacheSet(
    CacheKeys.session(data.userId),
    { sessionId, expiresAt: expiresAt.toISOString() },
    CacheTTL.session
  );

  logger.info('Session created', { sessionId, userId: data.userId });

  return { session, refreshToken };
}

/**
 * Get session by ID
 */
export async function getSessionById(id: string): Promise<Session | null> {
  const result = await query<Session>(
    'SELECT * FROM sessions WHERE id = $1',
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

/**
 * Validate refresh token and return session
 */
export async function validateRefreshToken(
  refreshToken: string
): Promise<{ session: Session; isValid: boolean } | null> {
  // Decode token to get session ID
  const jwt = await import('jsonwebtoken');
  const { appConfig } = await import('../config');

  let decoded: any;
  try {
    decoded = jwt.default.verify(refreshToken, appConfig.JWT_SECRET);
  } catch {
    return null;
  }

  const sessionId = decoded.sessionId;
  if (!sessionId) {
    return null;
  }

  // Get session from database
  const session = await getSessionById(sessionId);
  if (!session) {
    return null;
  }

  // Check if session is expired
  if (new Date(session.expiresAt) < new Date()) {
    await deleteSession(sessionId);
    return null;
  }

  // Compare refresh token hash
  const isValid = await compareRefreshToken(refreshToken, session.refreshTokenHash);
  if (!isValid) {
    return null;
  }

  return { session, isValid };
}

/**
 * Refresh session (create new tokens)
 */
export async function refreshSession(
  refreshToken: string
): Promise<{ session: Session; newRefreshToken: string } | null> {
  const validation = await validateRefreshToken(refreshToken);
  if (!validation || !validation.isValid) {
    return null;
  }

  // Delete old session
  await deleteSession(validation.session.id);

  // Create new session
  const result = await createSession({
    userId: validation.session.userId,
    ipAddress: validation.session.ipAddress ?? undefined,
    userAgent: validation.session.userAgent ?? undefined,
    deviceInfo: validation.session.deviceInfo ?? undefined,
  });

  return result;
}

/**
 * Delete session
 */
export async function deleteSession(sessionId: string): Promise<boolean> {
  // Get session first to get user ID
  const session = await getSessionById(sessionId);
  if (!session) {
    return false;
  }

  const result = await query(
    'DELETE FROM sessions WHERE id = $1',
    [sessionId]
  );

  if (result.rowCount === 0) {
    return false;
  }

  // Invalidate cache
  await cacheDelete(CacheKeys.session(session.userId));

  logger.info('Session deleted', { sessionId, userId: session.userId });

  return true;
}

/**
 * Delete all sessions for a user
 */
export async function deleteAllUserSessions(userId: string): Promise<number> {
  const result = await query(
    'DELETE FROM sessions WHERE user_id = $1',
    [userId]
  );

  // Invalidate cache
  await cacheDelete(CacheKeys.session(userId));

  logger.info('All user sessions deleted', { userId, count: result.rowCount });

  return result.rowCount || 0;
}

/**
 * Delete expired sessions (cleanup job)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await query(
    'DELETE FROM sessions WHERE expires_at < NOW()'
  );

  logger.info('Expired sessions cleaned up', { count: result.rowCount });

  return result.rowCount || 0;
}

/**
 * Get active sessions for a user
 */
export async function getUserSessions(userId: string): Promise<Session[]> {
  const result = await query<Session>(
    `SELECT * FROM sessions
     WHERE user_id = $1 AND expires_at > NOW()
     ORDER BY created_at DESC`,
    [userId]
  );

  return result.rows;
}

/**
 * Update session last used timestamp
 */
export async function updateSessionLastUsed(sessionId: string): Promise<void> {
  await query(
    'UPDATE sessions SET created_at = created_at WHERE id = $1',
    [sessionId]
  );
}

/**
 * Revoke a specific token (logout from single device)
 */
export async function revokeRefreshToken(
  userId: string,
  refreshToken: string
): Promise<boolean> {
  const validation = await validateRefreshToken(refreshToken);
  if (!validation || !validation.isValid) {
    return false;
  }

  if (validation.session.userId !== userId) {
    return false;
  }

  const result = await deleteSession(validation.session.id);

  // Publish token revoked event
  if (result) {
    await publishEvent(Topics.TOKEN_REVOKED, {
      eventId: uuidv4(),
      eventType: 'TOKEN_REVOKED',
      timestamp: new Date().toISOString(),
      version: '1.0',
      data: {
        userId,
        sessionId: validation.session.id,
        reason: 'user_logout',
      },
    });
  }

  return result;
}

export default {
  createSession,
  getSessionById,
  validateRefreshToken,
  refreshSession,
  deleteSession,
  deleteAllUserSessions,
  cleanupExpiredSessions,
  getUserSessions,
  updateSessionLastUsed,
  revokeRefreshToken,
};

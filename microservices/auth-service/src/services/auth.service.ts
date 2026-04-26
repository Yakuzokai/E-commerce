/**
 * Auth Service
 * Main authentication logic
 */

import { v4 as uuidv4 } from 'uuid';
import {
  User,
  UserPublic,
  AuthResponse,
  TokenResponse,
  LoginRequest,
  RegisterRequest,
} from '../models/types';
import {
  generateAccessToken,
  generateRefreshToken,
  hashPassword,
  comparePassword,
} from './jwt.service';
import {
  createUser,
  getUserByEmail,
  getUserById,
  updateLastLogin,
  formatUserPublic,
  isEmailAvailable,
} from './user.service';
import {
  createSession,
  deleteAllUserSessions,
  revokeRefreshToken,
  validateRefreshToken,
} from './session.service';
import {
  cacheIncrement,
  cacheGet,
  CacheKeys,
  CacheTTL,
} from './cache.service';
import { publishEvent, Topics } from './kafka.service';
import { query } from '../db';
import { logger } from '../utils/logger';

/**
 * Check for too many failed login attempts
 */
async function isRateLimited(identifier: string): Promise<boolean> {
  const failedCount = await cacheGet<number>(CacheKeys.failedLogin(identifier));
  return (failedCount || 0) >= 5; // Max 5 failed attempts
}

/**
 * Increment failed login counter
 */
async function incrementFailedLogin(identifier: string): Promise<void> {
  await cacheIncrement(CacheKeys.failedLogin(identifier), CacheTTL.failedLogin);
}

/**
 * Clear failed login counter
 */
async function clearFailedLogin(identifier: string): Promise<void> {
  const Redis = (await import('../services/cache.service')).default;
  await Redis.cacheDelete(CacheKeys.failedLogin(identifier));
}

/**
 * Record login history
 */
async function recordLoginHistory(data: {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: Record<string, any>;
  success: boolean;
  failureReason?: string;
}): Promise<void> {
  await query(
    `INSERT INTO login_history (user_id, ip_address, user_agent, device_info, success, failure_reason)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      data.userId,
      data.ipAddress,
      data.userAgent,
      data.deviceInfo ? JSON.stringify(data.deviceInfo) : null,
      data.success,
      data.failureReason,
    ]
  );
}

/**
 * Register a new user
 */
export async function register(
  data: RegisterRequest,
  ipAddress?: string,
  userAgent?: string
): Promise<AuthResponse> {
  // Check if email is available
  const emailAvailable = await isEmailAvailable(data.email);
  if (!emailAvailable) {
    throw new AuthError('Email already registered', 'EMAIL_EXISTS', 409);
  }

  // Create user
  const user = await createUser({
    email: data.email,
    password: data.password,
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone,
  });

  // Create session
  const { refreshToken } = await createSession({
    userId: user.id,
    ipAddress,
    userAgent,
  });

  // Generate tokens
  const tokens = generateTokens(user, refreshToken);

  logger.info('User registered', { userId: user.id, email: user.email });

  return {
    user: formatUserPublic(user),
    tokens,
  };
}

/**
 * Login with email and password
 */
export async function login(
  data: LoginRequest,
  ipAddress?: string,
  userAgent?: string
): Promise<AuthResponse> {
  // Check rate limit
  if (await isRateLimited(data.email)) {
    throw new AuthError(
      'Too many login attempts. Please try again later.',
      'RATE_LIMITED',
      429
    );
  }

  // Find user
  const user = await getUserByEmail(data.email);
  logger.info('Login attempt', { email: data.email, found: !!user, hasHash: !!user?.passwordHash });
  
  if (!user) {
    await incrementFailedLogin(data.email);
    throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS', 401);
  }

  // Check password
  if (!user.passwordHash) {
    logger.warn('OAuth account detection', { userId: user.id, email: user.email });
    throw new AuthError(
      'This account uses OAuth login. Please sign in with the same provider.',
      'OAUTH_ACCOUNT',
      401
    );
  }

  const isValidPassword = await comparePassword(data.password, user.passwordHash);
  if (!isValidPassword) {
    await incrementFailedLogin(data.email);
    await recordLoginHistory({
      userId: user.id,
      ipAddress,
      userAgent,
      success: false,
      failureReason: 'Invalid password',
    });
    throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS', 401);
  }

  // Check user status
  if (user.status !== 'active') {
    throw new AuthError(
      `Account is ${user.status}. Please contact support.`,
      'ACCOUNT_INACTIVE',
      403
    );
  }

  // Clear failed login counter
  await clearFailedLogin(data.email);

  // Create session
  const { refreshToken } = await createSession({
    userId: user.id,
    ipAddress,
    userAgent,
    deviceInfo: data.deviceInfo,
  });

  // Update last login
  await updateLastLogin(user.id);

  // Record successful login
  await recordLoginHistory({
    userId: user.id,
    ipAddress,
    userAgent,
    deviceInfo: data.deviceInfo,
    success: true,
  });

  // Publish login event
  await publishEvent(Topics.USER_LOGGED_IN, {
    eventId: uuidv4(),
    eventType: 'USER_LOGGED_IN',
    timestamp: new Date().toISOString(),
    version: '1.0',
    data: {
      userId: user.id,
      ipAddress,
      timestamp: new Date().toISOString(),
    },
  });

  // Generate tokens
  const tokens = generateTokens(user, refreshToken);

  logger.info('User logged in', { userId: user.id, email: user.email });

  return {
    user: formatUserPublic(user),
    tokens,
  };
}

/**
 * Refresh access token
 */
export async function refreshTokens(
  refreshToken: string
): Promise<TokenResponse> {
  const validation = await validateRefreshToken(refreshToken);
  if (!validation || !validation.isValid) {
    throw new AuthError('Invalid or expired refresh token', 'INVALID_TOKEN', 401);
  }

  const user = await getUserById(validation.session.userId);
  if (!user) {
    throw new AuthError('User not found', 'USER_NOT_FOUND', 404);
  }

  if (user.status !== 'active') {
    throw new AuthError('Account is inactive', 'ACCOUNT_INACTIVE', 403);
  }

  // Delete old session and create new one
  const { refreshToken: newRefreshToken } = await createSession({
    userId: user.id,
    ipAddress: validation.session.ipAddress ?? undefined,
    userAgent: validation.session.userAgent ?? undefined,
  });

  return {
    accessToken: generateAccessToken(user, validation.session.id),
    refreshToken: newRefreshToken,
    expiresIn: 900, // 15 minutes in seconds
    tokenType: 'Bearer',
  };
}

/**
 * Logout (revoke current session)
 */
export async function logout(
  userId: string,
  refreshToken?: string
): Promise<void> {
  if (refreshToken) {
    await revokeRefreshToken(userId, refreshToken);
  }

  // Publish logout event
  await publishEvent(Topics.USER_LOGGED_OUT, {
    eventId: uuidv4(),
    eventType: 'USER_LOGGED_OUT',
    timestamp: new Date().toISOString(),
    version: '1.0',
    data: { userId },
  });

  logger.info('User logged out', { userId });
}

/**
 * Logout from all devices
 */
export async function logoutAll(userId: string): Promise<void> {
  await deleteAllUserSessions(userId);

  // Publish logout event
  await publishEvent(Topics.USER_LOGGED_OUT, {
    eventId: uuidv4(),
    eventType: 'USER_LOGGED_OUT',
    timestamp: new Date().toISOString(),
    version: '1.0',
    data: { userId, allDevices: true },
  });

  logger.info('User logged out from all devices', { userId });
}

/**
 * Get current user from access token
 */
export async function getCurrentUser(
  accessToken: string
): Promise<UserPublic | null> {
  const { verifyAccessToken } = await import('./jwt.service');
  const { appConfig } = await import('../config');

  let decoded: any;
  try {
    const jwt = await import('jsonwebtoken');
    decoded = jwt.default.verify(accessToken, appConfig.JWT_SECRET);
  } catch {
    return null;
  }

  const user = await getUserById(decoded.sub);
  if (!user || user.status !== 'active') {
    return null;
  }

  return formatUserPublic(user);
}

/**
 * Generate tokens for a user
 */
function generateTokens(user: User, refreshToken: string): TokenResponse {
  const sessionId = uuidv4(); // This should come from the session creation
  return {
    accessToken: generateAccessToken(user, sessionId),
    refreshToken,
    expiresIn: 900, // 15 minutes in seconds
    tokenType: 'Bearer',
  };
}

/**
 * Auth Error class
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export default {
  register,
  login,
  refreshTokens,
  logout,
  logoutAll,
  getCurrentUser,
  AuthError,
};

/**
 * JWT Service
 * Token generation, validation, and refresh
 */

import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { appConfig } from '../config';
import {
  JWTPayload,
  RefreshTokenPayload,
  APIKeyPayload,
  User,
  UserRole,
} from '../models/types';
import { logger } from '../utils/logger';

/**
 * Generate access token
 */
export function generateAccessToken(user: User, sessionId: string): string {
  const payload: JWTPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    permissions: getPermissionsForRole(user.role),
    iat: Math.floor(Date.now() / 1000),
    exp: getExpiresInSeconds(appConfig.JWT_ACCESS_EXPIRES_IN),
    iss: appConfig.JWT_ISSUER,
    jti: uuidv4(),
  };

  const token = jwt.sign(payload, appConfig.JWT_SECRET, {
    algorithm: 'HS256',
  });

  return token;
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(userId: string, sessionId: string): string {
  const payload: RefreshTokenPayload = {
    sub: userId,
    sessionId,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000),
    exp: getExpiresInSeconds(appConfig.JWT_REFRESH_EXPIRES_IN),
    iss: appConfig.JWT_ISSUER,
    jti: uuidv4(),
  };

  const token = jwt.sign(payload, appConfig.JWT_SECRET, {
    algorithm: 'HS256',
  });

  return token;
}

/**
 * Generate API key token (for service-to-service)
 */
export function generateAPIKeyToken(
  serviceName: string,
  permissions: string[]
): string {
  const payload: APIKeyPayload = {
    sub: serviceName,
    serviceId: uuidv4(),
    type: 'api_key',
    permissions,
    iat: Math.floor(Date.now() / 1000),
    exp: getExpiresInSeconds('30d'), // API keys expire in 30 days
    iss: appConfig.JWT_ISSUER,
    jti: uuidv4(),
  };

  const token = jwt.sign(payload, appConfig.JWT_SECRET, {
    algorithm: 'HS256',
  });

  return token;
}

/**
 * Verify and decode access token
 */
export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    const payload = jwt.verify(token, appConfig.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: appConfig.JWT_ISSUER,
    }) as JWTPayload;

    return payload;
  } catch (error) {
    logger.debug('Token verification failed', {
      error: (error as Error).message,
    });
    return null;
  }
}

/**
 * Verify and decode refresh token
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    const payload = jwt.verify(token, appConfig.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: appConfig.JWT_ISSUER,
    }) as RefreshTokenPayload;

    // Verify it's a refresh token
    if (payload.type !== 'refresh') {
      return null;
    }

    return payload;
  } catch (error) {
    logger.debug('Refresh token verification failed', {
      error: (error as Error).message,
    });
    return null;
  }
}

/**
 * Verify API key token
 */
export function verifyAPIKeyToken(token: string): APIKeyPayload | null {
  try {
    const payload = jwt.verify(token, appConfig.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: appConfig.JWT_ISSUER,
    }) as APIKeyPayload;

    if (payload.type !== 'api_key') {
      return null;
    }

    return payload;
  } catch (error) {
    logger.debug('API key verification failed', {
      error: (error as Error).message,
    });
    return null;
  }
}

/**
 * Hash password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, appConfig.BCRYPT_ROUNDS);
}

/**
 * Compare password with hash
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Hash refresh token (for storage)
 */
export async function hashRefreshToken(token: string): Promise<string> {
  return bcrypt.hash(token, 10);
}

/**
 * Compare refresh token with hash
 */
export async function compareRefreshToken(
  token: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(token, hash);
}

/**
 * Hash verification token
 */
export async function hashVerificationToken(token: string): Promise<string> {
  return bcrypt.hash(token, 10);
}

/**
 * Get expiration time in seconds
 */
function getExpiresInSeconds(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) {
    return 900; // Default 15 minutes
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 60 * 60;
    case 'd':
      return value * 60 * 60 * 24;
    default:
      return 900;
  }
}

/**
 * Get permissions for role
 */
function getPermissionsForRole(role: UserRole): string[] {
  const permissions: Record<UserRole, string[]> = {
    customer: [
      'read:products',
      'write:cart',
      'read:orders',
      'write:orders',
      'write:reviews',
      'read:profile',
      'write:profile',
    ],
    premium_user: [
      'read:products',
      'write:cart',
      'read:orders',
      'write:orders',
      'write:reviews',
      'read:profile',
      'write:profile',
      'access:premium_features',
    ],
    seller: [
      'read:products',
      'write:products',
      'read:own_orders',
      'read:own_sales',
      'write:own_products',
      'read:profile',
      'write:profile',
    ],
    senior_seller: [
      'read:products',
      'write:products',
      'read:orders',
      'read:sales',
      'write:products',
      'manage:own_inventory',
      'read:profile',
      'write:profile',
    ],
    support: [
      'read:users',
      'read:all_orders',
      'write:orders',
      'read:products',
      'write:reviews',
      'read:profile',
      'access:support_tools',
    ],
    admin: [
      '*', // All permissions
    ],
  };

  return permissions[role] || permissions.customer;
}

/**
 * Check if permission exists in token
 */
export function hasPermission(
  tokenPayload: JWTPayload,
  requiredPermission: string
): boolean {
  // Admin has all permissions
  if (tokenPayload.permissions.includes('*')) {
    return true;
  }

  return tokenPayload.permissions.includes(requiredPermission);
}

/**
 * Decode token without verification (for debugging)
 */
export function decodeToken(token: string): any {
  return jwt.decode(token);
}

export default {
  generateAccessToken,
  generateRefreshToken,
  generateAPIKeyToken,
  verifyAccessToken,
  verifyRefreshToken,
  verifyAPIKeyToken,
  hashPassword,
  comparePassword,
  hashRefreshToken,
  compareRefreshToken,
  hashVerificationToken,
  hasPermission,
  decodeToken,
};

/**
 * Authentication Middleware
 * JWT verification and authorization
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, hasPermission } from '../services/jwt.service';
import { getUserById, formatUserPublic } from '../services/user.service';
import { JWTPayload } from '../models/types';
import { logger } from '../utils/logger';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      userId?: string;
      userRole?: string;
    }
  }
}

/**
 * Extract token from request
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Also check cookies
  if (req.cookies?.accessToken) {
    return req.cookies.accessToken;
  }

  // Check query param (for special cases like file downloads)
  if (req.query?.token) {
    return req.query.token as string;
  }

  return null;
}

/**
 * Authentication middleware - verifies JWT token
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = extractToken(req);

  if (!token) {
    res.status(401).json({
      error: 'Unauthorized',
      code: 'NO_TOKEN',
      message: 'Authentication token is required',
    });
    return;
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    res.status(401).json({
      error: 'Unauthorized',
      code: 'INVALID_TOKEN',
      message: 'Invalid or expired token',
    });
    return;
  }

  // Attach user info to request
  req.user = payload;
  req.userId = payload.sub;
  req.userRole = payload.role;

  next();
}

/**
 * Optional authentication - doesn't fail if no token
 */
export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = extractToken(req);

  if (token) {
    const payload = verifyAccessToken(token);
    if (payload) {
      req.user = payload;
      req.userId = payload.sub;
      req.userRole = payload.role;
    }
  }

  next();
}

/**
 * Authorization middleware - checks if user has required role
 */
export function authorize(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        code: 'NO_TOKEN',
        message: 'Authentication required',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Forbidden',
        code: 'INSUFFICIENT_ROLE',
        message: 'You do not have permission to access this resource',
      });
      return;
    }

    next();
  };
}

/**
 * Permission middleware - checks if user has specific permission
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        code: 'NO_TOKEN',
        message: 'Authentication required',
      });
      return;
    }

    if (!hasPermission(req.user, permission)) {
      res.status(403).json({
        error: 'Forbidden',
        code: 'INSUFFICIENT_PERMISSION',
        message: `Permission '${permission}' is required`,
      });
      return;
    }

    next();
  };
}

/**
 * Admin only middleware
 */
export function adminOnly(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      error: 'Unauthorized',
      code: 'NO_TOKEN',
      message: 'Authentication required',
    });
    return;
  }

  if (req.user.role !== 'admin') {
    res.status(403).json({
      error: 'Forbidden',
      code: 'ADMIN_REQUIRED',
      message: 'Admin access required',
    });
    return;
  }

  next();
}

/**
 * API Key authentication (for service-to-service)
 */
export async function authenticateAPIKey(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    res.status(401).json({
      error: 'Unauthorized',
      code: 'NO_API_KEY',
      message: 'API key is required',
    });
    return;
  }

  const { verifyAPIKeyToken } = await import('../services/jwt.service');
  const payload = verifyAPIKeyToken(apiKey);

  if (!payload) {
    res.status(401).json({
      error: 'Unauthorized',
      code: 'INVALID_API_KEY',
      message: 'Invalid or expired API key',
    });
    return;
  }

  // Attach API key info to request
  req.user = payload as unknown as JWTPayload;
  req.userId = payload.serviceId;
  req.userRole = 'service';

  logger.debug('API key authenticated', { service: payload.sub });

  next();
}

/**
 * Combined authentication - accepts both JWT and API key
 */
export function authenticateAny(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const apiKey = req.headers['x-api-key'] as string;

  if (apiKey) {
    authenticateAPIKey(req, res, next);
    return;
  }

  authenticate(req, res, next);
}

export default {
  authenticate,
  optionalAuth,
  authorize,
  requirePermission,
  adminOnly,
  authenticateAPIKey,
  authenticateAny,
};

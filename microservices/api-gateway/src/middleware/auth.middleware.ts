import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';

// Paths that do not require JWT authentication
const PUBLIC_PATHS = [
  /^\/$/,
  /^\/health/,
  /^\/api\/v1\/auth\/login/,
  /^\/api\/v1\/auth\/register/,
  /^\/api\/v1\/auth\/refresh/,
  /^\/api\/v1\/payments\/webhooks/,
  /^\/webhooks\/stripe/,
];

// Read-only public paths (GET only)
const PUBLIC_GET_PATHS = [
  /^\/api\/v1\/products/,
  /^\/api\/v1\/categories/,
  /^\/api\/v1\/search/,
  /^\/api\/v1\/reviews/,
  /^\/api\/v1\/recommendations\/trending/,
  /^\/api\/v1\/recommendations\/similar/,
  /^\/api\/v1\/recommendations\/new-arrivals/,
];

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const isPublic = PUBLIC_PATHS.some(pattern => pattern.test(req.path));
  const isPublicGet = req.method === 'GET' && PUBLIC_GET_PATHS.some(pattern => pattern.test(req.path));

  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as {
        userId?: string;
        id?: string;
        email?: string;
        role?: string;
      };

      const userId = decoded.userId || decoded.id || '';
      const userRole = decoded.role || 'customer';
      const userEmail = decoded.email || '';

      // Forward decoded claims in headers to downstream microservices
      req.headers['x-user-id'] = userId;
      req.headers['x-user-role'] = userRole;
      req.headers['x-user-email'] = userEmail;

      return next();
    } catch (err: any) {
      if (!isPublic && !isPublicGet) {
        res.status(401).json({
          error: 'Invalid or expired authentication token',
          code: 'UNAUTHORIZED'
        });
        return;
      }
    }
  }

  // If path is public and no auth header or optional auth, proceed
  if (isPublic || isPublicGet) {
    return next();
  }

  res.status(401).json({
    error: 'Authentication token required for this resource',
    code: 'UNAUTHORIZED'
  });
}

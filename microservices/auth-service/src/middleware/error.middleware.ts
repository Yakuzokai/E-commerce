/**
 * Error Handling Middleware
 * Centralized error handling for the API
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';
import { AuthError } from '../services/auth.service';

export interface APIError {
  error: string;
  code: string;
  message: string;
  details?: any;
}

/**
 * Not found handler
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  res.status(404).json({
    error: 'Not Found',
    code: 'ROUTE_NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
  } as APIError);
}

/**
 * Global error handler
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log the error
  logger.error('Request error', {
    error: err.message,
    fullError: err,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    userId: req.userId,
  });

  // Handle AuthError
  if (err instanceof AuthError) {
    res.status(err.statusCode).json({
      error: err.name,
      code: err.code,
      message: err.message,
    } as APIError);
    return;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation Error',
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    } as APIError);
    return;
  }

  // Handle known error types
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      error: 'Unauthorized',
      code: 'INVALID_TOKEN',
      message: 'Invalid token',
    } as APIError);
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      error: 'Unauthorized',
      code: 'TOKEN_EXPIRED',
      message: 'Token has expired',
    } as APIError);
    return;
  }

  // Handle database errors
  if ((err as any).code === '23505') {
    // PostgreSQL unique violation
    res.status(409).json({
      error: 'Conflict',
      code: 'DUPLICATE_ENTRY',
      message: 'A record with this value already exists',
    } as APIError);
    return;
  }

  if ((err as any).code === '23503') {
    // PostgreSQL foreign key violation
    res.status(400).json({
      error: 'Bad Request',
      code: 'REFERENCE_NOT_FOUND',
      message: 'Referenced record not found',
    } as APIError);
    return;
  }

  // Default to 500 internal server error
  const statusCode = (err as any).statusCode || 500;
  const message =
    statusCode === 500 ? 'Internal server error' : err.message;

  res.status(statusCode).json({
    error: 'Server Error',
    code: 'INTERNAL_ERROR',
    message,
  } as APIError);
}

/**
 * Async handler wrapper
 * Wraps async route handlers to catch errors
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default {
  notFoundHandler,
  errorHandler,
  asyncHandler,
};

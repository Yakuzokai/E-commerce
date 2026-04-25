/**
 * Auth Routes
 * Authentication endpoints
 */

import { Router, Request, Response } from 'express';
import { register, login, refreshTokens, logout, logoutAll } from '../services/auth.service';
import { asyncHandler } from '../middleware/error.middleware';
import { authenticate } from '../middleware/index';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from '../utils/validation';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /auth/register
 * Register a new user
 */
router.post(
  '/register',
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, firstName, lastName, phone } = req.body;

    const result = await register(
      { email, password, firstName, lastName, phone },
      req.ip,
      req.headers['user-agent']
    );

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json(result);
  })
);

/**
 * POST /auth/login
 * Login with email and password
 */
router.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, deviceInfo } = req.body;

    const result = await login(
      { email, password, deviceInfo },
      req.ip,
      req.headers['user-agent']
    );

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json(result);
  })
);

/**
 * POST /auth/refresh
 * Refresh access token
 */
router.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    // Get refresh token from cookie or body
    const refreshToken =
      req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      res.status(400).json({
        error: 'Bad Request',
        code: 'NO_REFRESH_TOKEN',
        message: 'Refresh token is required',
      });
      return;
    }

    const tokens = await refreshTokens(refreshToken);

    // Set new refresh token as httpOnly cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
      tokenType: 'Bearer',
    });
  })
);

/**
 * POST /auth/logout
 * Logout current session
 */
router.post(
  '/logout',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken;
    await logout(req.userId!, refreshToken);

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    res.json({ message: 'Logged out successfully' });
  })
);

/**
 * POST /auth/logout-all
 * Logout from all devices
 */
router.post(
  '/logout-all',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    await logoutAll(req.userId!);

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    res.json({ message: 'Logged out from all devices successfully' });
  })
);

/**
 * GET /auth/me
 * Get current user
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { getCurrentUser } = await import('../services/auth.service');
    const user = await getCurrentUser(
      req.headers.authorization!.replace('Bearer ', '')
    );

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
      return;
    }

    res.json({ user });
  })
);

export default router;

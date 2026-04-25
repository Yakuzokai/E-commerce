/**
 * User Routes
 * User management endpoints
 */

import { Router, Request, Response } from 'express';
import {
  getUserById,
  updateUser,
  listUsers,
  getUserByEmail,
  deleteUser,
} from '../services/user.service';
import { asyncHandler } from '../middleware/error.middleware';
import { authenticate, adminOnly } from '../middleware/index';
import { updateUserSchema, updateRoleSchema } from '../utils/validation';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /users
 * List all users (admin only)
 */
router.get(
  '/',
  authenticate,
  adminOnly,
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, sortBy, sortOrder, role, status, search } = req.query;

    const result = await listUsers({
      page: parseInt(page as string) || 1,
      limit: parseInt(limit as string) || 20,
      sortBy: sortBy as string,
      sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
      role: role as any,
      status: status as any,
      search: search as string,
    });

    res.json(result);
  })
);

/**
 * GET /users/profile
 * Get current user's profile
 */
router.get(
  '/profile',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await getUserById(req.userId!);

    if (!user) {
      res.status(404).json({
        error: 'Not Found',
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
      return;
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      },
    });
  })
);

/**
 * GET /users/:id
 * Get user by ID
 */
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await getUserById(req.params.id);

    if (!user) {
      res.status(404).json({
        error: 'Not Found',
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
      return;
    }

    // Non-admins can only view their own profile
    if (req.user!.role !== 'admin' && req.userId !== req.params.id) {
      res.status(403).json({
        error: 'Forbidden',
        code: 'ACCESS_DENIED',
        message: 'You can only view your own profile',
      });
      return;
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      },
    });
  })
);

/**
 * PATCH /users/profile
 * Update current user's profile
 */
router.patch(
  '/profile',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { firstName, lastName, phone, avatarUrl } = req.body;

    const user = await updateUser(req.userId!, {
      firstName,
      lastName,
      phone,
      avatarUrl,
    });

    if (!user) {
      res.status(404).json({
        error: 'Not Found',
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
      return;
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        role: user.role,
        status: user.status,
      },
    });
  })
);

/**
 * PATCH /users/:id/role
 * Update user role (admin only)
 */
router.patch(
  '/:id/role',
  authenticate,
  adminOnly,
  asyncHandler(async (req: Request, res: Response) => {
    const { role } = req.body;

    const user = await updateUser(req.params.id, { role } as any);

    if (!user) {
      res.status(404).json({
        error: 'Not Found',
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
      return;
    }

    logger.info('User role updated by admin', {
      adminId: req.userId,
      targetUserId: req.params.id,
      newRole: role,
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  })
);

/**
 * DELETE /users/:id
 * Delete user (admin only, soft delete)
 */
router.delete(
  '/:id',
  authenticate,
  adminOnly,
  asyncHandler(async (req: Request, res: Response) => {
    // Cannot delete yourself
    if (req.userId === req.params.id) {
      res.status(400).json({
        error: 'Bad Request',
        code: 'CANNOT_DELETE_SELF',
        message: 'You cannot delete your own account',
      });
      return;
    }

    const deleted = await deleteUser(req.params.id);

    if (!deleted) {
      res.status(404).json({
        error: 'Not Found',
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
      return;
    }

    logger.info('User deleted by admin', {
      adminId: req.userId,
      targetUserId: req.params.id,
    });

    res.status(204).send();
  })
);

export default router;

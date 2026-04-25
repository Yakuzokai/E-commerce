/**
 * Zod Validation Schemas
 * Input validation for all endpoints
 */

import { z } from 'zod';

// User roles
export const UserRoleSchema = z.enum([
  'customer',
  'premium_user',
  'seller',
  'senior_seller',
  'support',
  'admin',
]);

// User status
export const UserStatusSchema = z.enum(['active', 'inactive', 'suspended', 'banned']);

// OAuth providers
export const OAuthProviderSchema = z.enum(['google', 'facebook', 'apple']);

// Registration schema
export const registerSchema = z.object({
  body: z.object({
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Invalid email format')
      .max(255, 'Email too long'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(100, 'Password too long')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain uppercase, lowercase, and number'
      ),
    firstName: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
    phone: z
      .string()
      .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
      .optional(),
  }),
});

// Login schema
export const loginSchema = z.object({
  body: z.object({
    email: z.string().min(1).email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
    deviceInfo: z
      .object({
        browser: z.string().optional(),
        os: z.string().optional(),
        device: z.string().optional(),
      })
      .optional(),
  }),
});

// OAuth login schema
export const oauthLoginSchema = z.object({
  body: z.object({
    provider: OAuthProviderSchema,
    accessToken: z.string().min(1),
    idToken: z.string().optional(),
  }),
});

// Refresh token schema
export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1),
  }),
});

// Change password schema
export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z
      .string()
      .min(8)
      .max(100)
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  }),
});

// Forgot password schema
export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().min(1).email('Invalid email format'),
  }),
});

// Reset password schema
export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1),
    newPassword: z
      .string()
      .min(8)
      .max(100)
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  }),
});

// Verify email schema
export const verifyEmailSchema = z.object({
  body: z.object({
    token: z.string().min(1),
  }),
});

// Pagination schema
export const paginationSchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1))
      .pipe(z.number().min(1)),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 20))
      .pipe(z.number().min(1).max(100)),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
});

// UUID parameter schema
export const uuidParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid ID format'),
  }),
});

// Email parameter schema
export const emailParamSchema = z.object({
  params: z.object({
    email: z.string().email('Invalid email format'),
  }),
});

// Update user schema
export const updateUserSchema = z.object({
  body: z.object({
    firstName: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
    phone: z
      .string()
      .regex(/^\+?[1-9]\d{1,14}$/)
      .optional(),
    avatarUrl: z.string().url().optional(),
  }),
});

// Update role schema (admin only)
export const updateRoleSchema = z.object({
  body: z.object({
    role: UserRoleSchema,
  }),
});

// Device info schema
export const deviceInfoSchema = z.object({
  browser: z.string().optional(),
  os: z.string().optional(),
  device: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OAuthLoginInput = z.infer<typeof oauthLoginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

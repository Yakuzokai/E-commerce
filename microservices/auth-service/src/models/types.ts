/**
 * Type Definitions for Auth Service
 */

export type UserRole = 'customer' | 'premium_user' | 'seller' | 'senior_seller' | 'support' | 'admin';
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'banned';
export type OAuthProvider = 'google' | 'facebook' | 'apple';
export type VerificationTokenType = 'email_verification' | 'password_reset' | 'phone_verification';

export interface User {
  id: string;
  email: string;
  passwordHash?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  phoneVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPublic {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  role: UserRole;
}

export interface Session {
  id: string;
  userId: string;
  refreshTokenHash: string;
  deviceInfo?: {
    browser?: string;
    os?: string;
    device?: string;
  };
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface OAuthAccount {
  id: string;
  userId: string;
  provider: OAuthProvider;
  providerUserId: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  createdAt: Date;
}

export interface APIKey {
  id: string;
  name: string;
  keyHash: string;
  serviceName: string;
  permissions: string[];
  lastUsedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
}

export interface VerificationToken {
  id: string;
  userId: string;
  type: VerificationTokenType;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
}

export interface LoginHistory {
  id: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: Record<string, any>;
  success: boolean;
  failureReason?: string;
  createdAt: Date;
}

// Request/Response DTOs
export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  deviceInfo?: {
    browser?: string;
    os?: string;
    device?: string;
  };
}

export interface OAuthLoginRequest {
  provider: OAuthProvider;
  accessToken: string;
  idToken?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface AuthResponse {
  user: UserPublic;
  tokens: TokenResponse;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface VerifyEmailRequest {
  token: string;
}

// JWT Payload
export interface JWTPayload {
  sub: string; // User ID
  email: string;
  role: UserRole;
  permissions: string[];
  iat: number;
  exp: number;
  iss: string;
  jti: string;
}

export interface RefreshTokenPayload {
  sub: string; // User ID
  sessionId: string;
  type: 'refresh';
  iat: number;
  exp: number;
  iss: string;
  jti: string;
}

// API Key Payload (for service-to-service)
export interface APIKeyPayload {
  sub: string; // Service name
  serviceId: string;
  type: 'api_key';
  permissions: string[];
  iat: number;
  exp: number;
  iss: string;
  jti: string;
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export type UserStatus = 'active' | 'inactive' | 'suspended' | 'banned';
export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';
export type AddressType = 'shipping' | 'billing' | 'both';

export interface User {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  gender?: Gender;
  dateOfBirth?: Date;
  status: UserStatus;
  isVerified: boolean;
  isSeller: boolean;
  sellerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  id: string;
  userId: string;
  type: AddressType;
  label?: string;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  userId: string;
  language: string;
  currency: string;
  notificationsEmail: boolean;
  notificationsSms: boolean;
  notificationsPush: boolean;
  newsletter: boolean;
  marketingEmails: boolean;
  updatedAt: Date;
}

export interface CreateAddressRequest {
  type: AddressType;
  label?: string;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  gender?: Gender;
  dateOfBirth?: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

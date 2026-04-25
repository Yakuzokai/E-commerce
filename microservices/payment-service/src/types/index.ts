export type PaymentMethod = 'credit_card' | 'debit_card' | 'paypal' | 'bank_transfer' | 'wallet';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';
export type Currency = 'USD' | 'EUR' | 'GBP' | 'CNY' | 'VND';

export interface Payment {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: Currency;
  status: PaymentStatus;
  method: PaymentMethod;
  provider: string;
  providerTransactionId?: string;
  description?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: Currency;
  status: string;
  returnUrl: string;
}

export interface Refund {
  id: string;
  paymentId: string;
  orderId: string;
  amount: number;
  reason: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  providerRefundId?: string;
  createdAt: Date;
  processedAt?: Date;
}

export interface PaymentMethodDetails {
  type: PaymentMethod;
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  email?: string;
}

export interface CreatePaymentRequest {
  orderId: string;
  userId: string;
  amount: number;
  currency: Currency;
  method: PaymentMethod;
  description?: string;
  metadata?: Record<string, any>;
}

export interface CreateRefundRequest {
  paymentId: string;
  amount?: number;
  reason: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

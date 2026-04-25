/**
 * Type Definitions - Order Service
 */

export type OrderStatus = 'pending' | 'processing' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
export type OrderItemStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'returned';
export type ReturnStatus = 'requested' | 'approved' | 'rejected' | 'received' | 'completed';
export type ReturnResolution = 'refund' | 'replacement' | 'store_credit';

export interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  isDefault?: boolean;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  sellerId: string;
  status: OrderStatus;
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  paymentMethod?: string;
  paymentStatus: PaymentStatus;
  shippingAddress: Address;
  billingAddress?: Address;
  notes?: string;
  estimatedDelivery?: string;
  shippedAt?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  variantId?: string;
  sellerId: string;
  productName: string;
  variantName?: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  subtotal: number;
  itemStatus: OrderItemStatus;
  createdAt: string;
}

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  status: OrderStatus;
  description?: string;
  changedBy?: string;
  createdAt: string;
}

export interface OrderShipment {
  id: string;
  orderId: string;
  sellerId: string;
  trackingNumber?: string;
  carrier?: string;
  shippingMethod?: string;
  shippedAt?: string;
  estimatedDelivery?: string;
  deliveredAt?: string;
  createdAt: string;
}

export interface Return {
  id: string;
  orderId: string;
  orderItemId?: string;
  reason: string;
  description?: string;
  status: ReturnStatus;
  resolution?: ReturnResolution;
  refundAmount?: number;
  approvedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface Voucher {
  id: string;
  code: string;
  name: string;
  type: 'percentage' | 'fixed_amount';
  value: number;
  minOrderAmount: number;
  maxDiscount?: number;
  usageLimit?: number;
  usedCount: number;
  userUsageLimit: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  createdAt: string;
}

// Request DTOs
export interface CreateOrderRequest {
  items: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
  }>;
  shippingAddressId: string;
  billingAddressId?: string;
  paymentMethod: string;
  voucherCode?: string;
  notes?: string;
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
  description?: string;
}

export interface CancelOrderRequest {
  reason: string;
}

export interface CreateReturnRequest {
  orderId: string;
  orderItemId?: string;
  reason: string;
  description?: string;
}

export interface ApplyVoucherRequest {
  code: string;
  orderId: string;
}

// Response types
export interface OrderWithItems extends Order {
  items: OrderItem[];
  shipments: OrderShipment[];
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

// Kafka Event Types
export interface OrderCreatedEvent {
  eventId: string;
  eventType: 'ORDER_CREATED';
  timestamp: string;
  version: string;
  data: {
    orderId: string;
    orderNumber: string;
    userId: string;
    sellerId: string;
    items: OrderItem[];
    totalAmount: number;
    shippingAddress: Address;
  };
}

export interface OrderStatusChangedEvent {
  eventId: string;
  eventType: 'ORDER_STATUS_CHANGED';
  timestamp: string;
  version: string;
  data: {
    orderId: string;
    orderNumber: string;
    oldStatus: OrderStatus;
    newStatus: OrderStatus;
    userId: string;
  };
}

export interface PaymentCompletedEvent {
  eventId: string;
  eventType: 'PAYMENT_COMPLETED';
  timestamp: string;
  version: string;
  data: {
    paymentId: string;
    orderId: string;
    amount: number;
    paymentMethod: string;
  };
}

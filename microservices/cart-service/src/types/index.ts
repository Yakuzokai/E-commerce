export interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  quantity: number;
  price: number;
  originalPrice?: number;
  name: string;
  image?: string;
  sellerId: string;
  sellerName?: string;
  variantName?: string;
  addedAt: Date;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  totalDiscount: number;
  totalPrice: number;
  appliedVouchers: AppliedVoucher[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AppliedVoucher {
  id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'free_shipping';
  value: number;
  minOrderAmount?: number;
  maxDiscount?: number;
}

export interface AddToCartRequest {
  productId: string;
  variantId?: string;
  quantity: number;
  price: number;
  originalPrice?: number;
  name: string;
  image?: string;
  sellerId: string;
  sellerName?: string;
  variantName?: string;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

export interface ApplyVoucherRequest {
  code: string;
  type: 'percentage' | 'fixed' | 'free_shipping';
  value: number;
  minOrderAmount?: number;
  maxDiscount?: number;
}

export interface CartSummary {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  savings: number;
}

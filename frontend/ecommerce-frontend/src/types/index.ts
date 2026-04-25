// Type definitions for E-Commerce Platform

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  role: 'customer' | 'premium_user' | 'seller' | 'senior_seller' | 'support' | 'admin';
}

export interface Product {
  id: string;
  sellerId: string;
  categoryId?: string;
  brandId?: string;
  name: string;
  slug: string;
  description?: string;
  condition?: 'new' | 'refurbished' | 'used';
  status: 'draft' | 'pending' | 'active' | 'inactive' | 'deleted';
  ratingAvg: number;
  ratingCount: number;
  reviewCount: number;
  soldCount: number;
  viewCount: number;
  wishlistCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  name?: string;
  price: number;
  originalPrice?: number;
  costPrice?: number;
  stockQuantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
  weightKg?: number;
  isActive: boolean;
}

export interface ProductImage {
  id: string;
  productId: string;
  variantId?: string;
  url: string;
  thumbnailUrl?: string;
  sortOrder: number;
  isPrimary: boolean;
}

export interface ProductDetail extends Product {
  variants: ProductVariant[];
  images: ProductImage[];
  category?: Category;
  brand?: Brand;
  attributes: Record<string, string>;
  flashSale?: FlashSaleItem;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
  level: number;
  path?: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  description?: string;
  isVerified: boolean;
}

export interface FlashSaleItem {
  id: string;
  flashSaleId: string;
  productId: string;
  variantId?: string;
  flashPrice: number;
  originalPrice: number;
  stockQuantity: number;
  soldQuantity: number;
  purchaseLimit: number;
}

export interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  quantity: number;
  product?: ProductDetail;
  variant?: ProductVariant;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  subtotal: number;
  totalItems: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  sellerId: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod?: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  shippingAddress: Address;
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  id?: string;
  street: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  isDefault?: boolean;
}

export interface AuthResponse {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: 'Bearer';
  };
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

export interface Review {
  id: string;
  productId: string;
  userId: string;
  user?: User;
  rating: number;
  title?: string;
  content: string;
  images?: string[];
  helpfulCount: number;
  createdAt: string;
}

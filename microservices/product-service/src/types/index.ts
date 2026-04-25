/**
 * Type Definitions for Product Service
 */

export type ProductStatus = 'draft' | 'pending' | 'active' | 'inactive' | 'deleted';
export type ProductCondition = 'new' | 'refurbished' | 'used';

export interface Product {
  id: string;
  sellerId: string;
  categoryId?: string;
  brandId?: string;
  name: string;
  slug: string;
  description?: string;
  condition?: ProductCondition;
  status: ProductStatus;
  ratingAvg: number;
  ratingCount: number;
  reviewCount: number;
  soldCount: number;
  viewCount: number;
  wishlistCount: number;
  createdAt: Date;
  updatedAt: Date;
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
  createdAt: Date;
  updatedAt: Date;
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

export interface FlashSale {
  id: string;
  name: string;
  startTime: Date;
  endTime: Date;
  status: 'scheduled' | 'active' | 'ended';
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

// Request/Response DTOs
export interface CreateProductRequest {
  name: string;
  description?: string;
  categoryId?: string;
  brandId?: string;
  condition?: ProductCondition;
  variants: Array<{
    sku: string;
    name?: string;
    price: number;
    originalPrice?: number;
    stockQuantity: number;
    weightKg?: number;
  }>;
  images?: Array<{
    url: string;
    thumbnailUrl?: string;
    isPrimary?: boolean;
  }>;
  attributes?: Record<string, string>;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  categoryId?: string;
  brandId?: string;
  condition?: ProductCondition;
  status?: ProductStatus;
}

export interface ProductFilters {
  categoryId?: string;
  brandId?: string;
  sellerId?: string;
  status?: ProductStatus;
  minPrice?: number;
  maxPrice?: number;
  condition?: ProductCondition;
  search?: string;
  sortBy?: 'price' | 'rating' | 'sold' | 'created' | 'name';
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

export interface ProductDetail extends Product {
  variants: ProductVariant[];
  images: ProductImage[];
  category?: Category;
  brand?: Brand;
  attributes: Record<string, string>;
  flashSale?: FlashSaleItem;
}

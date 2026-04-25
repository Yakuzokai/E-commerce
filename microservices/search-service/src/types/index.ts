export interface ProductDocument {
  id: string;
  name: string;
  description: string;
  shortDescription?: string;
  category: string;
  subcategory?: string;
  brand?: string;
  sellerId: string;
  sellerName?: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  rating: number;
  reviewCount: number;
  soldCount: number;
  stock: number;
  isActive: boolean;
  isFeatured?: boolean;
  isFlashSale?: boolean;
  flashSaleEndTime?: Date;
  tags: string[];
  variants: VariantDocument[];
  images: string[];
  attributes: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

export interface VariantDocument {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  attributes: Record<string, string>;
  image?: string;
}

export interface SearchRequest {
  query: string;
  page?: number;
  limit?: number;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'popularity' | 'newest';
  filters?: {
    inStock?: boolean;
    freeShipping?: boolean;
    flashSale?: boolean;
  };
}

export interface SearchResult {
  products: ProductDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  aggregations: SearchAggregations;
  took: number;
}

export interface SearchAggregations {
  categories: CategoryBucket[];
  brands: BrandBucket[];
  priceRanges: PriceRangeBucket[];
  ratings: RatingBucket[];
}

export interface CategoryBucket {
  key: string;
  docCount: number;
}

export interface BrandBucket {
  key: string;
  docCount: number;
}

export interface PriceRangeBucket {
  key: string;
  from: number;
  to?: number;
  docCount: number;
}

export interface RatingBucket {
  key: number;
  docCount: number;
}

export interface Suggestion {
  text: string;
  score: number;
  type: 'product' | 'category' | 'brand';
}

export interface AutocompleteResult {
  suggestions: Suggestion[];
  took: number;
}

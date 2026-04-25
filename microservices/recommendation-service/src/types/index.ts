export type RecommendationType =
  | 'trending'
  | 'personalized'
  | 'similar'
  | 'frequently_bought_together'
  | 'new_arrivals'
  | 'flash_sale'
  | 'based_on_history';

export interface ProductRecommendation {
  productId: string;
  score: number;
  reason: string;
  type: RecommendationType;
}

export interface UserBehaviorEvent {
  userId: string;
  productId: string;
  eventType: 'view' | 'click' | 'add_to_cart' | 'purchase' | 'search';
  timestamp: Date;
  metadata?: {
    category?: string;
    brand?: string;
    price?: number;
    searchQuery?: string;
  };
}

export interface TrendingProduct {
  productId: string;
  viewCount: number;
  purchaseCount: number;
  addToCartCount: number;
  score: number;
  rank: number;
}

export interface PersonalizedFeed {
  userId: string;
  recommendations: ProductRecommendation[];
  generatedAt: Date;
}

export interface FrequentlyBoughtTogether {
  productId: string;
  relatedProductIds: Array<{
    productId: string;
    frequency: number;
  }>;
}

export interface CategoryAffinity {
  userId: string;
  categoryScores: Record<string, number>;
  topCategories: string[];
}

export interface RecentlyViewedProduct {
  productId: string;
  viewedAt: Date;
  sessionId?: string;
}

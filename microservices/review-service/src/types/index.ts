export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'hidden';
export type ReviewHelpfulness = 'helpful' | 'not_helpful';

export interface Review {
  id: string;
  productId: string;
  userId: string;
  orderId: string;
  rating: number;
  title?: string;
  content: string;
  images?: string[];
  status: ReviewStatus;
  helpfulCount: number;
  notHelpfulCount: number;
  isVerifiedPurchase: boolean;
  createdAt: Date;
  updatedAt: Date;
  responseFromSeller?: SellerResponse;
}

export interface SellerResponse {
  id: string;
  reviewId: string;
  sellerId: string;
  sellerName?: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Question {
  id: string;
  productId: string;
  userId: string;
  content: string;
  status: 'active' | 'answered' | 'hidden';
  answerCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Answer {
  id: string;
  questionId: string;
  userId: string;
  sellerId?: string;
  content: string;
  isOfficial: boolean;
  helpfulCount: number;
  createdAt: Date;
}

export interface ReviewVote {
  id: string;
  reviewId: string;
  userId: string;
  vote: ReviewHelpfulness;
  createdAt: Date;
}

export interface CreateReviewRequest {
  productId: string;
  orderId: string;
  rating: number;
  title?: string;
  content: string;
  images?: string[];
}

export interface ProductRatingSummary {
  productId: string;
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

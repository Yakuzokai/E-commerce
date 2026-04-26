export interface UserBehavior {
  userId: string;
  productId: string;
  action: 'view' | 'click' | 'cart' | 'purchase' | 'wishlist';
  timestamp: Date;
  sessionId: string;
  metadata?: Record<string, any>;
}

export interface ProductEmbedding {
  productId: string;
  embedding: number[];
  category: string;
  price: number;
  popularity: number;
}

export interface UserEmbedding {
  userId: string;
  embedding: number[];
  preferences: string[];
  purchaseHistory: string[];
}

export interface RecommendationResult {
  productId: string;
  score: number;
  reason: 'collaborative' | 'content' | 'popular' | 'personalized';
  metadata?: Record<string, any>;
}

export interface MatrixFactorizationModel {
  userFactors: Map<string, number[]>;
  productFactors: Map<string, number[]>;
  biases: {
    user: Map<string, number>;
    product: Map<string, number>;
    global: number;
  };
  trainedAt: Date;
  metrics: {
    rmse: number;
    mae: number;
    precision: number;
    recall: number;
  };
}

export interface TrainingJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  metrics?: Record<string, number>;
  error?: string;
}
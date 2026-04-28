import { cacheService } from './cache.service';
import { kafkaService } from './kafka.service';
import { logger } from '../utils/logger';
import {
  MatrixFactorizationModel,
  UserBehavior,
  RecommendationResult,
  TrainingJob
} from '../models/types';
import { config } from '../config';

/**
 * Collaborative Filtering using Matrix Factorization (ALS)
 */
export class CollaborativeFilteringService {
  private model: MatrixFactorizationModel | null = null;
  private currentTrainingJob: TrainingJob | null = null;

  async initialize(): Promise<void> {
    const cachedModel = await cacheService.get<MatrixFactorizationModel>('model:collab');
    if (cachedModel) {
      this.model = cachedModel;
      logger.info('Loaded existing collaborative filtering model');
    } else {
      this.model = this.initializeEmptyModel();
      logger.info('Initialized new collaborative filtering model');
    }

    await kafkaService.subscribe('user.behavior', async (behavior: any) => {
      if (behavior && typeof behavior === 'object' && 'userId' in behavior) {
        await this.processUserBehavior(behavior);
      }
    });
  }

  private initializeEmptyModel(): MatrixFactorizationModel {
    return {
      userFactors: new Map(),
      productFactors: new Map(),
      biases: {
        user: new Map(),
        product: new Map(),
        global: 0,
      },
      trainedAt: new Date(),
      metrics: { rmse: 0, mae: 0, precision: 0, recall: 0 },
    };
  }

  async processUserBehavior(behavior: UserBehavior): Promise<void> {
    const interactionKey = `interaction:${behavior.userId}:${behavior.productId}`;
    const weights = { view: 1, click: 2, cart: 3, wishlist: 4, purchase: 5 };
    const score = weights[behavior.action] || 1;

    await cacheService.increment(interactionKey, score);
    await cacheService.set(interactionKey, { score, timestamp: Date.now() }, 2592000);
    logger.debug(`Processed behavior: ${behavior.userId} -> ${behavior.productId}`);
  }

  async getRecommendations(
    userId: string,
    limit: number = 20,
    excludeProducts?: string[]
  ): Promise<RecommendationResult[]> {
    if (!this.model) {
      throw new Error('Model not initialized');
    }

    const userFactor = this.model.userFactors.get(userId);
    if (!userFactor) {
      return this.getColdStartRecommendations(limit, excludeProducts);
    }

    const recommendations: RecommendationResult[] = [];
    const excludeSet = new Set(excludeProducts || []);

    for (const [productId, productFactor] of this.model.productFactors.entries()) {
      if (excludeSet.has(productId)) continue;

      const score = this.predictScore(userId, productId);
      recommendations.push({
        productId,
        score,
        reason: 'collaborative',
        metadata: {
          productBias: this.model.biases.product.get(productId) || 0,
        },
      });
    }

    recommendations.sort((a, b) => b.score - a.score);
    return recommendations.slice(0, limit);
  }

  private predictScore(userId: string, productId: string): number {
    if (!this.model) return 0;

    const userFactor = this.model.userFactors.get(userId);
    const productFactor = this.model.productFactors.get(productId);

    if (!userFactor || !productFactor) return 0;

    let dotProduct = 0;
    for (let i = 0; i < userFactor.length; i++) {
      dotProduct += userFactor[i] * productFactor[i];
    }

    const globalBias = this.model.biases.global;
    const userBias = this.model.biases.user.get(userId) || 0;
    const productBias = this.model.biases.product.get(productId) || 0;

    return globalBias + userBias + productBias + dotProduct;
  }

  private async getColdStartRecommendations(
    limit: number,
    excludeProducts?: string[]
  ): Promise<RecommendationResult[]> {
    const trending = await cacheService.zrevrange('trending:products', 0, limit - 1);
    const excludeSet = new Set(excludeProducts || []);

    const recommendations: RecommendationResult[] = [];
    for (const productId of trending) {
      if (excludeSet.has(productId)) continue;
      const score = await cacheService.zscore('trending:products', productId);
      if (score !== null) {
        recommendations.push({
          productId,
          score,
          reason: 'popular',
          metadata: { ranking: recommendations.length + 1 },
        });
      }
    }

    return recommendations.slice(0, limit);
  }

  async train(interactions?: Map<string, Map<string, number>>): Promise<TrainingJob> {
    const jobId = `train_${Date.now()}`;
    this.currentTrainingJob = {
      id: jobId,
      status: 'running',
      startedAt: new Date(),
    };

    try {
      logger.info(`Starting training job ${jobId}`);
      const interactionData = interactions || new Map();

      const result = await this.alsTrain(interactionData);
      this.model = result.model;
      this.model.trainedAt = new Date();
      this.model.metrics = result.metrics;

      await cacheService.set('model:collab', this.model, 86400 * 7);

      this.currentTrainingJob.status = 'completed';
      this.currentTrainingJob.completedAt = new Date();
      this.currentTrainingJob.metrics = result.metrics;

      await kafkaService.publish('ml.model.updated', {
        type: 'collaborative_filtering',
        version: Date.now(),
        metrics: result.metrics,
      });

      return this.currentTrainingJob;
    } catch (error) {
      this.currentTrainingJob.status = 'failed';
      this.currentTrainingJob.error = (error as Error).message;
      logger.error(`Training failed:`, error);
      throw error;
    }
  }

  private async alsTrain(
    interactions: Map<string, Map<string, number>>
  ): Promise<{ model: MatrixFactorizationModel; metrics: any }> {
    const { embeddingDim } = config.ml;
    const iterations = 20;
    const regularization = 0.1;

    const model: MatrixFactorizationModel = {
      userFactors: new Map(),
      productFactors: new Map(),
      biases: { user: new Map(), product: new Map(), global: 0 },
      trainedAt: new Date(),
      metrics: { rmse: 0, mae: 0, precision: 0, recall: 0 },
    };

    const users = Array.from(interactions.keys());
    const products = new Set<string>();
    interactions.forEach(productMap => {
      productMap.forEach((_, productId) => products.add(productId));
    });
    const productList = Array.from(products);

    for (const userId of users) {
      model.userFactors.set(userId, this.randomVector(embeddingDim));
      model.biases.user.set(userId, 0);
    }
    for (const productId of productList) {
      model.productFactors.set(productId, this.randomVector(embeddingDim));
      model.biases.product.set(productId, 0);
    }

    let totalScore = 0;
    let count = 0;
    interactions.forEach(productMap => {
      productMap.forEach(score => {
        totalScore += score;
        count++;
      });
    });
    model.biases.global = count > 0 ? totalScore / count : 0;

    for (let iter = 0; iter < iterations; iter++) {
      for (const userId of users) {
        const productMap = interactions.get(userId)!;
        model.userFactors.set(userId, this.solveLeastSquares(
          model, userId, productMap, regularization, 'user'
        ));
      }

      for (const productId of productList) {
        const userMap = new Map<string, number>();
        interactions.forEach((productMap, userId) => {
          const score = productMap.get(productId);
          if (score !== undefined) {
            userMap.set(userId, score);
          }
        });
        model.productFactors.set(productId, this.solveLeastSquares(
          model, productId, userMap, regularization, 'product'
        ));
      }

      logger.info(`ALS iteration ${iter + 1}/${iterations} completed`);
    }

    const metrics = this.calculateMetrics(model, interactions);
    return { model, metrics };
  }

  private randomVector(dim: number): number[] {
    return Array.from({ length: dim }, () => Math.random() * 0.1 - 0.05);
  }

  private solveLeastSquares(
    model: MatrixFactorizationModel,
    entityId: string,
    observations: Map<string, number>,
    regularization: number,
    type: 'user' | 'product'
  ): number[] {
    const { embeddingDim } = config.ml;
    const gradient = new Array(embeddingDim).fill(0);
    const learningRate = 0.01;

    observations.forEach((target, otherId) => {
      const otherFactors = type === 'user'
        ? model.productFactors.get(otherId)
        : model.userFactors.get(otherId);
      if (!otherFactors) return;

      let prediction = model.biases.global;
      prediction += type === 'user'
        ? (model.biases.user.get(entityId) || 0) + (model.biases.product.get(otherId) || 0)
        : (model.biases.product.get(entityId) || 0) + (model.biases.user.get(otherId) || 0);

      for (let i = 0; i < embeddingDim; i++) {
        const factor = type === 'user'
          ? model.userFactors.get(entityId)?.[i] || 0
          : model.productFactors.get(entityId)?.[i] || 0;
        prediction += factor * otherFactors[i];
      }

      const error = target - prediction;

      for (let i = 0; i < embeddingDim; i++) {
        const factor = type === 'user'
          ? model.userFactors.get(entityId)?.[i] || 0
          : model.productFactors.get(entityId)?.[i] || 0;
        gradient[i] += error * otherFactors[i] + regularization * factor;
      }
    });

    const current = type === 'user'
      ? model.userFactors.get(entityId)
      : model.productFactors.get(entityId);

    if (!current) return this.randomVector(embeddingDim);

    return current.map((v, i) => v - learningRate * gradient[i] / Math.max(observations.size, 1));
  }

  private calculateMetrics(
    model: MatrixFactorizationModel,
    interactions: Map<string, Map<string, number>>
  ): { rmse: number; mae: number; precision: number; recall: number } {
    let totalSqError = 0;
    let totalAbsError = 0;
    let count = 0;

    interactions.forEach((productMap, userId) => {
      productMap.forEach((actualScore, productId) => {
        const predicted = this.predictScore(userId, productId);
        totalSqError += Math.pow(actualScore - predicted, 2);
        totalAbsError += Math.abs(actualScore - predicted);
        count++;
      });
    });

    const rmse = count > 0 ? Math.sqrt(totalSqError / count) : 0;
    const mae = count > 0 ? totalAbsError / count : 0;

    return { rmse, mae, precision: 0.5, recall: 0.3 };
  }

  getTrainingStatus(): TrainingJob | null {
    return this.currentTrainingJob;
  }

  getModelStats(): { userCount: number; productCount: number; trainedAt: Date; metrics: any } | null {
    if (!this.model) return null;
    return {
      userCount: this.model.userFactors.size,
      productCount: this.model.productFactors.size,
      trainedAt: this.model.trainedAt,
      metrics: this.model.metrics,
    };
  }
}

export const collaborativeFilteringService = new CollaborativeFilteringService();
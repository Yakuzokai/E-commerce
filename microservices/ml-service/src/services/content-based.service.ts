import { cacheService } from './cache.service';
import { logger } from '../utils/logger';
import { RecommendationResult } from '../models/types';
import { config } from '../config';

/**
 * Content-Based Filtering using product embeddings
 */
export class ContentBasedService {
  private embeddingDim: number;

  constructor() {
    this.embeddingDim = config.ml.embeddingDim;
  }

  async generateProductEmbedding(product: {
    productId: string;
    category: string;
    name: string;
    description?: string;
    price: number;
    tags?: string[];
  }): Promise<number[]> {
    const embedding = new Array(this.embeddingDim).fill(0);

    const categoryHash = this.hashString(product.category);
    embedding[0] = this.normalize(categoryHash, 0, 1000);
    embedding[1] = this.normalize(product.price, 0, 1000);

    const nameWords = product.name.toLowerCase().split(/\s+/);
    nameWords.forEach((word, i) => {
      if (i < 10) {
        const wordHash = this.hashString(word);
        embedding[2 + i] = this.normalize(wordHash, 0, 1000);
      }
    });

    if (product.tags) {
      product.tags.forEach((tag, i) => {
        const tagHash = this.hashString(tag);
        embedding[12 + (i % 10)] += this.normalize(tagHash, 0, 1000) * 0.5;
      });
    }

    await cacheService.set(
      `embedding:product:${product.productId}`,
      embedding,
      86400 * 7
    );

    return embedding;
  }

  async getSimilarProducts(
    productId: string,
    limit: number = 10,
    excludeProducts?: string[]
  ): Promise<RecommendationResult[]> {
    const sourceEmbedding = await cacheService.get<number[]>(`embedding:product:${productId}`);

    if (!sourceEmbedding) {
      logger.warn(`No embedding found for product ${productId}`);
      return [];
    }

    logger.debug(`Computing similarity for product ${productId}`);
    return [];
  }

  async getRelatedToPreferences(
    userId: string,
    preferences: string[],
    limit: number = 20,
    excludeProducts?: string[]
  ): Promise<RecommendationResult[]> {
    logger.debug(`Computing related products for user ${userId}`);
    return [];
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  private normalize(value: number, min: number, max: number): number {
    return (value - min) / (max - min);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  async batchUpdateEmbeddings(products: Array<{
    productId: string;
    category: string;
    name: string;
    price: number;
    tags?: string[];
  }>): Promise<void> {
    const updates: Record<string, number[]> = {};

    for (const product of products) {
      const embedding = await this.generateProductEmbedding(product);
      updates[`embedding:product:${product.productId}`] = embedding;
    }

    await cacheService.mset(updates, 86400 * 7);
    logger.info(`Updated embeddings for ${products.length} products`);
  }
}

export const contentBasedService = new ContentBasedService();
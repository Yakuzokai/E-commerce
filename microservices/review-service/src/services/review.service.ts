/**
 * Review Service - Business Logic
 */

import { query, queryOne } from '../db';
import { Review, CreateReviewRequest, ProductRatingSummary, PaginatedResponse } from '../types';
import { publishEvent, REVIEW_TOPICS } from './kafka.service';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a review
 */
export async function createReview(userId: string, data: CreateReviewRequest): Promise<Review> {
  const id = uuidv4();

  const review = await queryOne<any>(
    `INSERT INTO reviews (id, product_id, user_id, order_id, rating, title, content, images, status, is_verified_purchase)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'approved', TRUE)
     RETURNING *`,
    [id, data.productId, userId, data.orderId, data.rating, data.title, data.content, data.images]
  );

  // Publish event
  await publishEvent(REVIEW_TOPICS.REVIEW_CREATED, {
    eventType: 'REVIEW_CREATED',
    eventId: uuidv4(),
    timestamp: new Date().toISOString(),
    version: '1.0',
    data: { review, userId },
  });

  logger.info('Review created', { reviewId: id, productId: data.productId });
  return review;
}

/**
 * Get review by ID
 */
export async function getReviewById(reviewId: string): Promise<Review | null> {
  const review = await queryOne<Review>(
    'SELECT * FROM reviews WHERE id = $1',
    [reviewId]
  );

  if (review) {
    // Get seller response if exists
    const response = await queryOne(
      'SELECT * FROM seller_responses WHERE review_id = $1',
      [reviewId]
    );
    if (response) {
      (review as any).responseFromSeller = response;
    }
  }

  return review;
}

/**
 * Get reviews for a product
 */
export async function getProductReviews(
  productId: string,
  page: number = 1,
  limit: number = 10,
  sortBy: 'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful' = 'newest'
): Promise<PaginatedResponse<Review>> {
  const offset = (page - 1) * limit;

  let orderBy = 'r.created_at DESC';
  switch (sortBy) {
    case 'oldest': orderBy = 'r.created_at ASC'; break;
    case 'highest': orderBy = 'r.rating DESC, r.created_at DESC'; break;
    case 'lowest': orderBy = 'r.rating ASC, r.created_at DESC'; break;
    case 'helpful': orderBy = 'r.helpful_count DESC, r.created_at DESC'; break;
  }

  const [reviews, countResult] = await Promise.all([
    query<Review>(
      `SELECT r.*, sr.seller_name as response_seller_name, sr.content as response_content
       FROM reviews r
       LEFT JOIN seller_responses sr ON r.id = sr.review_id
       WHERE r.product_id = $1 AND r.status = 'approved'
       ORDER BY ${orderBy}
       LIMIT $2 OFFSET $3`,
      [productId, limit, offset]
    ),
    queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM reviews WHERE product_id = $1 AND status = $2',
      [productId, 'approved']
    ),
  ]);

  // Format reviews with seller responses
  const formattedReviews = reviews.map(r => ({
    ...r,
    responseFromSeller: r.response_content ? {
      sellerName: r.response_seller_name,
      content: r.response_content,
    } : undefined,
  }));

  const total = parseInt(countResult?.count || '0');

  return {
    data: formattedReviews,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get user's reviews
 */
export async function getUserReviews(userId: string): Promise<Review[]> {
  return query<Review>(
    'SELECT * FROM reviews WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
}

/**
 * Update review
 */
export async function updateReview(
  reviewId: string,
  userId: string,
  data: { rating?: number; title?: string; content?: string; images?: string[] }
): Promise<Review | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.rating !== undefined) {
    fields.push(`rating = $${paramIndex++}`);
    values.push(data.rating);
  }
  if (data.title !== undefined) {
    fields.push(`title = $${paramIndex++}`);
    values.push(data.title);
  }
  if (data.content !== undefined) {
    fields.push(`content = $${paramIndex++}`);
    values.push(data.content);
  }
  if (data.images !== undefined) {
    fields.push(`images = $${paramIndex++}`);
    values.push(data.images);
  }

  if (fields.length === 0) return getReviewById(reviewId);

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(reviewId, userId);

  const review = await queryOne<Review>(
    `UPDATE reviews SET ${fields.join(', ')} WHERE id = $${paramIndex++} AND user_id = $${paramIndex} RETURNING *`,
    values
  );

  if (review) {
    await publishEvent(REVIEW_TOPICS.REVIEW_UPDATED, {
      eventType: 'REVIEW_UPDATED',
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
      version: '1.0',
      data: review,
    });
  }

  return review;
}

/**
 * Delete review
 */
export async function deleteReview(reviewId: string, userId: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM reviews WHERE id = $1 AND user_id = $2',
    [reviewId, userId]
  );
  return (result as any).rowCount > 0;
}

/**
 * Vote on review
 */
export async function voteOnReview(
  reviewId: string,
  userId: string,
  vote: 'helpful' | 'not_helpful'
): Promise<Review | null> {
  // Check if already voted
  const existingVote = await queryOne(
    'SELECT * FROM review_votes WHERE review_id = $1 AND user_id = $2',
    [reviewId, userId]
  );

  if (existingVote) {
    // Update existing vote
    if ((existingVote as any).vote !== vote) {
      await query(
        'UPDATE review_votes SET vote = $1 WHERE review_id = $2 AND user_id = $3',
        [vote, reviewId, userId]
      );

      // Update counts
      if (vote === 'helpful') {
        await query(
          'UPDATE reviews SET helpful_count = helpful_count + 1, not_helpful_count = not_helpful_count - 1 WHERE id = $1',
          [reviewId]
        );
      } else {
        await query(
          'UPDATE reviews SET helpful_count = helpful_count - 1, not_helpful_count = not_helpful_count + 1 WHERE id = $1',
          [reviewId]
        );
      }
    }
  } else {
    // New vote
    await query(
      'INSERT INTO review_votes (review_id, user_id, vote) VALUES ($1, $2, $3)',
      [reviewId, userId, vote]
    );

    // Update count
    const column = vote === 'helpful' ? 'helpful_count' : 'not_helpful_count';
    await query(
      `UPDATE reviews SET ${column} = ${column} + 1 WHERE id = $1`,
      [reviewId]
    );
  }

  return getReviewById(reviewId);
}

/**
 * Add seller response to review
 */
export async function addSellerResponse(
  reviewId: string,
  sellerId: string,
  sellerName: string,
  content: string
): Promise<any | null> {
  // Delete existing response if any
  await query('DELETE FROM seller_responses WHERE review_id = $1', [reviewId]);

  const response = await queryOne(
    `INSERT INTO seller_responses (review_id, seller_id, seller_name, content)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [reviewId, sellerId, sellerName, content]
  );

  logger.info('Seller response added', { reviewId, sellerId });
  return response;
}

/**
 * Get product rating summary
 */
export async function getProductRatingSummary(productId: string): Promise<ProductRatingSummary> {
  const result = await queryOne<any>(
    'SELECT * FROM product_ratings WHERE product_id = $1',
    [productId]
  );

  if (!result) {
    return {
      productId,
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  return {
    productId,
    averageRating: parseFloat(result.average_rating) || 0,
    totalReviews: parseInt(result.total_reviews) || 0,
    ratingDistribution: {
      1: parseInt(result.rating_1) || 0,
      2: parseInt(result.rating_2) || 0,
      3: parseInt(result.rating_3) || 0,
      4: parseInt(result.rating_4) || 0,
      5: parseInt(result.rating_5) || 0,
    },
  };
}

/**
 * Get multiple products rating summaries
 */
export async function getProductsRatingSummaries(productIds: string[]): Promise<ProductRatingSummary[]> {
  if (productIds.length === 0) return [];

  const placeholders = productIds.map((_, i) => `$${i + 1}`).join(', ');
  const results = await query<any>(
    `SELECT * FROM product_ratings WHERE product_id IN (${placeholders})`,
    productIds
  );

  const summariesMap = new Map(results.map(r => [r.product_id, r]));

  return productIds.map(productId => {
    const result = summariesMap.get(productId);
    if (!result) {
      return {
        productId,
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }
    return {
      productId,
      averageRating: parseFloat(result.average_rating) || 0,
      totalReviews: parseInt(result.total_reviews) || 0,
      ratingDistribution: {
        1: parseInt(result.rating_1) || 0,
        2: parseInt(result.rating_2) || 0,
        3: parseInt(result.rating_3) || 0,
        4: parseInt(result.rating_4) || 0,
        5: parseInt(result.rating_5) || 0,
      },
    };
  });
}

export default {
  createReview,
  getReviewById,
  getProductReviews,
  getUserReviews,
  updateReview,
  deleteReview,
  voteOnReview,
  addSellerResponse,
  getProductRatingSummary,
  getProductsRatingSummaries,
};

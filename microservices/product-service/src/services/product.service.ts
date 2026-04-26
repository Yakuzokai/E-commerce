/**
 * Product Service
 * Product catalog management
 */

import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../db';
import {
  Product,
  ProductVariant,
  ProductImage,
  ProductDetail,
  ProductFilters,
  PaginatedResponse,
  CreateProductRequest,
  UpdateProductRequest,
} from '../types';
import { cacheGet, cacheSet, cacheDelete, CacheKeys, CacheTTL } from './cache.service';
import { logger } from '../utils/logger';

/**
 * Create a new product
 */
export async function createProduct(
  sellerId: string,
  data: CreateProductRequest
): Promise<ProductDetail> {
  const productId = uuidv4();
  const slug = generateSlug(data.name);

  return await transaction(async (client) => {
    // Create product
    const productResult = await client.query<Product>(
      `INSERT INTO products (id, seller_id, category_id, brand_id, name, slug, description, condition, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft')
       RETURNING *`,
      [productId, sellerId, data.categoryId, data.brandId, data.name, slug, data.description, data.condition]
    );
    const product = productResult.rows[0];

    // Create variants
    const variants: ProductVariant[] = [];
    for (const variantData of data.variants) {
      const variantId = uuidv4();
      const variantResult = await client.query<ProductVariant>(
        `INSERT INTO product_variants (id, product_id, sku, name, price, original_price, stock_quantity, weight_kg)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [variantId, productId, variantData.sku, variantData.name, variantData.price, variantData.originalPrice, variantData.stockQuantity, variantData.weightKg]
      );
      variants.push(variantResult.rows[0]);
    }

    // Create images
    const images: ProductImage[] = [];
    if (data.images && data.images.length > 0) {
      for (let i = 0; i < data.images.length; i++) {
        const img = data.images[i];
        const imageId = uuidv4();
        const imageResult = await client.query<ProductImage>(
          `INSERT INTO product_images (id, product_id, url, thumbnail_url, sort_order, is_primary)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [imageId, productId, img.url, img.thumbnailUrl, i, img.isPrimary ?? i === 0]
        );
        images.push(imageResult.rows[0]);
      }
    }

    // Create attributes
    if (data.attributes) {
      for (const [key, value] of Object.entries(data.attributes)) {
        await client.query(
          `INSERT INTO product_attributes (id, product_id, attribute_name, attribute_value)
           VALUES ($1, $2, $3, $4)`,
          [uuidv4(), productId, key, value]
        );
      }
    }

    logger.info('Product created', { productId, sellerId });

    return {
      ...product,
      variants,
      images,
      category: undefined,
      brand: undefined,
      attributes: data.attributes || {},
    };
  });
}

/**
 * Get product by ID
 */
export async function getProductById(productId: string): Promise<ProductDetail | null> {
  // Check cache
  const cached = await cacheGet<ProductDetail>(CacheKeys.product(productId));
  if (cached) return cached;

  const productResult = await query<Product>(
    'SELECT * FROM products WHERE id = $1 AND deleted_at IS NULL',
    [productId]
  );

  if (productResult.rows.length === 0) return null;
  const product = productResult.rows[0];

  // Get variants
  const variantsResult = await query<ProductVariant>(
    'SELECT * FROM product_variants WHERE product_id = $1 AND is_active = true ORDER BY created_at',
    [productId]
  );

  // Get images
  const imagesResult = await query<ProductImage>(
    'SELECT * FROM product_images WHERE product_id = $1 ORDER BY sort_order',
    [productId]
  );

  // Get attributes
  const attributesResult = await query<{ attribute_name: string; attribute_value: string }>(
    'SELECT attribute_name, attribute_value FROM product_attributes WHERE product_id = $1',
    [productId]
  );

  const attributes: Record<string, string> = {};
  for (const attr of attributesResult.rows) {
    attributes[attr.attribute_name] = attr.attribute_value;
  }

  // Get category
  let category = undefined;
  if (product.categoryId) {
    const catResult = await query('SELECT * FROM categories WHERE id = $1', [product.categoryId]);
    if (catResult.rows.length > 0) category = catResult.rows[0];
  }

  // Get brand
  let brand = undefined;
  if (product.brandId) {
    const brandResult = await query('SELECT * FROM brands WHERE id = $1', [product.brandId]);
    if (brandResult.rows.length > 0) brand = brandResult.rows[0];
  }

  // Get flash sale if active
  let flashSale = undefined;
  const flashResult = await query(
    `SELECT fsi.* FROM flash_sale_items fsi
     JOIN flash_sales fs ON fsi.flash_sale_id = fs.id
     WHERE fsi.variant_id = $1 AND fs.status = 'active' AND fs.start_time <= NOW() AND fs.end_time > NOW()
     LIMIT 1`,
    [variantsResult.rows[0]?.id]
  );
  if (flashResult.rows.length > 0) flashSale = flashResult.rows[0];

  const result: ProductDetail = {
    ...product,
    variants: variantsResult.rows,
    images: imagesResult.rows,
    category,
    brand,
    attributes,
    flashSale,
  };

  // Cache for 15 minutes
  await cacheSet(CacheKeys.product(productId), result, CacheTTL.product);

  return result;
}

/**
 * Get product by slug
 */
export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const result = await query<Product>(
    'SELECT id FROM products WHERE slug = $1 AND deleted_at IS NULL',
    [slug]
  );

  if (result.rows.length === 0) return null;
  return getProductById(result.rows[0].id);
}

/**
 * List products with filters
 */
export async function listProducts(
  filters: ProductFilters,
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResponse<Product>> {
  const conditions: string[] = ['p.deleted_at IS NULL', 'p.status = $1'];
  const values: any[] = ['active'];
  let paramIndex = 2;

  if (filters.categoryId) {
    conditions.push(`p.category_id = $${paramIndex++}`);
    values.push(filters.categoryId);
  }

  if (filters.brandId) {
    conditions.push(`p.brand_id = $${paramIndex++}`);
    values.push(filters.brandId);
  }

  if (filters.sellerId) {
    conditions.push(`p.seller_id = $${paramIndex++}`);
    values.push(filters.sellerId);
  }

  if (filters.minPrice !== undefined) {
    conditions.push(`(SELECT MIN(price) FROM product_variants WHERE product_id = p.id) >= $${paramIndex++}`);
    values.push(filters.minPrice);
  }

  if (filters.maxPrice !== undefined) {
    conditions.push(`(SELECT MIN(price) FROM product_variants WHERE product_id = p.id) <= $${paramIndex++}`);
    values.push(filters.maxPrice);
  }

  if (filters.condition) {
    conditions.push(`p.condition = $${paramIndex++}`);
    values.push(filters.condition);
  }

  if (filters.search) {
    conditions.push(`(p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`);
    values.push(`%${filters.search}%`);
    paramIndex++;
  }

  // Sort mapping
  let sortField = 'created_at';
  let order = filters.sortOrder?.toUpperCase() || 'DESC';

  switch (filters.sortBy) {
    case 'popular':
      sortField = '(sold_count * 2 + view_count)';
      break;
    case 'latest':
      sortField = 'created_at';
      break;
    case 'price_asc':
      sortField = 'min_price';
      order = 'ASC';
      break;
    case 'price_desc':
      sortField = 'min_price';
      order = 'DESC';
      break;
    case 'rating':
      sortField = 'rating_avg';
      break;
    case 'sold':
      sortField = 'sold_count';
      break;
    default:
      sortField = 'created_at';
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // Count total
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM products p ${whereClause}`,
    values
  );
  const total = parseInt(countResult.rows[0].count);

  // Get products
  const offset = (page - 1) * limit;
  const limitIndex = paramIndex++;
  const offsetIndex = paramIndex++;
  values.push(limit, offset);

  // Get products with primary image and min price
  const result = await query<any>(
    `SELECT p.*, 
            (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) as primary_image,
            (SELECT MIN(price) FROM product_variants WHERE product_id = p.id) as min_price,
            (SELECT MIN(original_price) FROM product_variants WHERE product_id = p.id) as min_original_price
     FROM products p ${whereClause}
     ORDER BY ${sortField} ${order}
     LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
    values
  );

  // Map database rows to the format expected by the frontend
  const products = result.rows.map((row: any) => ({
    ...row,
    images: row.primary_image ? [{ url: row.primary_image, is_primary: true }] : [],
    variants: [{ price: parseFloat(row.min_price), originalPrice: row.min_original_price ? parseFloat(row.min_original_price) : undefined }]
  }));

  return {
    data: products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  };
}

/**
 * Update product
 */
export async function updateProduct(
  productId: string,
  sellerId: string,
  data: UpdateProductRequest
): Promise<Product | null> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(data.name);
    updates.push(`slug = $${paramIndex++}`);
    values.push(generateSlug(data.name));
  }
  if (data.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(data.description);
  }
  if (data.categoryId !== undefined) {
    updates.push(`category_id = $${paramIndex++}`);
    values.push(data.categoryId);
  }
  if (data.brandId !== undefined) {
    updates.push(`brand_id = $${paramIndex++}`);
    values.push(data.brandId);
  }
  if (data.condition !== undefined) {
    updates.push(`condition = $${paramIndex++}`);
    values.push(data.condition);
  }
  if (data.status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    values.push(data.status);
  }

  if (updates.length === 0) return getProductById(productId);

  updates.push(`updated_at = NOW()`);
  values.push(productId, sellerId);

  const result = await query<Product>(
    `UPDATE products SET ${updates.join(', ')}
     WHERE id = $${paramIndex++} AND seller_id = $${paramIndex}
     AND deleted_at IS NULL
     RETURNING *`,
    values
  );

  if (result.rows.length === 0) return null;

  // Invalidate cache
  await cacheDelete(CacheKeys.product(productId));

  logger.info('Product updated', { productId });

  return result.rows[0];
}

/**
 * Update product stock
 */
export async function updateStock(
  variantId: string,
  quantity: number
): Promise<boolean> {
  const result = await query(
    `UPDATE product_variants
     SET stock_quantity = stock_quantity + $1, updated_at = NOW()
     WHERE id = $2
     RETURNING product_id`,
    [quantity, variantId]
  );

  if (result.rows.length === 0) return false;

  // Invalidate cache
  await cacheDelete(CacheKeys.product(result.rows[0].product_id));

  return true;
}

/**
 * Reserve stock for order
 */
export async function reserveStock(
  items: Array<{ variantId: string; quantity: number }>
): Promise<boolean> {
  return await transaction(async (client) => {
    for (const item of items) {
      const result = await client.query(
        `UPDATE product_variants
         SET reserved_quantity = reserved_quantity + $1
         WHERE id = $2 AND stock_quantity - reserved_quantity >= $1
         RETURNING id`,
        [item.quantity, item.variantId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Insufficient stock for variant ${item.variantId}`);
      }
    }
    return true;
  });
}

/**
 * Increment view count
 */
export async function incrementViewCount(productId: string): Promise<void> {
  await query(
    'UPDATE products SET view_count = view_count + 1 WHERE id = $1',
    [productId]
  );
}

/**
 * Increment sold count
 */
export async function incrementSoldCount(
  productId: string,
  quantity: number
): Promise<void> {
  await query(
    'UPDATE products SET sold_count = sold_count + $1 WHERE id = $2',
    [quantity, productId]
  );
}

/**
 * Delete product (soft delete)
 */
export async function deleteProduct(productId: string, sellerId: string): Promise<boolean> {
  const result = await query(
    `UPDATE products SET deleted_at = NOW(), status = 'deleted'
     WHERE id = $1 AND seller_id = $2 AND deleted_at IS NULL`,
    [productId, sellerId]
  );

  if (result.rowCount === 0) return false;

  // Invalidate cache
  await cacheDelete(CacheKeys.product(productId));

  return true;
}

/**
 * Get trending products
 */
export async function getTrendingProducts(limit: number = 20): Promise<Product[]> {
  const cacheKey = `products:trending:${limit}`;
  const cached = await cacheGet<Product[]>(cacheKey);
  if (cached) return cached;

  const result = await query<Product>(
    `SELECT * FROM products
     WHERE status = 'active' AND deleted_at IS NULL
     ORDER BY (sold_count * 2 + view_count) DESC
     LIMIT $1`,
    [limit]
  );

  await cacheSet(cacheKey, result.rows, CacheTTL.trending);

  return result.rows;
}

/**
 * Get flash sale products
 */
export async function getFlashSaleProducts(): Promise<any[]> {
  const cacheKey = 'products:flash_sale';
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const result = await query(
    `SELECT p.*, fsi.flash_price, fsi.original_price, fsi.stock_quantity, fsi.sold_quantity,
            fs.start_time, fs.end_time, fs.name as flash_sale_name
     FROM products p
     JOIN flash_sale_items fsi ON p.id = fsi.product_id
     JOIN flash_sales fs ON fsi.flash_sale_id = fs.id
     WHERE p.status = 'active' AND p.deleted_at IS NULL
     AND fs.status = 'active'
     AND fs.start_time <= NOW() AND fs.end_time > NOW()
     AND fsi.stock_quantity > fsi.sold_quantity
     ORDER BY fs.end_time ASC`,
    []
  );

  await cacheSet(cacheKey, result.rows, 60); // 1 minute cache

  return result.rows;
}

/**
 * List all categories
 */
export async function listCategories(): Promise<any[]> {
  const result = await query('SELECT * FROM categories WHERE is_active = true ORDER BY name ASC');
  return result.rows;
}

/**
 * Generate slug from name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100) + '-' + Date.now().toString(36);
}

export default {
  createProduct,
  getProductById,
  getProductBySlug,
  listProducts,
  updateProduct,
  updateStock,
  reserveStock,
  incrementViewCount,
  incrementSoldCount,
  deleteProduct,
  getTrendingProducts,
  getFlashSaleProducts,
};

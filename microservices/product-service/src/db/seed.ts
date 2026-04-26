/**
 * Massive Seeding script for Product Service
 * Generates 10 categories and 200 products per category (2,000 total)
 */

import { v4 as uuidv4 } from 'uuid';
import { query, closePool, transaction } from './index';
import { logger } from '../utils/logger';

async function seed() {
  logger.info('Starting massive database seeding...');

  try {
    await transaction(async (client) => {
      // 1. Clear existing data
      logger.info('Clearing old data...');
      await client.query('DELETE FROM flash_sale_items');
      await client.query('DELETE FROM flash_sales');
      await client.query('DELETE FROM product_images');
      await client.query('DELETE FROM product_variants');
      await client.query('DELETE FROM product_attributes');
      await client.query('DELETE FROM products');
      await client.query('DELETE FROM categories');
      await client.query('DELETE FROM brands');

      // 2. Seed Categories (10)
      logger.info('Seeding 10 categories...');
      const categoriesData = [
        { name: 'Electronics', slug: 'electronics' },
        { name: 'Fashion', slug: 'fashion' },
        { name: 'Home & Living', slug: 'home-living' },
        { name: 'Beauty', slug: 'beauty' },
        { name: 'Sports', slug: 'sports' },
        { name: 'Automotive', slug: 'automotive' },
        { name: 'Books', slug: 'books' },
        { name: 'Toys & Games', slug: 'toys' },
        { name: 'Health', slug: 'health' },
        { name: 'Groceries', slug: 'groceries' }
      ];

      const categories: any[] = [];
      for (const cat of categoriesData) {
        const id = uuidv4();
        await client.query(
          'INSERT INTO categories (id, name, slug, is_active) VALUES ($1, $2, $3, true)',
          [id, cat.name, cat.slug]
        );
        categories.push({ id, ...cat });
      }

      // 3. Seed Brands (8)
      logger.info('Seeding brands...');
      const brandsData = ['Apple', 'Samsung', 'Nike', 'Adidas', 'Sony', 'Lego', 'Toyota', 'Nestle'];
      const brands: any[] = [];
      for (const name of brandsData) {
        const id = uuidv4();
        await client.query(
          'INSERT INTO brands (id, name, slug) VALUES ($1, $2, $3)',
          [id, name, name.toLowerCase()]
        );
        brands.push({ id, name });
      }

      // 4. Seed 2,000 Products (200 per category)
      logger.info('Generating 2,000 products... this may take a few seconds');
      const sellerId = uuidv4();
      
      const images = [
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
        'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400',
        'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400',
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
        'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400'
      ];

      const suffixes = ['Pro', 'Ultra', 'Elite', 'Classic', 'Premium', 'Plus', 'Edition', 'Series', 'Max', 'X'];

      for (const cat of categories) {
        logger.info(`Seeding category: ${cat.name}...`);
        for (let i = 1; i <= 200; i++) {
          const productId = uuidv4();
          const suffix = suffixes[i % suffixes.length];
          const name = `${cat.name} ${suffix} ${i > suffixes.length ? Math.floor(i / suffixes.length) : ''}`.trim();
          const slug = `${cat.slug}-${suffix.toLowerCase()}-${i}-${uuidv4().substring(0, 5)}`;
          const brand = brands[Math.floor(Math.random() * brands.length)];
          const price = Math.floor(Math.random() * 500) + 10;
          const image = images[Math.floor(Math.random() * images.length)];

          await client.query(
            `INSERT INTO products (id, seller_id, category_id, brand_id, name, slug, description, status, condition, rating_avg, rating_count, sold_count, view_count)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [
              productId, 
              sellerId, 
              cat.id, 
              brand.id, 
              name, 
              slug, 
              `High quality ${name} from ${brand.name}.`, 
              'active', 
              'new',
              (Math.random() * 2 + 3).toFixed(2), // 3.0 to 5.0
              Math.floor(Math.random() * 1000),
              Math.floor(Math.random() * 500),
              Math.floor(Math.random() * 5000)
            ]
          );

          // Variant
          const variantId = uuidv4();
          await client.query(
            `INSERT INTO product_variants (id, product_id, sku, name, price, original_price, stock_quantity)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [variantId, productId, `SKU-${productId.substring(0, 8)}`, 'Standard', price, price * 1.2, 100]
          );

          // Image
          await client.query(
            `INSERT INTO product_images (id, product_id, url, is_primary)
             VALUES ($1, $2, $3, true)`,
            [uuidv4(), productId, image]
          );
        }
      }

      // 5. Seed one Flash Sale
      const flashSaleId = uuidv4();
      const endTime = new Date();
      endTime.setHours(endTime.getHours() + 24);
      
      await client.query(
        "INSERT INTO flash_sales (id, name, start_time, end_time, status) VALUES ($1, 'Mega Clearance', NOW(), $2, 'active')",
        [flashSaleId, endTime]
      );
    });

    logger.info('Massive seeding completed successfully! 2,000 products added.');
  } catch (error) {
    logger.error('Seeding failed', { error: (error as Error).message });
    throw error;
  } finally {
    await closePool();
  }
}

seed().then(() => process.exit(0)).catch(() => process.exit(1));

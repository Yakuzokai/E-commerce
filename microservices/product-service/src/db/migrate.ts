/**
 * Database Migration Script for Product Service
 */

import { query, closePool } from './index';
import { logger } from '../utils/logger';

const migrations = [
  {
    name: 'create_migrations_table',
    up: `CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );`,
  },
  {
    name: 'create_categories_table',
    up: `
      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        parent_id UUID REFERENCES categories(id),
        level INT DEFAULT 0,
        path TEXT,
        image_url TEXT,
        sort_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
      CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
    `,
    down: `DROP TABLE IF EXISTS categories;`,
  },
  {
    name: 'create_brands_table',
    up: `
      CREATE TABLE IF NOT EXISTS brands (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        logo_url TEXT,
        description TEXT,
        is_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_brands_slug ON brands(slug);
    `,
    down: `DROP TABLE IF EXISTS brands;`,
  },
  {
    name: 'create_products_table',
    up: `
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seller_id UUID NOT NULL,
        category_id UUID REFERENCES categories(id),
        brand_id UUID REFERENCES brands(id),
        name VARCHAR(500) NOT NULL,
        slug VARCHAR(500) NOT NULL,
        description TEXT,
        condition VARCHAR(50),
        status VARCHAR(50) DEFAULT 'draft',
        rating_avg DECIMAL(3,2) DEFAULT 0,
        rating_count INT DEFAULT 0,
        review_count INT DEFAULT 0,
        sold_count INT DEFAULT 0,
        view_count INT DEFAULT 0,
        wishlist_count INT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE,
        UNIQUE(seller_id, slug)
      );
      CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id);
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
      CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
      CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
      CREATE INDEX IF NOT EXISTS idx_products_rating ON products(rating_avg);
      CREATE INDEX IF NOT EXISTS idx_products_sold ON products(sold_count DESC);
    `,
    down: `DROP TABLE IF EXISTS products;`,
  },
  {
    name: 'create_product_variants_table',
    up: `
      CREATE TABLE IF NOT EXISTS product_variants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        sku VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255),
        price DECIMAL(12,2) NOT NULL,
        original_price DECIMAL(12,2),
        cost_price DECIMAL(12,2),
        stock_quantity INT DEFAULT 0,
        reserved_quantity INT DEFAULT 0,
        low_stock_threshold INT DEFAULT 10,
        weight_kg DECIMAL(8,3),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
      CREATE INDEX IF NOT EXISTS idx_variants_sku ON product_variants(sku);
      CREATE INDEX IF NOT EXISTS idx_variants_stock ON product_variants(stock_quantity);
    `,
    down: `DROP TABLE IF EXISTS product_variants;`,
  },
  {
    name: 'create_product_images_table',
    up: `
      CREATE TABLE IF NOT EXISTS product_images (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        variant_id UUID REFERENCES product_variants(id),
        url TEXT NOT NULL,
        thumbnail_url TEXT,
        sort_order INT DEFAULT 0,
        is_primary BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_images_product ON product_images(product_id);
      CREATE INDEX IF NOT EXISTS idx_images_variant ON product_images(variant_id);
    `,
    down: `DROP TABLE IF EXISTS product_images;`,
  },
  {
    name: 'create_product_attributes_table',
    up: `
      CREATE TABLE IF NOT EXISTS product_attributes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        attribute_name VARCHAR(100) NOT NULL,
        attribute_value TEXT NOT NULL,
        UNIQUE(product_id, attribute_name)
      );
      CREATE INDEX IF NOT EXISTS idx_attributes_product ON product_attributes(product_id);
    `,
    down: `DROP TABLE IF EXISTS product_attributes;`,
  },
  {
    name: 'create_flash_sales_table',
    up: `
      CREATE TABLE IF NOT EXISTS flash_sales (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        start_time TIMESTAMP WITH TIME ZONE NOT NULL,
        end_time TIMESTAMP WITH TIME ZONE NOT NULL,
        status VARCHAR(50) DEFAULT 'scheduled',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_flash_sales_status ON flash_sales(status);
      CREATE INDEX IF NOT EXISTS idx_flash_sales_time ON flash_sales(start_time, end_time);
    `,
    down: `DROP TABLE IF EXISTS flash_sales;`,
  },
  {
    name: 'create_flash_sale_items_table',
    up: `
      CREATE TABLE IF NOT EXISTS flash_sale_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        flash_sale_id UUID REFERENCES flash_sales(id),
        product_id UUID REFERENCES products(id),
        variant_id UUID REFERENCES product_variants(id),
        flash_price DECIMAL(12,2) NOT NULL,
        original_price DECIMAL(12,2),
        stock_quantity INT NOT NULL,
        sold_quantity INT DEFAULT 0,
        purchase_limit INT DEFAULT 1,
        UNIQUE(flash_sale_id, variant_id)
      );
      CREATE INDEX IF NOT EXISTS idx_flash_items_sale ON flash_sale_items(flash_sale_id);
      CREATE INDEX IF NOT EXISTS idx_flash_items_variant ON flash_sale_items(variant_id);
    `,
    down: `DROP TABLE IF EXISTS flash_sale_items;`,
  },
  {
    name: 'create_product_views_table',
    up: `
      CREATE TABLE IF NOT EXISTS product_views (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        user_id UUID,
        session_id VARCHAR(255),
        source VARCHAR(50),
        duration_seconds INT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_views_product ON product_views(product_id);
      CREATE INDEX IF NOT EXISTS idx_views_user ON product_views(user_id);
      CREATE INDEX IF NOT EXISTS idx_views_created ON product_views(created_at);
    `,
    down: `DROP TABLE IF EXISTS product_views;`,
  },
];

async function runMigrations() {
  logger.info('Starting product service migrations...');

  try {
    // Create migrations table
    const migrationTable = migrations.find((m) => m.name === 'create_migrations_table');
    if (migrationTable) {
      await query(migrationTable.up);
    }

    // Get executed migrations
    const executed = await query<{ name: string }>('SELECT name FROM migrations ORDER BY id');
    const executedNames = new Set(executed.rows.map((r) => r.name));

    // Run pending migrations
    for (const migration of migrations) {
      if (migration.name === 'create_migrations_table') continue;

      if (executedNames.has(migration.name)) {
        logger.info(`Migration ${migration.name} already executed, skipping...`);
        continue;
      }

      logger.info(`Running migration: ${migration.name}`);
      await query(migration.up);
      await query('INSERT INTO migrations (name) VALUES ($1)', [migration.name]);
      logger.info(`Migration ${migration.name} completed`);
    }

    logger.info('All migrations completed successfully');
  } catch (error) {
    logger.error('Migration failed', { error: (error as Error).message });
    throw error;
  }
}

if (require.main === module) {
  runMigrations()
    .then(async () => {
      await closePool();
      process.exit(0);
    })
    .catch(async (error) => {
      await closePool();
      process.exit(1);
    });
}

export { runMigrations };

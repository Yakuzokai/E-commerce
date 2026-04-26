/**
 * Database Migration Script - Order Service
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
    name: 'create_orders_table',
    up: `
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_number VARCHAR(50) UNIQUE NOT NULL,
        user_id UUID NOT NULL,
        seller_id UUID NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        subtotal DECIMAL(12,2) NOT NULL,
        discount_amount DECIMAL(12,2) DEFAULT 0,
        shipping_fee DECIMAL(12,2) DEFAULT 0,
        tax_amount DECIMAL(12,2) DEFAULT 0,
        total_amount DECIMAL(12,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        payment_method VARCHAR(50),
        payment_status VARCHAR(50) DEFAULT 'pending',
        shipping_address JSONB NOT NULL,
        billing_address JSONB,
        notes TEXT,
        estimated_delivery DATE,
        shipped_at TIMESTAMP WITH TIME ZONE,
        delivered_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE,
        cancelled_at TIMESTAMP WITH TIME ZONE,
        cancellation_reason TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
      CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders(seller_id);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
      CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
      CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
    `,
  },
  {
    name: 'create_order_items_table',
    up: `
      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
        product_id UUID NOT NULL,
        variant_id UUID,
        seller_id UUID NOT NULL,
        product_name VARCHAR(500) NOT NULL,
        variant_name VARCHAR(255),
        sku VARCHAR(100),
        quantity INT NOT NULL,
        unit_price DECIMAL(12,2) NOT NULL,
        discount_amount DECIMAL(12,2) DEFAULT 0,
        subtotal DECIMAL(12,2) NOT NULL,
        item_status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
      CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);
      CREATE INDEX IF NOT EXISTS idx_order_items_variant ON order_items(variant_id);
    `,
  },
  {
    name: 'create_order_status_history_table',
    up: `
      CREATE TABLE IF NOT EXISTS order_status_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL,
        description TEXT,
        changed_by UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history(order_id);
    `,
  },
  {
    name: 'create_order_shipments_table',
    up: `
      CREATE TABLE IF NOT EXISTS order_shipments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
        seller_id UUID NOT NULL,
        tracking_number VARCHAR(255),
        carrier VARCHAR(100),
        shipping_method VARCHAR(100),
        shipped_at TIMESTAMP WITH TIME ZONE,
        estimated_delivery DATE,
        delivered_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_order_shipments_order ON order_shipments(order_id);
      CREATE INDEX IF NOT EXISTS idx_order_shipments_tracking ON order_shipments(tracking_number);
    `,
  },
  {
    name: 'create_returns_table',
    up: `
      CREATE TABLE IF NOT EXISTS returns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID REFERENCES orders(id),
        order_item_id UUID REFERENCES order_items(id),
        reason VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'requested',
        resolution VARCHAR(50),
        refund_amount DECIMAL(12,2),
        approved_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_returns_order ON returns(order_id);
      CREATE INDEX IF NOT EXISTS idx_returns_item ON returns(order_item_id);
      CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status);
    `,
  },
  {
    name: 'create_vouchers_table',
    up: `
      CREATE TABLE IF NOT EXISTS vouchers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) DEFAULT 'percentage',
        value DECIMAL(10,2) NOT NULL,
        min_order_amount DECIMAL(12,2) DEFAULT 0,
        max_discount DECIMAL(12,2),
        usage_limit INT,
        used_count INT DEFAULT 0,
        user_usage_limit INT DEFAULT 1,
        valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
        valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);
      CREATE INDEX IF NOT EXISTS idx_vouchers_validity ON vouchers(valid_from, valid_until);
    `,
  },
  {
    name: 'create_order_vouchers_table',
    up: `
      CREATE TABLE IF NOT EXISTS order_vouchers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
        voucher_id UUID REFERENCES vouchers(id),
        discount_amount DECIMAL(12,2) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `,
  },
];

async function runMigrations() {
  logger.info('Starting order service migrations...');

  try {
    const migrationTable = migrations.find((m) => m.name === 'create_migrations_table');
    if (migrationTable) await query(migrationTable.up);

    const executed = await query<{ name: string }>('SELECT name FROM migrations ORDER BY id');
    const executedNames = new Set(executed.rows.map((r) => r.name));

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

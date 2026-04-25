import { Pool } from 'pg';
import { config } from '../config';
import { logger } from '../utils/logger';

const migrations = [
  {
    name: 'create_payments_table',
    up: `
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id VARCHAR(50) NOT NULL,
        user_id VARCHAR(50) NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'USD',
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        method VARCHAR(20) NOT NULL,
        provider VARCHAR(20) NOT NULL DEFAULT 'stripe',
        provider_transaction_id VARCHAR(100),
        description TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP WITH TIME ZONE,
        CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled')),
        CONSTRAINT valid_method CHECK (method IN ('credit_card', 'debit_card', 'paypal', 'bank_transfer', 'wallet'))
      );

      CREATE INDEX idx_payments_order_id ON payments(order_id);
      CREATE INDEX idx_payments_user_id ON payments(user_id);
      CREATE INDEX idx_payments_status ON payments(status);
      CREATE INDEX idx_payments_created_at ON payments(created_at);
    `,
  },
  {
    name: 'create_payment_methods_table',
    up: `
      CREATE TABLE IF NOT EXISTS payment_methods (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(50) NOT NULL,
        type VARCHAR(20) NOT NULL,
        provider VARCHAR(20) NOT NULL,
        provider_payment_method_id VARCHAR(100) NOT NULL,
        last4 VARCHAR(4),
        brand VARCHAR(20),
        expiry_month INTEGER,
        expiry_year INTEGER,
        is_default BOOLEAN DEFAULT FALSE,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);
    `,
  },
  {
    name: 'create_refunds_table',
    up: `
      CREATE TABLE IF NOT EXISTS refunds (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        payment_id UUID NOT NULL REFERENCES payments(id),
        order_id VARCHAR(50) NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        reason TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        provider_refund_id VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP WITH TIME ZONE,
        CONSTRAINT valid_refund_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
      );

      CREATE INDEX idx_refunds_payment_id ON refunds(payment_id);
      CREATE INDEX idx_refunds_order_id ON refunds(order_id);
      CREATE INDEX idx_refunds_status ON refunds(status);
    `,
  },
  {
    name: 'create_transactions_table',
    up: `
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        payment_id UUID REFERENCES payments(id),
        type VARCHAR(20) NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'USD',
        status VARCHAR(20) NOT NULL,
        provider_response JSONB,
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_transactions_payment_id ON transactions(payment_id);
      CREATE INDEX idx_transactions_created_at ON transactions(created_at);
    `,
  },
  {
    name: 'create_migrations_table',
    up: `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `,
  },
];

export async function runMigrations(): Promise<void> {
  const adminPool = new Pool({
    host: config.db.host,
    port: config.db.port,
    database: 'postgres',
    user: config.db.user,
    password: config.db.password,
  });

  try {
    // Create database if it doesn't exist
    const dbCheck = await adminPool.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [config.db.database]
    );

    if (dbCheck.rows.length === 0) {
      await adminPool.query(`CREATE DATABASE ${config.db.database}`);
      logger.info(`Database ${config.db.database} created`);
    }
  } catch (error: any) {
    if (!error.message.includes('already exists')) {
      logger.error('Error creating database', { error: error.message });
    }
  } finally {
    await adminPool.end();
  }

  // Connect to the target database
  const pool = new Pool({
    host: config.db.host,
    port: config.db.port,
    database: config.db.database,
    user: config.db.user,
    password: config.db.password,
  });

  try {
    // Run migrations table creation first
    await pool.query(migrations.find(m => m.name === 'create_migrations_table')!.up);

    // Check which migrations have been run
    const result = await pool.query('SELECT name FROM migrations');
    const executed = new Set(result.rows.map((r: any) => r.name));

    // Run pending migrations
    for (const migration of migrations) {
      if (!executed.has(migration.name)) {
        logger.info(`Running migration: ${migration.name}`);
        await pool.query(migration.up);
        await pool.query('INSERT INTO migrations (name) VALUES ($1)', [migration.name]);
        logger.info(`Migration completed: ${migration.name}`);
      }
    }

    logger.info('All migrations completed');
  } catch (error: any) {
    logger.error('Migration error', { error: error.message });
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => {
      logger.info('Migrations finished');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration failed', { error: error.message });
      process.exit(1);
    });
}

export { migrations };

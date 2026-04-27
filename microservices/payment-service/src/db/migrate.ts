import { query, closePool } from './index';
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

      CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
      CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
      CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
      CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
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

      CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
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

      CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON refunds(payment_id);
      CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON refunds(order_id);
      CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);
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

      CREATE INDEX IF NOT EXISTS idx_transactions_payment_id ON transactions(payment_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
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
  try {
    const migrationsTable = migrations.find(m => m.name === 'create_migrations_table');
    if (migrationsTable) await query(migrationsTable.up);

    const executedResult = await query<any>('SELECT name FROM migrations');
    const executed = new Set(executedResult.map((r: any) => r.name));

    for (const migration of migrations) {
      if (migration.name === 'create_migrations_table') continue;
      
      if (!executed.has(migration.name)) {
        logger.info(`Running migration: ${migration.name}`);
        await query(migration.up);
        await query('INSERT INTO migrations (name) VALUES ($1)', [migration.name]);
        logger.info(`Migration completed: ${migration.name}`);
      }
    }

    logger.info('All migrations completed');
  } catch (error: any) {
    logger.error('Migration error', { error: error.message });
    throw error;
  }
}

if (require.main === module) {
  runMigrations()
    .then(async () => {
      logger.info('Migrations finished');
      await closePool();
      process.exit(0);
    })
    .catch(async (error) => {
      logger.error('Migration failed', { error: error.message });
      await closePool();
      process.exit(1);
    });
}

export { migrations };

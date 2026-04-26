/**
 * Database Migration Script
 * Creates all necessary tables for the Auth Service
 */

import { query, closePool } from './index';
import { logger } from '../utils/logger';

const migrations = [
  {
    name: 'create_users_table',
    up: `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        phone VARCHAR(20),
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        avatar_url TEXT,
        role VARCHAR(50) DEFAULT 'customer',
        status VARCHAR(20) DEFAULT 'active',
        email_verified BOOLEAN DEFAULT false,
        phone_verified BOOLEAN DEFAULT false,
        last_login_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
    `,
    down: `DROP TABLE IF EXISTS users;`,
  },
  {
    name: 'create_sessions_table',
    up: `
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        refresh_token_hash VARCHAR(255) NOT NULL,
        device_info JSONB,
        ip_address INET,
        user_agent TEXT,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
      CREATE INDEX IF NOT EXISTS idx_sessions_refresh_hash ON sessions(refresh_token_hash);
    `,
    down: `DROP TABLE IF EXISTS sessions;`,
  },
  {
    name: 'create_oauth_accounts_table',
    up: `
      CREATE TABLE IF NOT EXISTS oauth_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider VARCHAR(50) NOT NULL,
        provider_user_id VARCHAR(255) NOT NULL,
        access_token_encrypted TEXT,
        refresh_token_encrypted TEXT,
        expires_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(provider, provider_user_id),
        UNIQUE(user_id, provider)
      );

      CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user_id ON oauth_accounts(user_id);
      CREATE INDEX IF NOT EXISTS idx_oauth_accounts_provider ON oauth_accounts(provider);
    `,
    down: `DROP TABLE IF EXISTS oauth_accounts;`,
  },
  {
    name: 'create_api_keys_table',
    up: `
      CREATE TABLE IF NOT EXISTS api_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        key_hash VARCHAR(255) NOT NULL UNIQUE,
        service_name VARCHAR(100) NOT NULL,
        permissions JSONB DEFAULT '[]',
        last_used_at TIMESTAMP WITH TIME ZONE,
        expires_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
      CREATE INDEX IF NOT EXISTS idx_api_keys_service ON api_keys(service_name);
    `,
    down: `DROP TABLE IF EXISTS api_keys;`,
  },
  {
    name: 'create_verification_tokens_table',
    up: `
      CREATE TABLE IF NOT EXISTS verification_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        used_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_verification_tokens_user ON verification_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_verification_tokens_hash ON verification_tokens(token_hash);
      CREATE INDEX IF NOT EXISTS idx_verification_tokens_type ON verification_tokens(type);
    `,
    down: `DROP TABLE IF EXISTS verification_tokens;`,
  },
  {
    name: 'create_login_history_table',
    up: `
      CREATE TABLE IF NOT EXISTS login_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        ip_address INET,
        user_agent TEXT,
        device_info JSONB,
        success BOOLEAN DEFAULT true,
        failure_reason VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_login_history_user ON login_history(user_id);
      CREATE INDEX IF NOT EXISTS idx_login_history_created ON login_history(created_at);
    `,
    down: `DROP TABLE IF EXISTS login_history;`,
  },
  {
    name: 'create_migrations_table',
    up: `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `,
    down: `DROP TABLE IF EXISTS migrations;`,
  },
];

async function runMigrations() {
  logger.info('Starting database migrations...');

  try {
    // Create migrations table first
    const migrationTable = migrations.find((m) => m.name === 'create_migrations_table');
    if (migrationTable) {
      await query(migrationTable.up);
    }

    // Get executed migrations
    const executed = await query<{ name: string }>(
      'SELECT name FROM migrations ORDER BY id'
    );
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

// Run if executed directly
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

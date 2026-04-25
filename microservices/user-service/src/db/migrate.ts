import { Pool } from 'pg';
import { config } from '../config';
import { logger } from '../utils/logger';

const migrations = [
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
  {
    name: 'create_users_table',
    up: `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        username VARCHAR(50) UNIQUE,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        phone VARCHAR(20),
        avatar VARCHAR(500),
        gender VARCHAR(20),
        date_of_birth DATE,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        is_verified BOOLEAN DEFAULT FALSE,
        is_seller BOOLEAN DEFAULT FALSE,
        seller_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_users_email ON users(email);
      CREATE INDEX idx_users_username ON users(username);
      CREATE INDEX idx_users_seller_id ON users(seller_id);
    `,
  },
  {
    name: 'create_addresses_table',
    up: `
      CREATE TABLE IF NOT EXISTS addresses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL DEFAULT 'shipping',
        label VARCHAR(50),
        recipient_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        address_line_1 VARCHAR(255) NOT NULL,
        address_line_2 VARCHAR(255),
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL,
        postal_code VARCHAR(20) NOT NULL,
        country VARCHAR(100) NOT NULL DEFAULT 'USA',
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_addresses_user_id ON addresses(user_id);
    `,
  },
  {
    name: 'create_user_preferences_table',
    up: `
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        language VARCHAR(10) DEFAULT 'en',
        currency VARCHAR(3) DEFAULT 'USD',
        notifications_email BOOLEAN DEFAULT TRUE,
        notifications_sms BOOLEAN DEFAULT TRUE,
        notifications_push BOOLEAN DEFAULT TRUE,
        newsletter BOOLEAN DEFAULT FALSE,
        marketing_emails BOOLEAN DEFAULT FALSE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `,
  },
  {
    name: 'create_user_follows_table',
    up: `
      CREATE TABLE IF NOT EXISTS user_follows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, seller_id)
      );

      CREATE INDEX idx_user_follows_user_id ON user_follows(user_id);
      CREATE INDEX idx_user_follows_seller_id ON user_follows(seller_id);
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

  const pool = new Pool({
    host: config.db.host,
    port: config.db.port,
    database: config.db.database,
    user: config.db.user,
    password: config.db.password,
  });

  try {
    await pool.query(migrations.find(m => m.name === 'create_migrations_table')!.up);

    const result = await pool.query('SELECT name FROM migrations');
    const executed = new Set(result.rows.map((r: any) => r.name));

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

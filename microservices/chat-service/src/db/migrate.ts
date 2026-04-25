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
    name: 'create_conversations_table',
    up: `
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(20) NOT NULL DEFAULT 'direct',
        participants UUID[] NOT NULL,
        order_id UUID,
        product_id UUID,
        last_message_id UUID,
        last_message_at TIMESTAMP WITH TIME ZONE,
        unread_count JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_conversations_participants ON conversations USING GIN(participants);
      CREATE INDEX idx_conversations_order_id ON conversations(order_id);
      CREATE INDEX idx_conversations_product_id ON conversations(product_id);
      CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);
    `,
  },
  {
    name: 'create_messages_table',
    up: `
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        sender_id UUID NOT NULL,
        sender_name VARCHAR(100),
        sender_role VARCHAR(20) DEFAULT 'buyer',
        type VARCHAR(20) NOT NULL DEFAULT 'text',
        content TEXT NOT NULL,
        attachment_url VARCHAR(500),
        status VARCHAR(20) NOT NULL DEFAULT 'sent',
        read_by UUID[] DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
      CREATE INDEX idx_messages_sender_id ON messages(sender_id);
      CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
    `,
  },
  {
    name: 'create_conversation_participants_table',
    up: `
      CREATE TABLE IF NOT EXISTS conversation_participants (
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        user_id UUID NOT NULL,
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_read_at TIMESTAMP WITH TIME ZONE,
        is_muted BOOLEAN DEFAULT FALSE,
        is_blocked BOOLEAN DEFAULT FALSE,
        PRIMARY KEY (conversation_id, user_id)
      );

      CREATE INDEX idx_participants_user_id ON conversation_participants(user_id);
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

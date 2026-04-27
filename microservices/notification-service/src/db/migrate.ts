import { query, closePool } from './index';
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
    name: 'create_notifications_table',
    up: `
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(50) NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        data JSONB DEFAULT '{}',
        channels VARCHAR(20)[] DEFAULT ARRAY['in_app'],
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        read_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        sent_at TIMESTAMP WITH TIME ZONE
      );

      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
      CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
    `,
  },
  {
    name: 'create_user_preferences_table',
    up: `
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id VARCHAR(50) PRIMARY KEY,
        email_enabled BOOLEAN DEFAULT TRUE,
        push_enabled BOOLEAN DEFAULT TRUE,
        sms_enabled BOOLEAN DEFAULT TRUE,
        in_app_enabled BOOLEAN DEFAULT TRUE,
        quiet_hours_start TIME,
        quiet_hours_end TIME,
        preferences JSONB DEFAULT '{}',
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `,
  },
  {
    name: 'create_notification_logs_table',
    up: `
      CREATE TABLE IF NOT EXISTS notification_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        notification_id UUID REFERENCES notifications(id),
        channel VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL,
        error_message TEXT,
        sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_notification_logs_notification_id ON notification_logs(notification_id);
    `,
  },
];

export async function runMigrations(): Promise<void> {
  try {
    // We assume the database already exists (ecommerce_db)
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

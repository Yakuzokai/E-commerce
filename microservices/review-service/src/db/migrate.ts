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
    name: 'create_reviews_table',
    up: `
      CREATE TABLE IF NOT EXISTS reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL,
        user_id UUID NOT NULL,
        order_id UUID NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        title VARCHAR(200),
        content TEXT NOT NULL,
        images TEXT[],
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        helpful_count INTEGER DEFAULT 0,
        not_helpful_count INTEGER DEFAULT 0,
        is_verified_purchase BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_reviews_product_id ON reviews(product_id);
      CREATE INDEX idx_reviews_user_id ON reviews(user_id);
      CREATE INDEX idx_reviews_order_id ON reviews(order_id);
      CREATE INDEX idx_reviews_status ON reviews(status);
      CREATE INDEX idx_reviews_rating ON reviews(rating);
      CREATE UNIQUE INDEX idx_reviews_order_product ON reviews(order_id, product_id);
    `,
  },
  {
    name: 'create_seller_responses_table',
    up: `
      CREATE TABLE IF NOT EXISTS seller_responses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
        seller_id UUID NOT NULL,
        seller_name VARCHAR(100),
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_seller_responses_review_id ON seller_responses(review_id);
    `,
  },
  {
    name: 'create_questions_table',
    up: `
      CREATE TABLE IF NOT EXISTS questions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL,
        user_id UUID NOT NULL,
        content TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        answer_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_questions_product_id ON questions(product_id);
      CREATE INDEX idx_questions_user_id ON questions(user_id);
      CREATE INDEX idx_questions_status ON questions(status);
    `,
  },
  {
    name: 'create_answers_table',
    up: `
      CREATE TABLE IF NOT EXISTS answers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        user_id UUID NOT NULL,
        seller_id UUID,
        content TEXT NOT NULL,
        is_official BOOLEAN DEFAULT FALSE,
        helpful_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_answers_question_id ON answers(question_id);
    `,
  },
  {
    name: 'create_review_votes_table',
    up: `
      CREATE TABLE IF NOT EXISTS review_votes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
        user_id UUID NOT NULL,
        vote VARCHAR(20) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(review_id, user_id)
      );

      CREATE INDEX idx_review_votes_review_id ON review_votes(review_id);
    `,
  },
  {
    name: 'create_product_ratings_view',
    up: `
      CREATE OR REPLACE VIEW product_ratings AS
      SELECT
        product_id,
        AVG(rating)::DECIMAL(3,2) as average_rating,
        COUNT(*)::INTEGER as total_reviews,
        COUNT(*) FILTER (WHERE rating = 1)::INTEGER as rating_1,
        COUNT(*) FILTER (WHERE rating = 2)::INTEGER as rating_2,
        COUNT(*) FILTER (WHERE rating = 3)::INTEGER as rating_3,
        COUNT(*) FILTER (WHERE rating = 4)::INTEGER as rating_4,
        COUNT(*) FILTER (WHERE rating = 5)::INTEGER as rating_5
      FROM reviews
      WHERE status = 'approved'
      GROUP BY product_id;
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

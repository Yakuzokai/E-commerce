/**
 * Database Configuration - Order Service
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import { appConfig, isProduction } from '../config';
import { logger } from '../utils/logger';

const pool = new Pool({
  connectionString: appConfig.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => logger.debug('New database connection established'));
pool.on('error', (err) => logger.error('Unexpected database pool error', { error: err.message }));

export async function query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    logger.debug('Query executed', { duration: Date.now() - start, rows: result.rowCount });
    return result;
  } catch (error) {
    logger.error('Query error', { error: (error as Error).message });
    throw error;
  }
}

export async function getClient(): Promise<PoolClient> {
  return await pool.connect();
}

export async function transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function healthCheck(): Promise<boolean> {
  try {
    const result = await query('SELECT 1 as health');
    return result.rows[0].health === 1;
  } catch {
    return false;
  }
}

export async function closePool(): Promise<void> {
  await pool.end();
  logger.info('Database pool closed');
}

export { pool };
export default { query, getClient, transaction, healthCheck, closePool };

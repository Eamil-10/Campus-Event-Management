import { Pool, PoolClient, PoolConfig, QueryResult, QueryResultRow } from 'pg';
import { env } from './env';

const poolConfig: PoolConfig = env.DATABASE_URL
  ? {
      connectionString: env.DATABASE_URL,
      ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
      max: env.DB_POOL_MAX,
      idleTimeoutMillis: env.DB_POOL_IDLE_TIMEOUT_MS,
      connectionTimeoutMillis: env.DB_POOL_CONNECTION_TIMEOUT_MS,
    }
  : {
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
      max: env.DB_POOL_MAX,
      idleTimeoutMillis: env.DB_POOL_IDLE_TIMEOUT_MS,
      connectionTimeoutMillis: env.DB_POOL_CONNECTION_TIMEOUT_MS,
    };

export const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err.message);
});

export interface DatabaseHealthResult {
  connected: boolean;
  latencyMs?: number;
  error?: string;
  details?: {
    version?: string;
    currentTime?: string;
  };
}

/**
 * Health check querying PostgreSQL with a simple lightweight ping.
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealthResult> {
  const startTime = Date.now();
  let client: PoolClient | null = null;
  try {
    client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as version;');
    const latencyMs = Date.now() - startTime;
    return {
      connected: true,
      latencyMs,
      details: {
        currentTime: result.rows[0]?.current_time?.toISOString?.() || String(result.rows[0]?.current_time),
        version: result.rows[0]?.version,
      },
    };
  } catch (error: unknown) {
    const latencyMs = Date.now() - startTime;
    const message = error instanceof Error ? error.message : 'Unknown database error';
    return {
      connected: false,
      latencyMs,
      error: message,
    };
  } finally {
    if (client) {
      client.release();
    }
  }
}

/**
 * Executes a parameterized SQL query against the connection pool.
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}

/**
 * Executes a database operation within an isolated transaction block.
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
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

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.checkDatabaseHealth = checkDatabaseHealth;
exports.query = query;
exports.transaction = transaction;
const pg_1 = require("pg");
const env_1 = require("./env");
const poolConfig = env_1.env.DATABASE_URL
    ? {
        connectionString: env_1.env.DATABASE_URL,
        ssl: env_1.env.DB_SSL ? { rejectUnauthorized: false } : false,
        max: env_1.env.DB_POOL_MAX,
        idleTimeoutMillis: env_1.env.DB_POOL_IDLE_TIMEOUT_MS,
        connectionTimeoutMillis: env_1.env.DB_POOL_CONNECTION_TIMEOUT_MS,
    }
    : {
        host: env_1.env.DB_HOST,
        port: env_1.env.DB_PORT,
        user: env_1.env.DB_USER,
        password: env_1.env.DB_PASSWORD,
        database: env_1.env.DB_NAME,
        ssl: env_1.env.DB_SSL ? { rejectUnauthorized: false } : false,
        max: env_1.env.DB_POOL_MAX,
        idleTimeoutMillis: env_1.env.DB_POOL_IDLE_TIMEOUT_MS,
        connectionTimeoutMillis: env_1.env.DB_POOL_CONNECTION_TIMEOUT_MS,
    };
exports.pool = new pg_1.Pool(poolConfig);
exports.pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client:', err.message);
});
/**
 * Health check querying PostgreSQL with a simple lightweight ping.
 */
async function checkDatabaseHealth() {
    const startTime = Date.now();
    let client = null;
    try {
        client = await exports.pool.connect();
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
    }
    catch (error) {
        const latencyMs = Date.now() - startTime;
        const message = error instanceof Error ? error.message : 'Unknown database error';
        return {
            connected: false,
            latencyMs,
            error: message,
        };
    }
    finally {
        if (client) {
            client.release();
        }
    }
}
/**
 * Executes a parameterized SQL query against the connection pool.
 */
async function query(text, params) {
    return exports.pool.query(text, params);
}
/**
 * Executes a database operation within an isolated transaction block.
 */
async function transaction(callback) {
    const client = await exports.pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
}

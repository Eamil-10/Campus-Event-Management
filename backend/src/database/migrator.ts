import fs from 'fs';
import path from 'path';
import { pool, transaction } from '../config/database';

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../database/migrations');

export async function runMigrations(): Promise<void> {
  console.log('--- Starting Database Migration Engine ---');
  console.log(`Scanning migrations directory: ${MIGRATIONS_DIR}`);

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    throw new Error(`Migrations directory does not exist: ${MIGRATIONS_DIR}`);
  }

  const client = await pool.connect();
  try {
    // 1. Ensure ledger table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Fetch already applied migrations
    const appliedResult = await client.query<{ version: string }>(
      'SELECT version FROM schema_migrations ORDER BY version ASC;'
    );
    const appliedVersions = new Set(appliedResult.rows.map((row) => row.version));

    // 3. Read migration files
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    const pending = files.filter((file) => !appliedVersions.has(file));

    if (pending.length === 0) {
      console.log('Database is up to date. No pending migrations.');
      return;
    }

    console.log(`Found ${pending.length} pending migration(s):`, pending);

    for (const file of pending) {
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, 'utf-8');
      console.log(`Executing migration: ${file}...`);

      await transaction(async (tx) => {
        await tx.query(sql);
        await tx.query('INSERT INTO schema_migrations (version) VALUES ($1);', [file]);
      });

      console.log(`Migration ${file} applied successfully.`);
    }

    console.log('--- All migrations executed successfully ---');
  } finally {
    client.release();
  }
}

export async function migrationStatus(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const appliedResult = await client.query<{ version: string; applied_at: Date }>(
      'SELECT version, applied_at FROM schema_migrations ORDER BY version ASC;'
    );
    const appliedMap = new Map(appliedResult.rows.map((r) => [r.version, r.applied_at]));

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    console.log('\n--- Database Migration Status ---');
    for (const file of files) {
      if (appliedMap.has(file)) {
        console.log(`[APPLIED]  ${file} (on ${appliedMap.get(file)?.toISOString()})`);
      } else {
        console.log(`[PENDING]  ${file}`);
      }
    }
    console.log('---------------------------------\n');
  } finally {
    client.release();
  }
}

export async function resetDatabase(): Promise<void> {
  console.log('WARNING: Resetting database schema (dropping all public tables)...');
  const client = await pool.connect();
  try {
    await client.query(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO postgres;
      GRANT ALL ON SCHEMA public TO public;
    `);
    console.log('Public schema reset complete. Re-running migrations...');
    await runMigrations();
  } finally {
    client.release();
  }
}

// CLI entry point
if (require.main === module) {
  const command = process.argv[2] || 'migrate';

  const action = async () => {
    try {
      if (command === 'migrate') {
        await runMigrations();
      } else if (command === 'status') {
        await migrationStatus();
      } else if (command === 'reset') {
        await resetDatabase();
      } else {
        console.error(`Unknown command: ${command}. Use 'migrate', 'status', or 'reset'.`);
        process.exit(1);
      }
      process.exit(0);
    } catch (err: unknown) {
      const errObj = err as any;
      const errorDetail = errObj?.message || errObj?.code || String(err);
      console.error(`Migration error: Unable to connect to PostgreSQL (${errorDetail}).`);
      console.error(`Please verify that PostgreSQL is running at ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'} or check DATABASE_URL in backend/.env.`);
      process.exit(1);
    }
  };

  action();
}

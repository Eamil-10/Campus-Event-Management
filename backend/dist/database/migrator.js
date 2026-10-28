"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrations = runMigrations;
exports.migrationStatus = migrationStatus;
exports.resetDatabase = resetDatabase;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const database_1 = require("../config/database");
const MIGRATIONS_DIR = path_1.default.resolve(__dirname, '../../../database/migrations');
async function runMigrations() {
    console.log('--- Starting Database Migration Engine ---');
    console.log(`Scanning migrations directory: ${MIGRATIONS_DIR}`);
    if (!fs_1.default.existsSync(MIGRATIONS_DIR)) {
        throw new Error(`Migrations directory does not exist: ${MIGRATIONS_DIR}`);
    }
    const client = await database_1.pool.connect();
    try {
        // 1. Ensure ledger table exists
        await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
        // 2. Fetch already applied migrations
        const appliedResult = await client.query('SELECT version FROM schema_migrations ORDER BY version ASC;');
        const appliedVersions = new Set(appliedResult.rows.map((row) => row.version));
        // 3. Read migration files
        const files = fs_1.default
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
            const filePath = path_1.default.join(MIGRATIONS_DIR, file);
            const sql = fs_1.default.readFileSync(filePath, 'utf-8');
            console.log(`Executing migration: ${file}...`);
            await (0, database_1.transaction)(async (tx) => {
                await tx.query(sql);
                await tx.query('INSERT INTO schema_migrations (version) VALUES ($1);', [file]);
            });
            console.log(`Migration ${file} applied successfully.`);
        }
        console.log('--- All migrations executed successfully ---');
    }
    finally {
        client.release();
    }
}
async function migrationStatus() {
    const client = await database_1.pool.connect();
    try {
        await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
        const appliedResult = await client.query('SELECT version, applied_at FROM schema_migrations ORDER BY version ASC;');
        const appliedMap = new Map(appliedResult.rows.map((r) => [r.version, r.applied_at]));
        const files = fs_1.default
            .readdirSync(MIGRATIONS_DIR)
            .filter((file) => file.endsWith('.sql'))
            .sort();
        console.log('\n--- Database Migration Status ---');
        for (const file of files) {
            if (appliedMap.has(file)) {
                console.log(`[APPLIED]  ${file} (on ${appliedMap.get(file)?.toISOString()})`);
            }
            else {
                console.log(`[PENDING]  ${file}`);
            }
        }
        console.log('---------------------------------\n');
    }
    finally {
        client.release();
    }
}
async function resetDatabase() {
    console.log('WARNING: Resetting database schema (dropping all public tables)...');
    const client = await database_1.pool.connect();
    try {
        await client.query(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO postgres;
      GRANT ALL ON SCHEMA public TO public;
    `);
        console.log('Public schema reset complete. Re-running migrations...');
        await runMigrations();
    }
    finally {
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
            }
            else if (command === 'status') {
                await migrationStatus();
            }
            else if (command === 'reset') {
                await resetDatabase();
            }
            else {
                console.error(`Unknown command: ${command}. Use 'migrate', 'status', or 'reset'.`);
                process.exit(1);
            }
            process.exit(0);
        }
        catch (err) {
            const errObj = err;
            const errorDetail = errObj?.message || errObj?.code || String(err);
            console.error(`Migration error: Unable to connect to PostgreSQL (${errorDetail}).`);
            console.error(`Please verify that PostgreSQL is running at ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'} or check DATABASE_URL in backend/.env.`);
            process.exit(1);
        }
    };
    action();
}

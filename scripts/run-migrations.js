/**
 * Run Database Migrations
 * Executes SQL migration files in order
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDbPool } from '../src/lib/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const migrationsDir = join(__dirname, '..', 'migrations');

const migrations = [
  '001_create_users_table.sql',
  '002_create_subscriptions_table.sql',
  '003_create_usage_table.sql'
];

async function runMigrations() {
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    console.log('[Migrations] Starting database migrations...');

    for (const migrationFile of migrations) {
      const migrationPath = join(migrationsDir, migrationFile);
      const sql = readFileSync(migrationPath, 'utf8');

      console.log(`[Migrations] Running ${migrationFile}...`);

      await client.query(sql);

      console.log(`[Migrations] ✓ ${migrationFile} completed`);
    }

    console.log('[Migrations] All migrations completed successfully!');
  } catch (error) {
    console.error('[Migrations] Error running migrations:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then(() => {
      console.log('[Migrations] Done');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Migrations] Failed:', error);
      process.exit(1);
    });
}

export { runMigrations };


/**
 * Test Database Connection
 * Tests connection to Supabase database
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getDbPool } from '../src/lib/db.js';

// Load .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

async function testConnection() {
  try {
    console.log('[Test] Testing database connection...');
    console.log('[Test] DATABASE_URL:', process.env.DATABASE_URL ? 'Set ✓' : 'Not set ✗');
    
    if (!process.env.DATABASE_URL) {
      console.error('[Test] ❌ DATABASE_URL not set in .env file');
      console.log('[Test] Please create .env file with DATABASE_URL');
      process.exit(1);
    }

    const pool = getDbPool();
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    
    console.log('[Test] ✅ Database connection successful!');
    console.log('[Test] Current time:', result.rows[0].current_time);
    console.log('[Test] PostgreSQL version:', result.rows[0].pg_version.split(',')[0]);
    
    // Test if tables exist
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'subscriptions', 'usage')
      ORDER BY table_name
    `);
    
    if (tablesResult.rows.length > 0) {
      console.log('[Test] ✅ Found tables:', tablesResult.rows.map(r => r.table_name).join(', '));
    } else {
      console.log('[Test] ⚠️  No tables found. Run migrations: npm run migrate');
    }
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('[Test] ❌ Database connection failed:');
    console.error('[Test] Error:', error.message);
    
    if (error.message.includes('password authentication failed')) {
      console.error('[Test] 💡 Check your DATABASE_URL password');
    } else if (error.message.includes('getaddrinfo ENOTFOUND')) {
      console.error('[Test] 💡 Check your DATABASE_URL hostname');
    } else if (error.message.includes('timeout')) {
      console.error('[Test] 💡 Check your network connection');
    }
    
    process.exit(1);
  }
}

testConnection();


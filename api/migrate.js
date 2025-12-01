/**
 * Migration Endpoint
 * Run database migrations via API
 * 
 * Security: Requires CRON_SECRET in request body
 * Usage: POST /api/migrate with { "secret": "your-cron-secret" }
 */

import { query } from '../src/lib/db.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'Use POST to run migrations'
    });
  }

  // Security check
  const { secret } = req.body || {};
  if (!secret || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Invalid or missing secret'
    });
  }

  try {
    console.log('[Migration] Starting database migrations...');
    
    const migrationsDir = join(__dirname, '../migrations');
    const migrations = [
      '001_create_users_table.sql',
      '002_create_subscriptions_table.sql',
      '003_create_usage_table.sql',
      '004_create_models_table.sql',
      '005_create_api_keys_table.sql'
    ];

    const results = [];

    for (const migration of migrations) {
      try {
        const sqlPath = join(migrationsDir, migration);
        const sql = readFileSync(sqlPath, 'utf-8');
        
        console.log(`[Migration] Executing ${migration}...`);
        await query(sql);
        
        results.push({ 
          migration, 
          status: 'success',
          message: 'Table created successfully'
        });
        
        console.log(`[Migration] ✅ ${migration} completed`);
      } catch (error) {
        // Check if table already exists
        if (error.message.includes('already exists')) {
          results.push({ 
            migration, 
            status: 'skipped',
            message: 'Table already exists'
          });
          console.log(`[Migration] ⚠️ ${migration} skipped (already exists)`);
        } else {
          throw error;
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Migrations completed',
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Migration] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}


/**
 * Script to run migration and set admin user
 * Usage: node scripts/run-migration-and-set-admin.js <admin-email> [cron-secret]
 * 
 * If cron-secret is not provided, it will try to read from .env file
 * If admin-email is not provided, it will list users first
 * 
 * Requires Node.js 18+ for native fetch support
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '../.env') });

const API_BASE_URL = process.env.API_BASE_URL || 'https://besideai-backend.vercel.app';
const CRON_SECRET = process.argv[3] || process.env.CRON_SECRET;
const ADMIN_EMAIL = process.argv[2];

if (!CRON_SECRET) {
  console.error('❌ Error: CRON_SECRET is required');
  console.log('Either provide it as argument or set it in .env file');
  process.exit(1);
}

// Simple fetch implementation using http/https
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const httpModule = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = httpModule.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        // Handle redirects (3xx status codes)
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          // Follow redirect
          return makeRequest(res.headers.location, options).then(resolve).catch(reject);
        }
        
        try {
          const jsonData = JSON.parse(data);
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: () => Promise.resolve(jsonData),
            text: () => Promise.resolve(data)
          });
        } catch (e) {
          // If not JSON, return text response
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: () => Promise.reject(new Error(`Not JSON: ${data.substring(0, 100)}`)),
            text: () => Promise.resolve(data)
          });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function listUsers() {
  try {
    const response = await makeRequest(`${API_BASE_URL}/api/admin/list-users?secret=${CRON_SECRET}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to list users');
    }

    console.log(`Found ${data.count} users:\n`);
    data.users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.name || 'No name'}) - Role: ${user.role || 'user'}`);
    });
    return true;
  } catch (error) {
    console.error('❌ Failed to list users:', error.message);
    return false;
  }
}

async function runMigration() {
  console.log('🔄 Running database migrations...');
  
  try {
    const response = await makeRequest(`${API_BASE_URL}/api/migrate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ secret: CRON_SECRET }),
    });

    let data;
    try {
      data = await response.json();
    } catch (e) {
      const text = await response.text();
      console.error('Response status:', response.status);
      console.error('Response headers:', JSON.stringify(response.headers || {}));
      console.error('Response body:', text.substring(0, 500));
      throw new Error(`Failed to parse JSON (status ${response.status}): ${text.substring(0, 200)}`);
    }

    if (!response.ok) {
      throw new Error(data.message || data.error || `Migration failed with status ${response.status}`);
    }

    console.log('✅ Migrations completed successfully');
    console.log('Results:', JSON.stringify(data.results, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    return false;
  }
}

async function setAdminUser() {
  console.log(`\n👤 Setting ${ADMIN_EMAIL} as admin...`);
  
  try {
    const response = await makeRequest(`${API_BASE_URL}/api/admin/set-admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: CRON_SECRET,
        email: ADMIN_EMAIL,
      }),
    });

    let data;
    try {
      data = await response.json();
    } catch (e) {
      const text = await response.text();
      throw new Error(`Failed to parse JSON: ${text.substring(0, 200)}`);
    }

    if (!response.ok) {
      throw new Error(data.message || data.error || `Failed to set admin user with status ${response.status}`);
    }

    console.log('✅ Admin user set successfully');
    console.log('User:', JSON.stringify(data.user, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Failed to set admin user:', error.message);
    return false;
  }
}

async function main() {
  // If no email provided, list users first
  if (!ADMIN_EMAIL) {
    console.log('📋 No admin email provided. Listing users...\n');
    const listSuccess = await listUsers();
    if (listSuccess) {
      console.log('\n💡 Usage: node scripts/run-migration-and-set-admin.js <admin-email> [cron-secret]');
    }
    process.exit(listSuccess ? 0 : 1);
  }

  console.log('🚀 Starting migration and admin setup...\n');
  console.log(`API URL: ${API_BASE_URL}`);
  console.log(`Admin Email: ${ADMIN_EMAIL}\n`);

  // Step 1: Run migration
  const migrationSuccess = await runMigration();
  
  if (!migrationSuccess) {
    console.error('\n❌ Migration failed. Aborting admin setup.');
    process.exit(1);
  }

  // Step 2: Set admin user
  const adminSuccess = await setAdminUser();
  
  if (!adminSuccess) {
    console.error('\n❌ Failed to set admin user.');
    process.exit(1);
  }

  console.log('\n✅ All done! Admin user is ready.');
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

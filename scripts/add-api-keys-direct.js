/**
 * Add API Keys Directly to Database
 * This script encrypts and inserts API keys directly into the database
 * 
 * Usage:
 *   node scripts/add-api-keys-direct.js
 */

import { query } from '../src/lib/db.js';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// Encryption key from environment
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '5b0527020049c47b183bafa2603c1bebfac5e8fa75196cd1de6932c56c3ec1ff';
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypt API key
 */
function encryptKey(text) {
  if (!text) {
    throw new Error('Text to encrypt is required');
  }
  
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32), 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Return format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Add API key to database
 */
async function addApiKey(provider, apiKey, keyName = null) {
  try {
    const encrypted = encryptKey(apiKey);
    
    const sql = `
      INSERT INTO api_keys (provider, key_name, encrypted_key, is_active)
      VALUES ($1, $2, $3, true)
      ON CONFLICT (provider, key_name) 
      DO UPDATE SET 
        encrypted_key = EXCLUDED.encrypted_key,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `;
    
    const result = await query(sql, [provider, keyName, encrypted]);
    return result.rows[0].id;
  } catch (error) {
    console.error(`[Add API Key] Error adding ${provider}:`, error);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🔐 Adding API Keys to Database...\n');

    // Test database connection
    await query('SELECT 1');
    console.log('✅ Database connected\n');

    // API keys to add
    // Get from environment variables or pass as arguments
    const keys = [];
    
    if (process.env.GOOGLE_AI_API_KEY) {
      keys.push({
        provider: 'google',
        apiKey: process.env.GOOGLE_AI_API_KEY,
        keyName: 'Default Google AI Key'
      });
    }
    
    if (process.env.CEREBRAS_API_KEY) {
      keys.push({
        provider: 'cerebras',
        apiKey: process.env.CEREBRAS_API_KEY,
        keyName: 'Default Cerebras Key'
      });
    }
    
    if (process.env.GROQ_API_KEY) {
      keys.push({
        provider: 'groq',
        apiKey: process.env.GROQ_API_KEY,
        keyName: 'Default Groq Key'
      });
    }

    // Add each key
    for (const keyData of keys) {
      try {
        const keyId = await addApiKey(
          keyData.provider,
          keyData.apiKey,
          keyData.keyName
        );
        console.log(`✅ Added ${keyData.provider} API key (ID: ${keyId})`);
      } catch (error) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          console.log(`⚠️  ${keyData.provider} API key already exists (updated)`);
        } else {
          throw error;
        }
      }
    }

    console.log('\n✅ All API keys added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run script
main();


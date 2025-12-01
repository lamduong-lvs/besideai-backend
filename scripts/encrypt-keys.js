/**
 * Encrypt API Keys
 * This script encrypts API keys so they can be inserted into database
 * 
 * Usage:
 *   node scripts/encrypt-keys.js
 */

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
  
  // ENCRYPTION_KEY is hex string (64 chars = 32 bytes)
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  if (key.length !== 32) {
    throw new Error(`Invalid encryption key length: expected 32 bytes, got ${key.length}`);
  }
  
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Return format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

// API keys to encrypt
// Get from environment variables or command line arguments
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

// If no keys from env, show usage
if (keys.length === 0) {
  console.log('⚠️  No API keys found in environment variables');
  console.log('   Set GOOGLE_AI_API_KEY, CEREBRAS_API_KEY, or GROQ_API_KEY');
  console.log('   Or pass keys as command line arguments');
  process.exit(1);
}

console.log('🔐 Encrypting API Keys...\n');
console.log('-- Copy SQL below and run on Supabase SQL Editor --\n');
console.log('INSERT INTO api_keys (provider, key_name, encrypted_key, is_active) VALUES\n');

const sqlValues = keys.map((keyData, index) => {
  const encrypted = encryptKey(keyData.apiKey);
  const comma = index < keys.length - 1 ? ',' : ';';
  return `  ('${keyData.provider}', '${keyData.keyName}', '${encrypted}', true)${comma}`;
});

console.log(sqlValues.join('\n'));
console.log('\n-- End of SQL --\n');
console.log('✅ Keys encrypted! Copy SQL above and run on Supabase SQL Editor');


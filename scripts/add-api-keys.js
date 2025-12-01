/**
 * Script to add API keys to database
 * 
 * Usage:
 *   node scripts/add-api-keys.js
 * 
 * Or set environment variables:
 *   OPENAI_API_KEY=sk-... node scripts/add-api-keys.js
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/add-api-keys.js
 *   GOOGLE_AI_API_KEY=... node scripts/add-api-keys.js
 */

import { storeApiKey } from '../src/services/api-keys-service.js';
import { getDbPool } from '../src/lib/db.js';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

async function addApiKeys() {
  try {
    console.log('🔐 Adding API keys to database...\n');

    // Test database connection
    const pool = getDbPool();
    await pool.query('SELECT 1');
    console.log('✅ Database connected\n');

    const keysToAdd = [];

    // OpenAI
    if (process.env.OPENAI_API_KEY) {
      keysToAdd.push({
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY,
        keyName: 'Default OpenAI Key'
      });
    }

    // Anthropic
    if (process.env.ANTHROPIC_API_KEY) {
      keysToAdd.push({
        provider: 'anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY,
        keyName: 'Default Anthropic Key'
      });
    }

    // Google AI
    if (process.env.GOOGLE_AI_API_KEY) {
      keysToAdd.push({
        provider: 'google',
        apiKey: process.env.GOOGLE_AI_API_KEY,
        keyName: 'Default Google AI Key'
      });
    }

    if (keysToAdd.length === 0) {
      console.log('⚠️  No API keys found in environment variables');
      console.log('   Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_AI_API_KEY\n');
      return;
    }

    // Add each key
    for (const keyData of keysToAdd) {
      try {
        const keyId = await storeApiKey(
          keyData.provider,
          keyData.apiKey,
          keyData.keyName
        );
        console.log(`✅ Added ${keyData.provider} API key (ID: ${keyId})`);
      } catch (error) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          console.log(`⚠️  ${keyData.provider} API key already exists (skipped)`);
        } else {
          throw error;
        }
      }
    }

    console.log('\n✅ All API keys added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run script
addApiKeys();


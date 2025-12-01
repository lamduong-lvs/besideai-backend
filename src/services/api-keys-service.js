/**
 * API Keys Service
 * Manages encrypted API keys for AI providers
 */

import { query } from '../lib/db.js';
import crypto from 'crypto';

// Encryption key from environment (should be 32 bytes for AES-256)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypt API key
 * @param {string} text - Plain text API key
 * @returns {string} Encrypted key (format: iv:authTag:encrypted)
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
 * Decrypt API key
 * @param {string} encryptedText - Encrypted key (format: iv:authTag:encrypted)
 * @returns {string} Decrypted API key
 */
function decryptKey(encryptedText) {
  if (!encryptedText) {
    throw new Error('Encrypted text is required');
  }
  
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted format');
  }
  
  const [ivHex, authTagHex, encrypted] = parts;
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32), 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Get active API key for provider
 * @param {string} provider - Provider name (openai, anthropic, google, etc.)
 * @returns {Promise<string|null>} Decrypted API key or null
 */
export async function getApiKey(provider) {
  try {
    const sql = `
      SELECT encrypted_key, id
      FROM api_keys
      WHERE provider = $1
        AND is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    const result = await query(sql, [provider]);
    
    if (result.rows.length === 0) {
      console.warn(`[APIKeysService] No active API key found for provider: ${provider}`);
      return null;
    }
    
    const { encrypted_key, id } = result.rows[0];
    
    // Update usage stats
    await query(
      'UPDATE api_keys SET usage_count = usage_count + 1, last_used_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
    
    // Decrypt and return
    return decryptKey(encrypted_key);
  } catch (error) {
    console.error('[APIKeysService] Error getting API key:', error);
    throw error;
  }
}

/**
 * Store API key
 * @param {string} provider - Provider name
 * @param {string} apiKey - Plain text API key
 * @param {string} keyName - Optional key name/description
 * @returns {Promise<number>} Inserted key ID
 */
export async function storeApiKey(provider, apiKey, keyName = null) {
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
    console.error('[APIKeysService] Error storing API key:', error);
    throw error;
  }
}

/**
 * Deactivate API key
 * @param {number} keyId - Key ID
 * @returns {Promise<void>}
 */
export async function deactivateApiKey(keyId) {
  try {
    await query(
      'UPDATE api_keys SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [keyId]
    );
  } catch (error) {
    console.error('[APIKeysService] Error deactivating API key:', error);
    throw error;
  }
}

/**
 * List API keys for provider
 * @param {string} provider - Provider name
 * @returns {Promise<Array>} List of API keys (without decrypted values)
 */
export async function listApiKeys(provider) {
  try {
    const sql = `
      SELECT 
        id,
        provider,
        key_name as "keyName",
        is_active as "isActive",
        usage_count as "usageCount",
        last_used_at as "lastUsedAt",
        created_at as "createdAt"
      FROM api_keys
      WHERE provider = $1
      ORDER BY created_at DESC
    `;
    
    const result = await query(sql, [provider]);
    return result.rows;
  } catch (error) {
    console.error('[APIKeysService] Error listing API keys:', error);
    throw error;
  }
}

// Export encryption functions for testing
export { encryptKey, decryptKey };


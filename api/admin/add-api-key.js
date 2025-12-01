/**
 * Admin API: Add API Key
 * POST /api/admin/add-api-key
 * 
 * Security: Requires CRON_SECRET or admin token
 * Usage: Add encrypted API keys to database
 */

import { storeApiKey } from '../../src/services/api-keys-service.js';

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'method_not_allowed',
      message: 'Only POST method is allowed'
    });
  }

  // Security check
  const { secret, provider, apiKey, keyName } = req.body || {};
  
  if (!secret || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({
      success: false,
      error: 'unauthorized',
      message: 'Invalid or missing secret'
    });
  }

  // Validate required fields
  if (!provider || !apiKey) {
    return res.status(400).json({
      success: false,
      error: 'missing_fields',
      message: 'provider and apiKey are required'
    });
  }

  try {
    // Store API key (will be encrypted automatically)
    const keyId = await storeApiKey(provider, apiKey, keyName || null);

    return res.status(200).json({
      success: true,
      message: 'API key stored successfully',
      keyId: keyId,
      provider: provider,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Add API Key] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'internal_error',
      message: error.message
    });
  }
}


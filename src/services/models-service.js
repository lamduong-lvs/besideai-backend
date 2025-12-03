/**
 * Models Service
 * Manages AI models configuration
 */

import { query } from '../lib/db.js';

/**
 * Get available models for user based on subscription tier
 * @param {string} tier - Subscription tier (free, pro, premium)
 * @returns {Promise<Array>} Array of available models
 */
export async function getAvailableModels(tier = 'free') {
  try {
    // Map tier to allowed tiers
    // Free tier can access all models (temporarily)
    const tierMap = {
      'free': ['free', 'pro', 'premium'], // Free tier can access all
      'pro': ['free', 'pro'],
      'premium': ['free', 'pro', 'premium']
    };
    
    const allowedTiers = tierMap[tier] || ['free'];
    
    const sql = `
      SELECT 
        id,
        name,
        provider,
        provider_name as "providerName",
        tier,
        priority,
        enabled,
        description,
        max_tokens as "maxTokens",
        supports_streaming as "supportsStreaming",
        category,
        config
      FROM models
      WHERE tier = ANY($1::text[])
        AND enabled = true
      ORDER BY priority DESC, name ASC
    `;
    
    const result = await query(sql, [allowedTiers]);
    return result.rows;
  } catch (error) {
    console.error('[ModelsService] Error getting available models:', error);
    throw error;
  }
}

/**
 * Get model by ID
 * @param {string} modelId - Model ID
 * @returns {Promise<Object|null>} Model object or null
 */
export async function getModelById(modelId) {
  try {
    const sql = `
      SELECT 
        id,
        name,
        provider,
        provider_name as "providerName",
        tier,
        priority,
        enabled,
        description,
        max_tokens as "maxTokens",
        supports_streaming as "supportsStreaming",
        category,
        config
      FROM models
      WHERE id = $1
        AND enabled = true
    `;
    
    const result = await query(sql, [modelId]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('[ModelsService] Error getting model by ID:', error);
    throw error;
  }
}

/**
 * Get default model for tier
 * @param {string} tier - Subscription tier
 * @returns {Promise<Object|null>} Default model
 */
export async function getDefaultModel(tier = 'free') {
  try {
    const models = await getAvailableModels(tier);
    if (models.length === 0) {
      return null;
    }
    
    // Return highest priority model
    return models[0];
  } catch (error) {
    console.error('[ModelsService] Error getting default model:', error);
    throw error;
  }
}

/**
 * Get recommended models for tier
 * @param {string} tier - Subscription tier
 * @param {number} limit - Number of recommended models (default: 3)
 * @returns {Promise<Array>} Recommended models
 */
export async function getRecommendedModels(tier = 'free', limit = 3) {
  try {
    const models = await getAvailableModels(tier);
    return models.slice(0, limit);
  } catch (error) {
    console.error('[ModelsService] Error getting recommended models:', error);
    throw error;
  }
}

/**
 * Check if user can access model
 * @param {string} modelId - Model ID
 * @param {string} tier - User's subscription tier
 * @returns {Promise<boolean>} True if user can access
 */
export async function canAccessModel(modelId, tier) {
  try {
    const model = await getModelById(modelId);
    if (!model) {
      return false;
    }
    
    // Free tier can access all models (temporarily)
    if (tier === 'free') {
      return true;
    }
    
    const tierMap = {
      'free': ['free', 'pro', 'premium'], // Free tier can access all
      'pro': ['free', 'pro'],
      'premium': ['free', 'pro', 'premium']
    };
    
    const allowedTiers = tierMap[tier] || ['free'];
    return allowedTiers.includes(model.tier);
  } catch (error) {
    console.error('[ModelsService] Error checking model access:', error);
    return false;
  }
}


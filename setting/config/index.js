/**
 * Provider Configuration Index
 * Exports all provider configurations
 */

import { openaiConfig } from './providers/openai.js';
import { anthropicConfig } from './providers/anthropic.js';
import { googleaiConfig } from './providers/googleai.js';
import { groqConfig } from './providers/groq.js';
import { cerebrasConfig } from './providers/cerebras.js';
import { difyConfig } from './providers/dify.js';
import { customConfig } from './providers/custom.js';

/**
 * Map of all provider configurations
 */
export const PROVIDER_CONFIGS = {
  openai: openaiConfig,
  anthropic: anthropicConfig,
  googleai: googleaiConfig,
  groq: groqConfig,
  cerebras: cerebrasConfig,
  dify: difyConfig,
  custom: customConfig
};

/**
 * Get provider configuration by ID
 * @param {string} providerId - Provider identifier
 * @returns {object|null} Provider configuration or null if not found
 */
export function getProviderConfig(providerId) {
  if (!providerId) return null;
  const normalized = providerId.toLowerCase();
  return PROVIDER_CONFIGS[normalized] || null;
}

/**
 * Get all provider configurations
 * @returns {object} Map of all provider configurations
 */
export function getAllProviderConfigs() {
  return PROVIDER_CONFIGS;
}

/**
 * Get default configuration for a provider
 * @param {string} providerId - Provider identifier
 * @returns {object|null} Default configuration or null if not found
 */
export function getDefaultProviderConfig(providerId) {
  const config = getProviderConfig(providerId);
  return config ? config.getDefaultConfig() : null;
}

/**
 * Validate provider configuration
 * @param {string} providerId - Provider identifier
 * @param {object} config - Configuration to validate
 * @returns {object} Validation result with isValid and errors
 */
export function validateProviderConfig(providerId, config) {
  const providerConfig = getProviderConfig(providerId);
  if (!providerConfig) {
    return {
      isValid: false,
      errors: [`Provider ${providerId} not found`]
    };
  }
  
  const errors = [];
  
  // Check required fields
  for (const field of providerConfig.requiredFields) {
    if (!config[field] || (typeof config[field] === 'string' && !config[field].trim())) {
      errors.push(`Field ${field} is required`);
    }
  }
  
  // Validate fields
  if (providerConfig.validation) {
    for (const [field, validator] of Object.entries(providerConfig.validation)) {
      if (config[field] !== undefined && config[field] !== null) {
        if (!validator(config[field])) {
          errors.push(`Field ${field} is invalid`);
        }
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Export individual configs for convenience
export {
  openaiConfig,
  anthropicConfig,
  googleaiConfig,
  groqConfig,
  cerebrasConfig,
  difyConfig,
  customConfig
};


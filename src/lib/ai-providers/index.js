/**
 * AI Providers Factory
 * Unified interface for all AI providers
 */

import * as openaiProvider from './openai.js';
import * as anthropicProvider from './anthropic.js';
import * as googleProvider from './google.js';
import { getModelById } from '../../services/models-service.js';

const PROVIDERS = {
  openai: openaiProvider,
  anthropic: anthropicProvider,
  google: googleProvider
};

/**
 * Get provider instance
 * @param {string} providerName - Provider name (openai, anthropic, google)
 * @returns {Object} Provider instance
 */
export function getProvider(providerName) {
  const provider = PROVIDERS[providerName.toLowerCase()];
  if (!provider) {
    throw new Error(`Provider ${providerName} not supported`);
  }
  return provider;
}

/**
 * Unified call interface
 * @param {string} modelId - Model ID (e.g., 'gpt-4o')
 * @param {Array} messages - Messages array
 * @param {Object} options - API options
 * @returns {Promise<Object>} API response
 */
export async function call(modelId, messages, options = {}) {
  // Get model info to determine provider
  const model = await getModelById(modelId);
  if (!model) {
    throw new Error(`Model ${modelId} not found`);
  }

  const provider = getProvider(model.provider);
  
  // Merge model config with options
  const mergedOptions = {
    ...model.config,
    ...options,
    model: modelId
  };

  return await provider.call(messages, mergedOptions);
}

/**
 * Unified streaming interface
 * @param {string} modelId - Model ID
 * @param {Array} messages - Messages array
 * @param {Object} options - API options
 * @param {Function} onChunk - Callback for each chunk
 * @returns {Promise<Object>} Final response with tokens
 */
export async function stream(modelId, messages, options = {}, onChunk) {
  // Get model info to determine provider
  const model = await getModelById(modelId);
  if (!model) {
    throw new Error(`Model ${modelId} not found`);
  }

  const provider = getProvider(model.provider);
  
  // Merge model config with options
  const mergedOptions = {
    ...model.config,
    ...options,
    model: modelId
  };

  return await provider.stream(messages, mergedOptions, onChunk);
}


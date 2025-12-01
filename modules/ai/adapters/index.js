/**
 * Adapter Index
 * Exports all adapters and provides factory function
 */

import { OpenAIAdapter } from './openai-adapter.js';
import { AnthropicAdapter } from './anthropic-adapter.js';
import { GoogleAIAdapter } from './googleai-adapter.js';
import { BaseAdapter } from './base-adapter.js';

/**
 * Create adapter instance for a provider
 * @param {object} providerConfig - Provider configuration from APIManager
 * @returns {BaseAdapter} Adapter instance
 */
export function createAdapter(providerConfig) {
  if (!providerConfig || !providerConfig.type) {
    throw new Error('Invalid provider configuration');
  }
  
  const type = providerConfig.type.toLowerCase();
  
  switch (type) {
    case 'openai-compatible':
      return new OpenAIAdapter(providerConfig);
    case 'anthropic':
      return new AnthropicAdapter(providerConfig);
    case 'google-ai':
      return new GoogleAIAdapter(providerConfig);
    case 'dify':
      // Dify adapter can be added later
      throw new Error('Dify adapter not yet implemented');
    default:
      // Default to OpenAI-compatible for unknown types
      return new OpenAIAdapter(providerConfig);
  }
}

export {
  BaseAdapter,
  OpenAIAdapter,
  AnthropicAdapter,
  GoogleAIAdapter
};


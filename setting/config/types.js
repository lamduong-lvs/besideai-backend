/**
 * Type definitions and validation for API providers
 */

/**
 * Provider types supported by the extension
 */
export const PROVIDER_TYPES = {
  OPENAI_COMPATIBLE: 'openai-compatible',
  ANTHROPIC: 'anthropic',
  GOOGLE_AI: 'google-ai',
  DIFY: 'dify'
};

/**
 * Validate API key format
 */
export function validateApiKey(providerId, apiKey) {
  if (!apiKey) return false;
  
  switch (providerId.toLowerCase()) {
    case 'openai':
    case 'groq':
    case 'custom':
      return apiKey.startsWith('sk-') || apiKey.length > 10;
    case 'anthropic':
      return apiKey.startsWith('sk-ant-') || apiKey.length > 10;
    case 'googleai':
      return apiKey.length > 10; // Google API keys don't have specific prefix
    case 'cerebras':
      return true; // Cerebras might not need API key
    case 'dify':
      return apiKey.length > 10;
    default:
      return apiKey.length > 5;
  }
}

/**
 * Validate base URL format
 */
export function validateBaseURL(url) {
  if (!url) return true; // Optional field
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Provider configuration schema
 */
export const PROVIDER_SCHEMA = {
  providerId: { type: 'string', required: true },
  name: { type: 'string', required: true },
  type: { type: 'string', required: true, enum: Object.values(PROVIDER_TYPES) },
  apiKey: { type: 'string', required: false },
  baseURL: { type: 'string', required: false },
  currentModel: { type: 'string', required: false },
  temperature: { type: 'number', required: false, default: 0.7 },
  maxTokens: { type: 'number', required: false, default: 2000 },
  models: { type: 'array', required: false, default: [] }
};


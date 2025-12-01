/**
 * Cerebras Provider Configuration
 */
export const cerebrasConfig = {
  providerId: 'cerebras',
  name: 'Cerebras',
  type: 'openai-compatible',
  defaultBaseURL: 'https://api.cerebras.ai/v1/chat/completions',
  defaultModel: 'llama-4-scout-17b-16e-instruct',
  defaultTemperature: 0.7,
  defaultMaxTokens: 2000,
  
  requiredFields: [], // Cerebras might not need API key
  optionalFields: ['apiKey', 'baseURL'],
  
  validation: {
    apiKey: (key) => {
      if (!key) return true; // Optional for Cerebras
      return key.length > 5;
    },
    baseURL: (url) => {
      if (!url) return true;
      try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    }
  },
  
  getDefaultConfig: () => ({
    providerId: 'cerebras',
    name: 'Cerebras',
    type: 'openai-compatible',
    apiKey: null,
    baseURL: 'https://api.cerebras.ai/v1/chat/completions',
    currentModel: 'llama-4-scout-17b-16e-instruct',
    temperature: 0.7,
    maxTokens: 2000,
    models: []
  })
};


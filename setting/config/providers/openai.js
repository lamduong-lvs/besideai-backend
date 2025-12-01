/**
 * OpenAI Provider Configuration
 */
export const openaiConfig = {
  providerId: 'openai',
  name: 'OpenAI',
  type: 'openai-compatible',
  defaultBaseURL: 'https://api.openai.com/v1/chat/completions',
  defaultModel: 'gpt-4o',
  defaultTemperature: 0.7,
  defaultMaxTokens: 2000,
  
  requiredFields: ['apiKey'],
  optionalFields: ['baseURL'],
  
  validation: {
    apiKey: (key) => {
      if (!key) return false;
      return key.startsWith('sk-') || key.length > 10;
    },
    baseURL: (url) => {
      if (!url) return true; // Optional
      try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    }
  },
  
  getDefaultConfig: () => ({
    providerId: 'openai',
    name: 'OpenAI',
    type: 'openai-compatible',
    apiKey: null,
    baseURL: 'https://api.openai.com/v1/chat/completions',
    currentModel: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 2000,
    models: []
  })
};


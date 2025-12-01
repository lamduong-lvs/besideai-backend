/**
 * Custom Provider Configuration (OpenAI-compatible)
 */
export const customConfig = {
  providerId: 'custom',
  name: 'Custom (OpenAI)',
  type: 'openai-compatible',
  defaultBaseURL: '',
  defaultModel: '',
  defaultTemperature: 0.7,
  defaultMaxTokens: 2000,
  
  requiredFields: ['apiKey', 'baseURL'],
  optionalFields: [],
  
  validation: {
    apiKey: (key) => {
      if (!key) return false;
      return key.length > 5;
    },
    baseURL: (url) => {
      if (!url) return false;
      try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    }
  },
  
  getDefaultConfig: () => ({
    providerId: 'custom',
    name: 'Custom (OpenAI)',
    type: 'openai-compatible',
    apiKey: null,
    baseURL: '',
    currentModel: '',
    temperature: 0.7,
    maxTokens: 2000,
    models: []
  })
};


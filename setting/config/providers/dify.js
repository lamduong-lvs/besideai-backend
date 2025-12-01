/**
 * Dify Provider Configuration
 */
export const difyConfig = {
  providerId: 'dify',
  name: 'Dify',
  type: 'dify',
  defaultBaseURL: '',
  defaultModel: 'dify-chat',
  defaultTemperature: 0.7,
  defaultMaxTokens: 2000,
  
  requiredFields: ['apiKey', 'baseURL'],
  optionalFields: [],
  
  validation: {
    apiKey: (key) => {
      if (!key) return false;
      return key.length > 10;
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
    providerId: 'dify',
    name: 'Dify',
    type: 'dify',
    apiKey: null,
    baseURL: '',
    currentModel: 'dify-chat',
    temperature: 0.7,
    maxTokens: 2000,
    models: [
      { id: 'dify-chat', displayName: 'Dify Chat (mặc định)' }
    ]
  })
};


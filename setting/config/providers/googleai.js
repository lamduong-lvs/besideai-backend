/**
 * Google AI Provider Configuration
 */
export const googleaiConfig = {
  providerId: 'googleai',
  name: 'Google AI',
  type: 'google-ai',
  defaultBaseURL: 'https://generativelanguage.googleapis.com/v1beta/models',
  defaultModel: 'gemini-1.5-flash',
  defaultTemperature: 0.7,
  defaultMaxTokens: 2000,
  
  requiredFields: ['apiKey'],
  optionalFields: ['baseURL'],
  
  validation: {
    apiKey: (key) => {
      if (!key) return false;
      return key.length > 10; // Google API keys don't have specific prefix
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
    providerId: 'googleai',
    name: 'Google AI',
    type: 'google-ai',
    apiKey: null,
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/models',
    currentModel: 'gemini-1.5-flash',
    temperature: 0.7,
    maxTokens: 2000,
    models: []
  })
};


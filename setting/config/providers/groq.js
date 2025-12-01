/**
 * Groq Provider Configuration
 */
export const groqConfig = {
  providerId: 'groq',
  name: 'Groq',
  type: 'openai-compatible',
  defaultBaseURL: 'https://api.groq.com/openai/v1/chat/completions',
  defaultModel: 'llama-3.3-70b-versatile',
  defaultTemperature: 0.7,
  defaultMaxTokens: 2000,
  
  requiredFields: ['apiKey'],
  optionalFields: ['baseURL'],
  
  validation: {
    apiKey: (key) => {
      if (!key) return false;
      return key.startsWith('gsk_') || key.length > 10;
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
    providerId: 'groq',
    name: 'Groq',
    type: 'openai-compatible',
    apiKey: null,
    baseURL: 'https://api.groq.com/openai/v1/chat/completions',
    currentModel: 'llama-3.3-70b-versatile',
    temperature: 0.7,
    maxTokens: 2000,
    models: []
  })
};


/**
 * Anthropic Provider Configuration
 */
export const anthropicConfig = {
  providerId: 'anthropic',
  name: 'Anthropic',
  type: 'anthropic',
  defaultBaseURL: 'https://api.anthropic.com/v1/messages',
  defaultModel: 'claude-3-5-sonnet-20241022',
  defaultTemperature: 0.7,
  defaultMaxTokens: 2000,
  defaultAnthropicVersion: '2023-06-01',
  
  requiredFields: ['apiKey'],
  optionalFields: ['baseURL', 'anthropicVersion'],
  
  validation: {
    apiKey: (key) => {
      if (!key) return false;
      return key.startsWith('sk-ant-') || key.length > 10;
    },
    baseURL: (url) => {
      if (!url) return true;
      try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    },
    anthropicVersion: (version) => {
      if (!version) return true;
      // Format: YYYY-MM-DD
      return /^\d{4}-\d{2}-\d{2}$/.test(version);
    }
  },
  
  getDefaultConfig: () => ({
    providerId: 'anthropic',
    name: 'Anthropic',
    type: 'anthropic',
    apiKey: null,
    baseURL: 'https://api.anthropic.com/v1/messages',
    anthropicVersion: '2023-06-01',
    currentModel: 'claude-3-5-sonnet-20241022',
    temperature: 0.7,
    maxTokens: 2000,
    models: []
  })
};


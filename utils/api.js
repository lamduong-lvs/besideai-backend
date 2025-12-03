// utils/api.js - API Manager used by panel & other modules

const DEFAULT_CONFIGS = {
  cerebras: {
    providerId: 'cerebras',
    name: 'Cerebras',
    type: 'openai-compatible',
    apiKey: null,
    baseURL: 'https://api.cerebras.ai/v1/chat/completions',
    currentModel: 'llama-4-scout-17b-16e-instruct',
    temperature: 0.7,
    maxTokens: 2000,
    models: []
  },
  openai: {
    providerId: 'openai',
    name: 'OpenAI',
    type: 'openai-compatible',
    apiKey: null,
    baseURL: 'https://api.openai.com/v1/chat/completions',
    currentModel: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 2000,
    models: []
  },
  groq: {
    providerId: 'groq',
    name: 'Groq',
    type: 'openai-compatible',
    apiKey: null,
    baseURL: 'https://api.groq.com/openai/v1/chat/completions',
    currentModel: 'llama-3.3-70b-versatile',
    temperature: 0.7,
    maxTokens: 2000,
    models: []
  },
  anthropic: {
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
  },
  googleai: {
    providerId: 'googleai',
    name: 'Google AI',
    type: 'google-ai',
    apiKey: null,
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/models',
    currentModel: 'gemini-1.5-flash',
    temperature: 0.7,
    maxTokens: 2000,
    models: []
  },
  dify: {
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
  },
  custom: {
    providerId: 'custom',
    name: 'Custom (OpenAI)',
    type: 'openai-compatible',
    apiKey: null,
    baseURL: '',
    currentModel: '',
    temperature: 0.7,
    maxTokens: 2000,
    models: []
  }
};

const translate = (key, fallback) => {
  try {
    if (typeof Lang !== 'undefined' && typeof Lang.get === 'function') {
      const result = Lang.get(key);
      if (result) return result;
    }
  } catch (e) {
    // ignore translation errors
  }
  return fallback;
};

class APIManager {
  constructor() {
    this.configs = this._cloneDefaults();
    this.activeProvider = 'cerebras';
    this.customCounter = 0;
  }

  _cloneDefaults() {
    return JSON.parse(JSON.stringify(DEFAULT_CONFIGS));
  }

  _ensureProvider(providerId) {
    if (!providerId) return;
    const normalized = providerId.toLowerCase();
    if (!this.configs[normalized]) {
      const base = DEFAULT_CONFIGS[normalized]
        ? JSON.parse(JSON.stringify(DEFAULT_CONFIGS[normalized]))
        : {
            providerId: normalized,
            name: normalized,
            type: 'openai-compatible',
            apiKey: null,
            baseURL: '',
            currentModel: '',
            temperature: 0.7,
            maxTokens: 2000,
            models: []
          };
      if (!Array.isArray(base.models)) base.models = [];
      this.configs[normalized] = base;
    } else {
      if (!this.configs[normalized].providerId) {
        this.configs[normalized].providerId = normalized;
      }
      if (!Array.isArray(this.configs[normalized].models)) {
        this.configs[normalized].models = [];
      }
    }
  }

  async loadFromStorage() {
    try {
      const data = await chrome.storage.local.get(['apiConfigs', 'activeProvider']);
      this.configs = this._cloneDefaults();

      if (data.apiConfigs) {
        for (const providerId of Object.keys(data.apiConfigs)) {
          const normalized = providerId.toLowerCase();
          const stored = data.apiConfigs[providerId] || {};
          if (this.configs[normalized]) {
            this.configs[normalized] = {
              ...this.configs[normalized],
              ...stored,
              providerId: normalized
            };
          } else {
            this.configs[normalized] = {
              providerId: normalized,
              ...stored
            };
          }
          if (!Array.isArray(this.configs[normalized].models)) {
            this.configs[normalized].models = [];
          }
        }
      }

      if (data.activeProvider) {
        this.activeProvider = String(data.activeProvider).toLowerCase();
      }
      if (!this.configs[this.activeProvider]) {
        this.activeProvider = 'cerebras';
      }

      // Info log - comment out to reduce console noise
      // console.log('[APIManager] Configs loaded:', this.configs);
    } catch (error) {
      console.error(translate('apiErrorLoadConfig', `Không thể tải cấu hình API: ${error?.message || error}`));
    }
  }

  async saveToStorage() {
    try {
      await chrome.storage.local.set({
        apiConfigs: this.configs,
        activeProvider: this.activeProvider
      });
      console.log('[APIManager] Configs saved to storage.');
    } catch (error) {
      console.error(translate('apiErrorSaveConfig', `Không thể lưu cấu hình API: ${error?.message || error}`));
    }
  }

  getAllProviders() {
    const providers = [];
    const seen = new Set();

    for (const providerId of Object.keys(DEFAULT_CONFIGS)) {
      this._ensureProvider(providerId);
      providers.push(this.configs[providerId]);
      seen.add(providerId);
    }

    for (const providerId of Object.keys(this.configs)) {
      if (!seen.has(providerId)) {
        this._ensureProvider(providerId);
        providers.push(this.configs[providerId]);
      }
    }

    return providers;
  }

  getProvider(providerId) {
    if (!providerId) return null;
    const normalized = providerId.toLowerCase();
    this._ensureProvider(normalized);
    return this.configs[normalized];
  }

  getAllAddedModels() {
    const allModels = [];
    for (const providerId of Object.keys(this.configs)) {
      const provider = this.getProvider(providerId);
      if (!provider) continue;
      const hasApiKey = provider.apiKey || provider.providerId === 'cerebras';
      if (hasApiKey && Array.isArray(provider.models)) {
        provider.models.forEach(model => {
          allModels.push({
            id: model.id,
            displayName: model.displayName,
            providerName: provider.name,
            providerId: provider.providerId,
            fullModelId: `${provider.providerId}/${model.id}`
          });
        });
      }
    }
    return allModels;
  }

  updateConfig(providerId, updates = {}) {
    if (!providerId) return;
    const normalized = providerId.toLowerCase();
    this._ensureProvider(normalized);
    this.configs[normalized] = {
      ...this.configs[normalized],
      ...updates
    };
  }

  async updateProviderCredentials(providerId, credentials) {
    this.updateConfig(providerId, credentials);
    await this.saveToStorage();
  }

  addCustomConfig(config) {
    const id = config?.id || `custom_${Date.now()}_${(++this.customCounter).toString(36)}`;
    const normalized = id.toLowerCase();
    this.configs[normalized] = {
      providerId: normalized,
      name: config?.name || 'Custom Provider',
      type: config?.type || 'openai-compatible',
      apiKey: config?.apiKey || '',
      baseURL: config?.baseURL || '',
      currentModel: config?.model || '',
      temperature: config?.temperature ?? 0.7,
      maxTokens: config?.maxTokens ?? 2000,
      models: Array.isArray(config?.models) ? config.models : []
    };
    return normalized;
  }

  setActiveProvider(providerId) {
    if (!providerId) return;
    const normalized = providerId.toLowerCase();
    this._ensureProvider(normalized);
    this.activeProvider = normalized;
    chrome?.storage?.local?.set?.({ activeProvider: normalized }).catch?.(() => {});
  }

  getActiveConfig() {
    return this.getProvider(this.activeProvider);
  }

  getActiveModel() {
    const config = this.getActiveConfig();
    return config?.currentModel || '';
  }

  async addModelToProvider(providerId, modelData) {
    this._ensureProvider(providerId);
    const config = this.getProvider(providerId);
    if (!config) return;
    if (!Array.isArray(config.models)) {
      config.models = [];
    }
    if (config.models.some(model => model.id === modelData.id)) {
      console.warn(translate('apiWarnModelExists', `Model ${modelData.id} đã tồn tại trong ${providerId}`));
      return;
    }
    config.models.push(modelData);
    await this.saveToStorage();
  }

  async deleteModelFromProvider(providerId, modelId) {
    const config = this.getProvider(providerId);
    if (!config || !Array.isArray(config.models)) return;
    config.models = config.models.filter(model => model.id !== modelId);
    await this.saveToStorage();
  }

  getDefaultBaseURL(providerId) {
    return DEFAULT_CONFIGS[providerId]?.baseURL || '';
  }

  async sendMessage(messages = [], options = {}) {
    const providerId = (options.providerId || this.activeProvider || 'cerebras').toLowerCase();
    const config = this.getProvider(providerId);
    if (!config) {
      throw new Error(translate('apiErrorNoProvider', 'Không tìm thấy cấu hình API.'));
    }

    const model = options.model || config.currentModel || config.models?.[0]?.id;
    if (!model && config.type !== 'dify') {
      throw new Error(translate('apiErrorNoModel', 'Vui lòng chọn model trước khi gửi yêu cầu.'));
    }

    const temperature = options.temperature ?? config.temperature ?? 0.7;
    const maxTokens = options.maxTokens ?? config.maxTokens ?? 2000;
    const stream = options.stream === true;

    let url = config.baseURL || this.getDefaultBaseURL(providerId);
    let headers = { 'Content-Type': 'application/json' };
    let body;

    switch (config.type) {
      case 'anthropic': {
        if (!config.apiKey) {
          throw new Error(translate('apiErrorNoApiKey', 'Vui lòng nhập API key cho provider này.'));
        }
        headers = {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': config.anthropicVersion || '2023-06-01',
          'Accept': stream ? 'text/event-stream' : 'application/json'
        };
        body = {
          model,
          max_tokens: maxTokens,
          temperature,
          stream,
          messages: messages.map(item => ({
            role: item.role === 'assistant' ? 'assistant' : 'user',
            content: [{
              type: 'text',
              text: item.content
            }]
          }))
        };
        break;
      }

      case 'dify': {
        throw new Error(translate('apiErrorUnsupportedType', 'Dify chưa được hỗ trợ trong Panel.'));
      }

      case 'openai-compatible':
      case 'groq':
      case 'cerebras':
      default: {
        if (config.apiKey) {
          headers['Authorization'] = `Bearer ${config.apiKey}`;
        }
        if (stream) {
          headers['Accept'] = 'text/event-stream';
        }
        body = {
          model,
          stream,
          temperature,
          max_tokens: maxTokens,
          messages
        };
        break;
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      let errorMessage;
      try {
        const errorJson = await response.json();
        errorMessage = errorJson?.error?.message || JSON.stringify(errorJson);
      } catch (err) {
        errorMessage = await response.text();
      }
      throw new Error(errorMessage || `HTTP ${response.status}: ${response.statusText}`);
    }

    if (stream && !response.body) {
      throw new Error(translate('apiErrorNoStream', 'Phản hồi không hỗ trợ stream.'));
    }

    return response;
  }

  async testConnection(configOrProvider) {
    let config;
    let model;

    if (typeof configOrProvider === 'string') {
      const providerId = configOrProvider;
      config = { ...this.getProvider(providerId) };
      model = arguments[1] || config?.currentModel;
    } else {
      config = { ...(configOrProvider || {}) };
      model = config.model || config.currentModel;
    }

    if (!config || !config.apiKey) {
      return { success: false, message: translate('apiErrorNoApiKey', 'Vui lòng nhập API key trước.') };
    }

    if (!model && config.type !== 'dify') {
      return { success: false, message: translate('apiErrorNoModel', 'Chưa chọn model để kiểm tra.') };
    }

    let url = config.baseURL || this.getDefaultBaseURL(config.providerId || '');
    let fetchOptions = {};

    try {
      switch (config.type || 'openai-compatible') {
        case 'openai-compatible':
        case 'groq':
        case 'cerebras':
        case undefined: {
          fetchOptions = {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
              model: model || config.currentModel,
              messages: [{ role: 'user', content: 'Ping' }],
              max_tokens: 5,
              stream: false
            })
          };
          break;
        }
        case 'anthropic': {
          fetchOptions = {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': config.apiKey,
              'anthropic-version': config.anthropicVersion || '2023-06-01'
            },
            body: JSON.stringify({
              model,
              max_tokens: 5,
              messages: [{
                role: 'user',
                content: [{ type: 'text', text: 'Ping' }]
              }]
            })
          };
          break;
        }
        case 'dify': {
          url = `${config.baseURL?.replace(/\/$/, '') || ''}/chat-messages`;
          fetchOptions = {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
              query: 'Ping',
              response_mode: 'blocking',
              user: 'api-test'
            })
          };
          break;
        }
        case 'google-ai': {
          const testModel = model || config.currentModel || 'gemini-1.5-flash';
          url = `${config.baseURL}/${testModel}:generateContent?key=${config.apiKey}`;
          fetchOptions = {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [{
                role: 'user',
                parts: [{ text: 'Ping' }]
              }],
              generationConfig: {
                maxOutputTokens: 5,
                temperature: 0.7
              }
            })
          };
          break;
        }
        default:
          return { success: false, message: translate('apiErrorUnsupportedType', 'Loại provider chưa được hỗ trợ.') };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      fetchOptions.signal = controller.signal;

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      if (response.ok) {
        return { success: true, message: translate('successConnection', 'Kết nối thành công!') };
      }

      let errorMessage;
      try {
        const errorJson = await response.json();
        errorMessage = errorJson?.error?.message || JSON.stringify(errorJson);
      } catch (err) {
        errorMessage = await response.text();
      }
      return { success: false, message: errorMessage || `HTTP ${response.status}` };
    } catch (error) {
      if (error.name === 'AbortError') {
        return { success: false, message: translate('apiErrorTimeout', 'Yêu cầu mất quá nhiều thời gian.') };
      }
      return {
        success: false,
        message: error?.message || translate('apiErrorGeneric', 'Không thể kiểm tra kết nối.')
      };
    }
  }
}

function checkModelSupportsFiles(providerId, modelId, providerType) {
  if (providerId === 'googleai' || providerType === 'google-ai') {
    return true;
  }
  if (providerId === 'anthropic' || providerType === 'anthropic') {
    return modelId.includes('claude-3') || modelId.includes('claude-3.5') || modelId.includes('claude-3-opus') || modelId.includes('claude-3-sonnet') || modelId.includes('claude-3-haiku');
  }
  if (providerId === 'openai' || providerType === 'openai-compatible') {
    const multimodalModels = [
      'gpt-4o', 'gpt-4-turbo', 'gpt-4-vision-preview', 'gpt-4o-mini',
      'gpt-4', 'gpt-4-1106-preview', 'gpt-4-0125-preview'
    ];
    return multimodalModels.some(m => modelId.includes(m));
  }
  if (providerId === 'groq') {
    return false;
  }
  if (providerId === 'cerebras') {
    return false;
  }
  if (providerId === 'dify' || providerType === 'dify') {
    return false;
  }
  return false;
}

/**
 * Loại bỏ thẻ <think> và <think> khỏi content
 */
function removeRedactedReasoning(content) {
  let processed = content;
  
  // Loại bỏ thẻ <think>...</think> (case-insensitive, multiline) - trong markdown
  const thinkRegex = /<think>([\s\S]*?)<\/think>/gi;
  processed = processed.replace(thinkRegex, '');
  
  // Loại bỏ thẻ <think>...</think> (case-insensitive, multiline) - trong HTML
  const redactedReasoningRegex = /<redacted_reasoning[^>]*>([\s\S]*?)<\/redacted_reasoning>/gi;
  processed = processed.replace(redactedReasoningRegex, '');
  
  return processed;
}

/**
 * Kiểm tra xem content có chứa thẻ thinking đang mở (chưa đóng) không
 */
function hasOpenThinkingTag(content) {
  // Kiểm tra thẻ <think> đang mở
  const thinkOpenMatches = content.match(/<think[^>]*>/gi) || [];
  const thinkCloseMatches = content.match(/<\/think>/gi) || [];
  const hasOpenThink = thinkOpenMatches.length > thinkCloseMatches.length;
  
  // Kiểm tra thẻ <think> đang mở
  const redactedOpenMatches = content.match(/<redacted_reasoning[^>]*>/gi) || [];
  const redactedCloseMatches = content.match(/<\/redacted_reasoning>/gi) || [];
  const hasOpenRedacted = redactedOpenMatches.length > redactedCloseMatches.length;
  
  return hasOpenThink || hasOpenRedacted;
}

/**
 * Parse SSE stream and extract content chunks
 */
async function parseSSEStream(reader, onChunk, onDone, onError) {
  const decoder = new TextDecoder();
  let buffer = '';
  let accumulatedContent = '';
  let lastCleanedContent = ''; // Lưu content đã được làm sạch lần trước
  let wasInThinkingTag = false; // Track xem có đang trong thinking tag không
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue; // Skip empty lines
        
        if (trimmedLine.startsWith('data: ')) {
          const data = trimmedLine.slice(6).trim();
          if (data === '[DONE]') {
            // Loại bỏ thinking trước khi done
            const finalCleaned = removeRedactedReasoning(accumulatedContent);
            onDone(finalCleaned);
            return;
          }
          
          if (!data) continue; // Skip empty data lines
          
          try {
            const json = JSON.parse(data);
            let chunk = '';
            
            // OpenAI format
            if (json.choices?.[0]?.delta?.content) {
              chunk = json.choices[0].delta.content || '';
            }
            // Anthropic format (new API)
            else if (json.type === 'content_block_delta' && json.delta?.text) {
              chunk = json.delta.text || '';
            }
            // Anthropic format (alternative)
            else if (json.delta?.text) {
              chunk = json.delta.text || '';
            }
            // OpenAI format (alternative - check for finish_reason)
            else if (json.choices?.[0]?.finish_reason) {
              // Stream ended, but no content in this chunk
              continue;
            }
            
            // Only send non-empty chunks
            if (chunk && chunk.length > 0) {
              // Kiểm tra xem chunk hiện tại có chứa thẻ mở không
              const thinkOpenInChunk = /<think[^>]*>/i.test(chunk) || /<redacted_reasoning[^>]*>/i.test(chunk);
              const thinkCloseInChunk = /<\/think>/i.test(chunk) || /<\/redacted_reasoning>/i.test(chunk);
              
              // Nếu đang trong thinking tag, chỉ thêm vào accumulated nhưng không gửi
              if (wasInThinkingTag) {
                accumulatedContent += chunk;
                
                // Nếu thẻ đóng xuất hiện trong chunk này
                if (thinkCloseInChunk) {
                  wasInThinkingTag = false;
                  // Loại bỏ thinking từ accumulated content
                  const cleanedContent = removeRedactedReasoning(accumulatedContent);
                  
                  // Tìm phần content sau thẻ đóng để gửi
                  // Tách chunk thành phần trước và sau thẻ đóng
                  let contentAfterClose = '';
                  if (/<\/think>/i.test(chunk)) {
                    const match = chunk.match(/<\/think>(.*)/is);
                    if (match && match[1]) {
                      contentAfterClose = match[1];
                    }
                  } else if (/<\/redacted_reasoning>/i.test(chunk)) {
                    const match = chunk.match(/<\/redacted_reasoning>(.*)/is);
                    if (match && match[1]) {
                      contentAfterClose = match[1];
                    }
                  }
                  
                  // Cập nhật lastCleanedContent và gửi phần content sau thẻ đóng
                  lastCleanedContent = cleanedContent;
                  if (contentAfterClose.length > 0) {
                    onChunk(contentAfterClose);
                    lastCleanedContent += contentAfterClose;
                  }
                }
                continue; // Không gửi chunk này
              }
              
              // Nếu thẻ mở xuất hiện trong chunk này
              if (thinkOpenInChunk) {
                wasInThinkingTag = true;
                
                // Tách chunk thành phần trước và sau thẻ mở
                let contentBeforeOpen = '';
                let contentAfterOpen = '';
                
                if (/<think[^>]*>/i.test(chunk)) {
                  const match = chunk.match(/^(.*?)<think[^>]*>(.*)$/is);
                  if (match) {
                    contentBeforeOpen = match[1] || '';
                    contentAfterOpen = match[2] || '';
                  }
                } else if (/<redacted_reasoning[^>]*>/i.test(chunk)) {
                  const match = chunk.match(/^(.*?)<redacted_reasoning[^>]*>(.*)$/is);
                  if (match) {
                    contentBeforeOpen = match[1] || '';
                    contentAfterOpen = match[2] || '';
                  }
                }
                
                // Chỉ gửi phần content trước thẻ mở (nếu có)
                if (contentBeforeOpen.length > 0) {
                  accumulatedContent += contentBeforeOpen;
                  const cleanedContent = removeRedactedReasoning(accumulatedContent);
                  if (cleanedContent.length > lastCleanedContent.length) {
                    const newChunk = cleanedContent.slice(lastCleanedContent.length);
                    if (newChunk.length > 0) {
                      lastCleanedContent = cleanedContent;
                      onChunk(newChunk);
                    }
                  }
                }
                
                // Thêm phần còn lại của chunk vào accumulated (từ thẻ mở trở đi, không gửi)
                // Phần còn lại = chunk - contentBeforeOpen
                const remainingChunk = chunk.substring(contentBeforeOpen.length);
                accumulatedContent += remainingChunk;
                
                // Kiểm tra xem thẻ có đóng ngay trong chunk này không
                if (thinkCloseInChunk) {
                  wasInThinkingTag = false;
                  // Loại bỏ thinking từ accumulated content
                  const cleanedContent = removeRedactedReasoning(accumulatedContent);
                  lastCleanedContent = cleanedContent;
                  
                  // Tìm phần content sau thẻ đóng trong remainingChunk
                  let contentAfterClose = '';
                  if (/<\/think>/i.test(remainingChunk)) {
                    const match = remainingChunk.match(/<\/think>(.*)/is);
                    if (match && match[1]) {
                      contentAfterClose = match[1];
                    }
                  } else if (/<\/redacted_reasoning>/i.test(remainingChunk)) {
                    const match = remainingChunk.match(/<\/redacted_reasoning>(.*)/is);
                    if (match && match[1]) {
                      contentAfterClose = match[1];
                    }
                  }
                  
                  if (contentAfterClose.length > 0) {
                    onChunk(contentAfterClose);
                    lastCleanedContent += contentAfterClose;
                  }
                }
                
                continue; // Không xử lý thêm
              }
              
              // Không có thẻ thinking, xử lý bình thường
              accumulatedContent += chunk;
              const cleanedContent = removeRedactedReasoning(accumulatedContent);
              
              // Chỉ gửi phần content mới (diff giữa cleaned và lastCleaned)
              if (cleanedContent.length > lastCleanedContent.length) {
                const newChunk = cleanedContent.slice(lastCleanedContent.length);
                if (newChunk.length > 0) {
                  lastCleanedContent = cleanedContent;
                  onChunk(newChunk);
                }
              } else if (cleanedContent.length < lastCleanedContent.length) {
                // Nếu cleaned content ngắn hơn (thinking bị loại bỏ), reset
                lastCleanedContent = cleanedContent;
              }
            }
          } catch (e) {
            // Ignore parse errors for non-JSON lines (like comments or empty data)
            // But log for debugging
            if (data && !data.startsWith(':')) {
              console.warn('[APIManager] Failed to parse SSE data:', data.substring(0, 100), e);
            }
          }
        } else if (trimmedLine.startsWith('event:')) {
          // Handle SSE events if needed
          continue;
        } else if (trimmedLine.startsWith('id:')) {
          // Handle SSE IDs if needed
          continue;
        }
      }
    }
    
    // Loại bỏ thinking trước khi done
    const finalCleaned = removeRedactedReasoning(accumulatedContent);
    onDone(finalCleaned);
  } catch (error) {
    onError(error);
  }
}

// ========================================
// WRAPPER FUNCTIONS - Backward Compatibility
// These functions now use the new AI dispatcher module
// ========================================

// Lazy load dispatcher to avoid circular dependencies
// Note: Cannot use dynamic import() in Service Worker, so we check context first
let aiDispatcher = null;
let dispatcherInitialized = false;
let dispatcherModule = null;

// Check if we're in a Service Worker context
function isServiceWorker() {
  try {
    return typeof ServiceWorkerGlobalScope !== 'undefined' && 
           self instanceof ServiceWorkerGlobalScope;
  } catch (e) {
    return false;
  }
}

async function initializeDispatcher() {
  if (dispatcherInitialized) return;
  
  // Service Worker không hỗ trợ dynamic import(), chỉ dùng fallback
  if (isServiceWorker()) {
    dispatcherInitialized = true;
    console.log('[APIManager] Service Worker context detected, using fallback implementation');
    return;
  }
  
  try {
    // Chỉ dùng dynamic import trong non-service-worker context
    dispatcherModule = await import('/modules/ai/index.js');
    const { AIDispatcher } = dispatcherModule;
    
    aiDispatcher = new AIDispatcher({
      apiManager: apiManager,
      getLang: (key, params) => {
        try {
          if (typeof Lang !== 'undefined' && typeof Lang.get === 'function') {
            return Lang.get(key, params);
          }
        } catch (e) {}
        return key;
      },
      debugLog: (tag, ...args) => {
        if (typeof console !== 'undefined' && console.log) {
          console.log(`[${tag}]`, ...args);
        }
      }
    });
    dispatcherInitialized = true;
    console.log('[APIManager] AI Dispatcher initialized');
  } catch (error) {
    console.error('[APIManager] Failed to initialize dispatcher:', error);
    // Fall back to old implementation
    dispatcherInitialized = true;
  }
}

async function callSingleModel(fullModelId, messages, signal, apiManager, getLang, debugLog, APIError, streamCallback = null) {
  // Try to use new dispatcher if available
  await initializeDispatcher();
  
  if (aiDispatcher && dispatcherInitialized) {
    try {
      const result = await aiDispatcher.dispatch({
        mode: 'single',
        messages: messages,
        config: {
          models: [fullModelId]
        },
        streamCallback: streamCallback,
        signal: signal
      });
      return result;
    } catch (error) {
      // If dispatcher fails, fall back to old implementation
      console.warn('[APIManager] Dispatcher failed, using fallback:', error);
    }
  }
  
  // Fallback to original implementation
  return callSingleModelOriginal(fullModelId, messages, signal, apiManager, getLang, debugLog, APIError, streamCallback);
}

async function callSingleModelOriginal(fullModelId, messages, signal, apiManager, getLang, debugLog, APIError, streamCallback = null) {
  debugLog('callSingleModel', 'Calling model:', fullModelId, streamCallback ? '(streaming)' : '(non-streaming)');
  
  const separatorIndex = fullModelId.indexOf('/');
  if (separatorIndex === -1) {
    throw new Error(getLang('errorInvalidFullModelId', { fullModelId: fullModelId }));
  }
  
  const providerId = fullModelId.substring(0, separatorIndex);
  const modelId = fullModelId.substring(separatorIndex + 1);
  
  if (!providerId || !modelId) {
    throw new Error(getLang('errorInvalidProviderModelId', { fullModelId: fullModelId }));
  }
  
  const config = apiManager.getProvider(providerId);
  if (!config) {
    throw new APIError(getLang('errorProviderConfigNotFound', { providerId: providerId }), 404, providerId);
  }
  
  if (!config.apiKey && providerId.toLowerCase() !== 'cerebras') {
    throw new APIError(getLang('errorApiKeyNotConfigured', { name: config.name }), 401, providerId);
  }
  
  let url = config.baseURL;
  let fetchOptions = { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' }, 
    signal: signal 
  };
  const lastMessageContent = messages[messages.length - 1]?.content || "";
  const useStreaming = streamCallback !== null;
  
  try {
    const processedMessages = messages.map(message => {
      if (message.images && message.images.length > 0) {
        const content = [];
        if (message.content && message.content.trim()) {
          content.push({
            type: 'text',
            text: message.content
          });
        }
        message.images.forEach(imageUrl => {
          content.push({
            type: 'image_url',
            image_url: {
              url: imageUrl
            }
          });
        });
        return {
          role: message.role === 'ai' || message.role === 'assistant' ? 'assistant' : (message.role || 'user'),
          content: content
        };
      }
      return {
        role: message.role === 'ai' || message.role === 'assistant' ? 'assistant' : (message.role || 'user'),
        content: message.content || ''
      };
    });
    
    switch (config.type) {
      case 'openai-compatible':
        fetchOptions.headers['Authorization'] = `Bearer ${config.apiKey}`;
        if (useStreaming) {
          fetchOptions.headers['Accept'] = 'text/event-stream';
        }
        fetchOptions.body = JSON.stringify({ 
          model: modelId, 
          messages: processedMessages, 
          temperature: 0.7, 
          max_tokens: 4000, 
          stream: useStreaming 
        });
        break;
      case 'anthropic':
        fetchOptions.headers['x-api-key'] = config.apiKey;
        fetchOptions.headers['anthropic-version'] = config.anthropicVersion || '2023-06-01';
        if (useStreaming) {
          fetchOptions.headers['Accept'] = 'text/event-stream';
        }
        const anthropicMessages = processedMessages.filter(m => m.role !== 'system').map(m => ({ 
          ...m, 
          role: m.role === 'ai' ? 'assistant' : m.role 
        }));
        fetchOptions.body = JSON.stringify({ 
          model: modelId, 
          messages: anthropicMessages, 
          temperature: 0.7, 
          max_tokens: 4000, 
          stream: useStreaming 
        });
        break;
      case 'dify':
        url = `${config.baseURL}/chat-messages`;
        fetchOptions.headers['Authorization'] = `Bearer ${config.apiKey}`;
        fetchOptions.body = JSON.stringify({ 
          query: lastMessageContent, 
          inputs: {}, 
          response_mode: 'blocking', 
          user: 'askai-extension-user' 
        });
        break;
      case 'google-ai':
        const googleContents = [];
        let systemInstruction = null;
        processedMessages.forEach(msg => {
          if (msg.role === 'system') {
            systemInstruction = msg.content;
          } else {
            const role = msg.role === 'assistant' || msg.role === 'ai' ? 'model' : 'user';
            if (Array.isArray(msg.content)) {
              const parts = msg.content.map(item => {
                if (item.type === 'text') {
                  return { text: item.text };
                } else if (item.type === 'image_url') {
                  return {
                    inlineData: {
                      mimeType: 'image/jpeg',
                      data: item.image_url.url.split(',')[1] || item.image_url.url
                    }
                  };
                }
                return null;
              }).filter(Boolean);
              if (parts.length > 0) {
                googleContents.push({ role, parts });
              }
            } else if (typeof msg.content === 'string') {
              googleContents.push({
                role,
                parts: [{ text: msg.content }]
              });
            }
          }
        });
        const googleBody = {
          contents: googleContents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4000
          }
        };
        if (systemInstruction) {
          googleBody.systemInstruction = {
            parts: [{ text: systemInstruction }]
          };
        }
        url = `${config.baseURL}/${modelId}:generateContent?key=${config.apiKey}`;
        fetchOptions.body = JSON.stringify(googleBody);
        break;
      default:
        throw new Error(getLang('errorApiTypeNotSupported', { type: config.type }));
    }
    
    debugLog('callSingleModel', `Fetching ${url} for ${fullModelId}`);
    const response = await fetch(url, fetchOptions);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      let errMsg = errorData.error?.message || errorData.message || response.statusText;
      const hasImages = messages.some(msg => msg.images && msg.images.length > 0);
      const hasAttachedFiles = messages.some(msg => msg.attachedFiles && msg.attachedFiles.length > 0);
      const hasFiles = hasImages || hasAttachedFiles;
      const errorMsgLower = (errMsg || '').toLowerCase();
      const isFileError = hasFiles && (
        errorMsgLower.includes('image') ||
        errorMsgLower.includes('file') ||
        errorMsgLower.includes('attachment') ||
        errorMsgLower.includes('document') ||
        errorMsgLower.includes('multimodal') ||
        errorMsgLower.includes('unsupported') ||
        errorMsgLower.includes('not support') ||
        (errorMsgLower.includes('invalid') && (errorMsgLower.includes('content') || errorMsgLower.includes('message')))
      );
      if (isFileError) {
        errMsg = getLang('errorModelNotSupportImages');
      } else if (response.status === 429) {
        errMsg = getLang('errorApi429');
      } else if (response.status === 401) {
        errMsg = getLang('errorApi401');
      } else if (response.status === 404 && config.type === 'openai-compatible') {
        errMsg = getLang('errorApi404', { modelId: modelId });
      }
      throw new APIError(errMsg, response.status, config.name);
    }
    
    // Handle streaming response
    if (useStreaming && streamCallback && response.body) {
      const reader = response.body.getReader();
      let finalContent = '';
      
      await parseSSEStream(
        reader,
        (chunk) => {
          finalContent += chunk;
          if (streamCallback) {
            streamCallback({ type: 'chunk', chunk: chunk });
          }
        },
        (accumulatedContent) => {
          finalContent = accumulatedContent;
          if (streamCallback) {
            streamCallback({ type: 'done', finalContent: finalContent });
          }
        },
        (error) => {
          if (streamCallback) {
            streamCallback({ type: 'error', error: error.message });
          }
          throw error;
        }
      );
      
      return { content: finalContent.trim(), providerId: providerId, fullModelId: fullModelId, streamed: true };
    }
    
    // Non-streaming response (original logic)
    const result = await response.json();
    debugLog('callSingleModel', `Received result for ${fullModelId}`);
    
    let content = '';
    switch (config.type) {
      case 'openai-compatible':
        content = result.choices?.[0]?.message?.content;
        break;
      case 'anthropic':
        content = result.content?.[0]?.text;
        break;
      case 'dify':
        content = result.answer;
        break;
      case 'google-ai':
        const candidate = result.candidates?.[0];
        if (candidate && candidate.content && candidate.content.parts) {
          content = candidate.content.parts
            .map(part => part.text || '')
            .filter(text => text)
            .join('');
        }
        break;
    }
    
    if (content === undefined || content === null) {
      console.error("Could not extract content from API response:", result);
      throw new Error(getLang('errorApiExtractContent'));
    }
    
    return { content: content.trim(), providerId: providerId, fullModelId: fullModelId, streamed: false };
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    if (error.name === 'AbortError') {
      debugLog('callSingleModel', `Request aborted for ${fullModelId}`);
      throw error;
    }
    console.error(`Error in callSingleModel for ${fullModelId}:`, error);
    throw new APIError(
      getLang('errorApiCallFailed', { name: (config?.name || providerId), message: error.message }), 
      500, 
      config?.name || providerId
    );
  }
}

async function executeSharedAI(messages, apiManager, getLang, debugLog, callSingleModelFn, APIError) {
  await apiManager.loadFromStorage();
  const settings = await chrome.storage.local.get(['selectedModel', 'aiProvider']);
  const selectedModel = settings.selectedModel || settings.aiProvider;
  
  if (!selectedModel) {
    debugLog('executeSharedAI', 'AI execution failed', 'No model configured');
    throw new Error(getLang('errorNoModelConfigured'));
  }
  
  debugLog('executeSharedAI', 'Running Single Mode', selectedModel);
  return await callSingleModelFn(selectedModel, messages, null, apiManager, getLang, debugLog, APIError);
}


class APIError extends Error {
  constructor(message, statusCode, provider) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.provider = provider;
  }
}

class NetworkError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NetworkError';
  }
}

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

const apiManager = new APIManager();

export {
  apiManager,
  APIManager,
  APIError,
  NetworkError,
  ValidationError,
  checkModelSupportsFiles,
  callSingleModel,
  executeSharedAI
};

if (typeof window !== 'undefined') {
  window.APIManager = APIManager;
  window.apiManager = apiManager;
  window.APIError = APIError;
  window.NetworkError = NetworkError;
  window.ValidationError = ValidationError;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    apiManager,
    APIManager,
    APIError,
    NetworkError,
    ValidationError
  };
}

// Module loaded successfully (info only, comment out to reduce console noise)
// console.log('[APIManager] ✓ Module loaded (hybrid mode - ES6 + Global)');
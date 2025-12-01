/**
 * Single Mode Handler
 * Executes AI request using a single model
 */

import { createAdapter } from '../../adapters/index.js';
import { APIError } from '../../utils/error-handler.js';
import { processMessages, hasFiles } from '../../utils/message-processor.js';

/**
 * Parse full model ID into provider and model IDs
 */
function parseFullModelId(fullModelId) {
  const separatorIndex = fullModelId.indexOf('/');
  if (separatorIndex === -1) {
    throw new Error(`Invalid full model ID format: ${fullModelId}`);
  }
  
  const providerId = fullModelId.substring(0, separatorIndex);
  const modelId = fullModelId.substring(separatorIndex + 1);
  
  if (!providerId || !modelId) {
    throw new Error(`Invalid provider or model ID: ${fullModelId}`);
  }
  
  return { providerId, modelId };
}

/**
 * Parse SSE stream for streaming responses
 */
async function parseSSEStream(reader, onChunk, onDone, onError) {
  const decoder = new TextDecoder();
  let buffer = '';
  let accumulatedContent = '';
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        
        if (trimmedLine.startsWith('data: ')) {
          const data = trimmedLine.slice(6).trim();
          if (data === '[DONE]') {
            onDone(accumulatedContent);
            return;
          }
          
          if (!data) continue;
          
          try {
            const json = JSON.parse(data);
            let chunk = '';
            
            // OpenAI format
            if (json.choices?.[0]?.delta?.content) {
              chunk = json.choices[0].delta.content || '';
            }
            // Anthropic format
            else if (json.type === 'content_block_delta' && json.delta?.text) {
              chunk = json.delta.text || '';
            }
            else if (json.delta?.text) {
              chunk = json.delta.text || '';
            }
            
            if (chunk && chunk.length > 0) {
              accumulatedContent += chunk;
              onChunk(chunk);
            }
          } catch (e) {
            // Ignore parse errors for non-JSON lines
            if (data && !data.startsWith(':')) {
              console.warn('[SingleMode] Failed to parse SSE data:', data.substring(0, 100));
            }
          }
        }
      }
    }
    
    onDone(accumulatedContent);
  } catch (error) {
    onError(error);
  }
}

/**
 * Execute single model request
 */
export async function executeSingleMode(fullModelId, messages, options = {}) {
  const {
    apiManager,
    getLang = (key, params) => key,
    debugLog = () => {},
    signal = null,
    streamCallback = null
  } = options;
  
  if (!apiManager) {
    throw new Error('apiManager is required');
  }
  
  debugLog('SingleMode', 'Executing single mode for:', fullModelId);
  
  // Parse full model ID
  const { providerId, modelId } = parseFullModelId(fullModelId);
  
  // Get provider configuration
  const providerConfig = apiManager.getProvider(providerId);
  if (!providerConfig) {
    throw new APIError(
      getLang('errorProviderConfigNotFound', { providerId }),
      404,
      providerId
    );
  }
  
  // Validate API key (except for Cerebras)
  if (!providerConfig.apiKey && providerId.toLowerCase() !== 'cerebras') {
    throw new APIError(
      getLang('errorApiKeyNotConfigured', { name: providerConfig.name }),
      401,
      providerId
    );
  }
  
  // Create adapter
  const adapter = createAdapter(providerConfig);
  adapter.validateConfig();
  
  // Process messages
  const processedMessages = processMessages(messages, {
    includeImages: true,
    includeAttachedFiles: true,
    convertRoles: true
  });
  
  // Prepare request
  const url = adapter.getRequestURL(modelId);
  const useStreaming = streamCallback !== null;
  const headers = adapter.getRequestHeaders(useStreaming);
  const body = adapter.getRequestBody(processedMessages, modelId, {
    temperature: options.temperature ?? providerConfig.temperature ?? 0.7,
    maxTokens: options.maxTokens ?? providerConfig.maxTokens ?? 4000,
    stream: useStreaming
  });
  
  debugLog('SingleMode', `Fetching ${url} for ${fullModelId}`);
  
  // Make request
  const fetchOptions = {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal
  };
  
  const response = await fetch(url, fetchOptions);
  
  // Handle errors
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    let errMsg = errorData.error?.message || errorData.message || response.statusText;
    
    // Check for file support errors
    const hasFileSupportError = hasFiles(messages) && (
      errMsg.toLowerCase().includes('image') ||
      errMsg.toLowerCase().includes('file') ||
      errMsg.toLowerCase().includes('attachment') ||
      errMsg.toLowerCase().includes('multimodal') ||
      errMsg.toLowerCase().includes('unsupported')
    );
    
    if (hasFileSupportError) {
      errMsg = getLang('errorModelNotSupportImages');
    } else if (response.status === 429) {
      errMsg = getLang('errorApi429');
    } else if (response.status === 401) {
      errMsg = getLang('errorApi401');
    } else if (response.status === 404) {
      errMsg = getLang('errorApi404', { modelId });
    }
    
    throw new APIError(errMsg, response.status, providerConfig.name);
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
          streamCallback({ type: 'chunk', chunk });
        }
      },
      (accumulatedContent) => {
        finalContent = accumulatedContent;
        if (streamCallback) {
          streamCallback({ type: 'done', finalContent });
        }
      },
      (error) => {
        if (streamCallback) {
          streamCallback({ type: 'error', error: error.message });
        }
        throw error;
      }
    );
    
    return {
      content: finalContent.trim(),
      providerId,
      fullModelId,
      streamed: true
    };
  }
  
  // Handle non-streaming response
  const result = await response.json();
  debugLog('SingleMode', `Received result for ${fullModelId}`);
  
  const content = adapter.parseResponse(result);
  
  if (content === undefined || content === null) {
    console.error('Could not extract content from API response:', result);
    throw new Error(getLang('errorApiExtractContent'));
  }
  
  return {
    content: content.trim(),
    providerId,
    fullModelId,
    streamed: false
  };
}


/**
 * Server Client
 * Executes AI requests by sending them to a remote server
 * This prevents API keys from being exposed in the extension
 */

import { BaseClient } from './base-client.js';
import { NetworkError, APIError } from '../utils/error-handler.js';

export class ServerClient extends BaseClient {
  constructor(serverUrl, options = {}) {
    super();
    this.serverUrl = serverUrl;
    this.options = {
      timeout: 60000, // 60 seconds default timeout
      retryAttempts: 3,
      retryDelay: 1000,
      ...options
    };
  }
  
  /**
   * Retry logic for failed requests
   */
  async _retryRequest(requestFn, attempt = 1) {
    try {
      return await requestFn();
    } catch (error) {
      if (attempt >= this.options.retryAttempts) {
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, this.options.retryDelay * attempt));
      
      return await this._retryRequest(requestFn, attempt + 1);
    }
  }
  
  /**
   * Execute AI request on server
   */
  async execute(mode, messages, config) {
    if (!this.serverUrl) {
      throw new Error('Server URL not configured');
    }
    
    const requestFn = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);
      
      try {
        const response = await fetch(`${this.serverUrl}/api/ai/execute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            mode,
            messages,
            config
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || errorData.message || `Server error: ${response.status}`;
          
          if (response.status === 401) {
            throw new APIError('Unauthorized - Check server authentication', 401, 'Server');
          } else if (response.status === 403) {
            throw new APIError('Forbidden - Server rejected request', 403, 'Server');
          } else if (response.status === 429) {
            throw new APIError('Rate limit exceeded', 429, 'Server');
          } else if (response.status >= 500) {
            throw new APIError('Server error', response.status, 'Server');
          } else {
            throw new APIError(errorMessage, response.status, 'Server');
          }
        }
        
        const result = await response.json();
        
        // Validate response format
        if (!result || typeof result !== 'object') {
          throw new Error('Invalid server response format');
        }
        
        // Ensure response has required fields
        if (!result.content && result.content !== '') {
          throw new Error('Server response missing content field');
        }
        
        return {
          content: result.content || '',
          providerId: result.providerId || 'server',
          fullModelId: result.fullModelId || result.usedFullModelId || 'server/unknown',
          streamed: result.streamed || false
        };
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          throw new NetworkError('Request timeout');
        }
        
        if (error instanceof APIError || error instanceof NetworkError) {
          throw error;
        }
        
        // Network errors
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          throw new NetworkError('Cannot connect to server. Check your network connection.');
        }
        
        throw error;
      }
    };
    
    return await this._retryRequest(requestFn);
  }
  
  /**
   * Execute with streaming (using Server-Sent Events)
   */
  async executeStream(mode, messages, config, streamCallback) {
    if (!this.serverUrl) {
      throw new Error('Server URL not configured');
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);
    
    try {
      const response = await fetch(`${this.serverUrl}/api/ai/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          mode,
          messages,
          config,
          stream: true
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || `Server error: ${response.status}`;
        throw new APIError(errorMessage, response.status, 'Server');
      }
      
      // Parse SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalContent = '';
      
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
              if (streamCallback) {
                streamCallback({ type: 'done', finalContent });
              }
              return { 
                content: finalContent, 
                providerId: 'server',
                fullModelId: 'server/stream',
                streamed: true 
              };
            }
            
            try {
              const json = JSON.parse(data);
              if (json.chunk) {
                finalContent += json.chunk;
                if (streamCallback) {
                  streamCallback({ type: 'chunk', chunk: json.chunk });
                }
              } else if (json.error) {
                throw new APIError(json.error, json.statusCode || 500, 'Server');
              }
            } catch (e) {
              if (e instanceof APIError) {
                throw e;
              }
              // Ignore parse errors for non-JSON lines
            }
          }
        }
      }
      
      if (streamCallback) {
        streamCallback({ type: 'done', finalContent });
      }
      
      return { 
        content: finalContent, 
        providerId: 'server',
        fullModelId: 'server/stream',
        streamed: true 
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new NetworkError('Request timeout');
      }
      
      if (error instanceof APIError || error instanceof NetworkError) {
        throw error;
      }
      
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new NetworkError('Cannot connect to server. Check your network connection.');
      }
      
      throw error;
    }
  }
  
  supportsStreaming() {
    return true; // Server can support streaming via SSE
  }
}



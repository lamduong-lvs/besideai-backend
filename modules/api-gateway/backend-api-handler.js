/**
 * Backend API Handler
 * Unified handler for ALL tiers - ALL AI calls go through Backend
 * This is the ONLY way to call AI - no local calls, no fallback
 */

import { subscriptionAPIClient } from '../subscription/subscription-api-client.js';
import { usageTracker } from '../subscription/usage-tracker.js';
import { subscriptionManager } from '../subscription/subscription-manager.js';

class BackendAPIHandler {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize handler
   */
  async initialize() {
    await subscriptionAPIClient.ensureInitialized();
    this.initialized = true;
  }

  /**
   * Make API call - ALWAYS goes through Backend
   * Works for ALL tiers: Free, Professional, Premium
   * @param {Array} messages - Messages array
   * @param {Object} options - API options
   * @returns {Promise<Object>} API response
   */
  async call(messages, options = {}) {
    await this.ensureInitialized();

    console.log('[BackendAPIHandler] 📞 Making AI call through Backend');

    // Get auth token (required for all tiers)
    let token;
    try {
      token = await this.getAuthToken();
      if (!token) {
        console.error('[BackendAPIHandler] ❌ No auth token returned');
        throw new Error('Authentication required. Please login to use AI features.');
      }
      console.log('[BackendAPIHandler] ✅ Auth token obtained, length:', token.length);
    } catch (error) {
      console.error('[BackendAPIHandler] ❌ Failed to get auth token:', error.message);
      throw new Error('Authentication required. Please login to use AI features.');
    }

    // Get backend URL
    const backendUrl = await this.getBackendURL();
    console.log('[BackendAPIHandler]   Backend URL:', backendUrl);

    // Make request to backend
    const response = await this.callBackendAPI(backendUrl, token, messages, options);

    // Track usage locally (optional, for UI display)
    // Backend already tracks usage, this is just for local caching
    try {
      await usageTracker.trackCall({
        provider: response.providerId,
        model: response.modelId,
        tokens: response.tokens || { input: 0, output: 0, total: 0 },
        metadata: {
          feature: options.feature,
          tier: await subscriptionManager.getTier(),
          success: true
        }
      });

      // Sync usage to backend (async, don't wait)
      usageTracker.syncToBackend().catch(err => {
        console.error('[BackendAPIHandler] Failed to sync usage:', err);
      });
    } catch (trackError) {
      // Don't fail the request if tracking fails
      console.warn('[BackendAPIHandler] Failed to track usage locally:', trackError);
    }

    return response;
  }

  /**
   * Get auth token
   * Required for ALL tiers (including free)
   */
  async getAuthToken() {
    try {
      // Get from chrome.identity (works in service worker)
      return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: false }, (token) => {
          if (chrome.runtime.lastError) {
            const errorMsg = chrome.runtime.lastError.message;
            console.warn('[BackendAPIHandler] Failed to get auth token (non-interactive):', errorMsg);
            
            // Check if it's a "not logged in" error
            if (errorMsg && (errorMsg.includes('OAuth2') || errorMsg.includes('not found') || errorMsg.includes('No account'))) {
              console.log('[BackendAPIHandler] User not logged in, trying interactive...');
              // If non-interactive fails with "not logged in", try interactive
              chrome.identity.getAuthToken({ interactive: true }, (interactiveToken) => {
                if (chrome.runtime.lastError) {
                  const interactiveError = chrome.runtime.lastError.message;
                  console.error('[BackendAPIHandler] Failed to get auth token (interactive):', interactiveError);
                  reject(new Error('Authentication required. Please login to use AI features.'));
                } else {
                  console.log('[BackendAPIHandler] ✅ Got auth token (interactive)');
                  resolve(interactiveToken);
                }
              });
            } else {
              // Other errors - might be temporary, try interactive as fallback
              console.log('[BackendAPIHandler] Token error, trying interactive as fallback...');
              chrome.identity.getAuthToken({ interactive: true }, (interactiveToken) => {
                if (chrome.runtime.lastError) {
                  const interactiveError = chrome.runtime.lastError.message;
                  console.error('[BackendAPIHandler] Failed to get auth token (interactive):', interactiveError);
                  reject(new Error(`Authentication failed: ${interactiveError}. Please login again.`));
                } else {
                  console.log('[BackendAPIHandler] ✅ Got auth token (interactive fallback)');
                  resolve(interactiveToken);
                }
              });
            }
          } else {
            if (token) {
              console.log('[BackendAPIHandler] ✅ Got auth token (non-interactive)');
              resolve(token);
            } else {
              console.warn('[BackendAPIHandler] Token is null, trying interactive...');
              // Token is null, try interactive
              chrome.identity.getAuthToken({ interactive: true }, (interactiveToken) => {
                if (chrome.runtime.lastError) {
                  reject(new Error('Authentication required. Please login to use AI features.'));
                } else {
                  resolve(interactiveToken);
                }
              });
            }
          }
        });
      });
    } catch (error) {
      console.error('[BackendAPIHandler] Failed to get auth token:', error);
      throw error;
    }
  }

  /**
   * Get backend URL
   */
  async getBackendURL() {
    try {
      const data = await chrome.storage.local.get(['backend_config']);
      return data.backend_config?.url || 'https://besideai-backend.vercel.app';
    } catch (error) {
      return 'https://besideai-backend.vercel.app';
    }
  }

  /**
   * Call backend API
   * This is the ONLY way to call AI - no fallback, no local calls
   * @param {string} backendUrl - Backend URL
   * @param {string} token - Auth token
   * @param {Array} messages - Messages array
   * @param {Object} options - Options (including retryCount to prevent infinite loops)
   */
  async callBackendAPI(backendUrl, token, messages, options = {}) {
    // Prevent infinite retry loops
    const retryCount = options.retryCount || 0;
    const maxRetries = 1; // Only retry once after refresh
    
    if (retryCount > maxRetries) {
      throw new Error('Authentication failed after retry. Please login again.');
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds

    try {
      // Extract model ID from options (could be fullModelId like "openai/gpt-4o" or just "gpt-4o")
      let modelId = options.model || options.modelId;
      if (modelId && modelId.includes('/')) {
        // Extract just the model ID part (backend expects just "gpt-4o", not "openai/gpt-4o")
        modelId = modelId.split('/').pop();
      }

      const apiUrl = `${backendUrl}/api/ai/call`;
      
      // Log backend call for debugging
      console.log('[BackendAPIHandler] 🚀 Calling Backend API');
      console.log('[BackendAPIHandler]   URL:', apiUrl);
      console.log('[BackendAPIHandler]   Model:', modelId);
      console.log('[BackendAPIHandler]   Messages:', messages.length, 'messages');

      // Handle streaming
      if (options.stream === true && options.streamCallback) {
        return await this.callBackendAPIStream(backendUrl, token, messages, {
          ...options,
          model: modelId
        }, options.streamCallback);
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          model: modelId,
          messages: messages,
          options: {
            temperature: options.temperature || 0.7,
            maxTokens: options.maxTokens || 2000,
            stream: false
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error('[BackendAPIHandler] ❌ Backend API Error:', response.status);
        
        if (response.status === 401) {
          console.log('[BackendAPIHandler] 🔄 Auth expired (401), attempting refresh...');
          // Auth expired, try to refresh
          try {
            // Clear cached tokens first to force fresh token
            if (chrome.identity && chrome.identity.clearAllCachedAuthTokens) {
              await new Promise((resolve) => {
                chrome.identity.clearAllCachedAuthTokens(() => {
                  console.log('[BackendAPIHandler] Cleared cached tokens');
                  resolve();
                });
              });
              // Small delay to ensure tokens are cleared
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // Try to get a new token (will try interactive if needed)
            const newToken = await this.refreshAuth();
            if (newToken) {
              console.log('[BackendAPIHandler] ✅ Token refreshed, retrying request');
              // Retry once with new token (increment retry count)
              return this.callBackendAPI(backendUrl, newToken, messages, {
                ...options,
                retryCount: retryCount + 1
              });
            } else {
              throw new Error('Failed to refresh token - no token returned');
            }
          } catch (refreshError) {
            console.error('[BackendAPIHandler] ❌ Failed to refresh auth:', refreshError);
            // Don't retry if refresh failed - user needs to login again
            throw new Error('Authentication failed after retry. Please login again.');
          }
        }

        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `API call failed: ${response.status}`;
        const errorCode = errorData.error || 'api_error';
        
        console.error('[BackendAPIHandler]   Error:', errorMessage);
        console.error('[BackendAPIHandler]   Code:', errorCode);
        console.error('[BackendAPIHandler]   Status:', response.status);
        
        // Throw error with more context
        const error = new Error(errorMessage);
        error.status = response.status;
        error.code = errorCode;
        
        // Add additional context for specific error types
        if (errorCode === 'model_not_available') {
          error.message = `Model not available for your subscription tier. ${errorMessage}`;
        } else if (errorCode === 'limit_exceeded' || errorCode === 'TOKEN_LIMIT_EXCEEDED' || errorCode === 'REQUEST_LIMIT_EXCEEDED') {
          error.message = `Usage limit exceeded. ${errorMessage}`;
        } else if (errorCode === 'feature_not_available') {
          error.message = `Feature not available for your subscription tier. ${errorMessage}`;
        }
        
        throw error;
      }

      const data = await response.json();
      
      console.log('[BackendAPIHandler] ✅ Backend API Success');
      console.log('[BackendAPIHandler]   Response length:', data.content?.length || 0, 'characters');
      console.log('[BackendAPIHandler]   Tokens:', data.tokens?.total || 0);

      return {
        content: data.content || '',
        providerId: data.provider || 'unknown',
        modelId: data.model || modelId,
        fullModelId: `${data.provider || 'unknown'}/${data.model || modelId}`,
        tokens: data.tokens || { input: 0, output: 0, total: 0 },
        streamed: false
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        console.error('[BackendAPIHandler] ❌ Request timeout');
        throw new Error('Request timeout. The backend took too long to respond. Please try again.');
      }
      
      // Re-throw with context if it's already a formatted error
      if (error.status || error.code) {
        throw error; // Already has status code or error code
      }
      
      // Network error or other issues
      console.error('[BackendAPIHandler] ❌ Network error:', error.message);
      
      // Provide more specific error messages based on error type
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        throw new Error('Network error: Unable to connect to the backend server. Please check your internet connection and ensure the backend is accessible.');
      } else if (error.message?.includes('CORS')) {
        throw new Error('CORS error: The backend server is not allowing requests from this extension. Please contact support.');
      } else {
        throw new Error(`Backend unavailable: ${error.message || 'Unknown error'}. Please check your connection and try again.`);
      }
    }
  }

  /**
   * Call backend API with streaming
   * @param {string} backendUrl - Backend URL
   * @param {string} token - Auth token
   * @param {Array} messages - Messages array
   * @param {Object} options - Options (including retryCount to prevent infinite loops)
   * @param {Function} streamCallback - Stream callback function
   */
  async callBackendAPIStream(backendUrl, token, messages, options = {}, streamCallback) {
    // Prevent infinite retry loops
    const retryCount = options.retryCount || 0;
    const maxRetries = 1; // Only retry once after refresh
    
    if (retryCount > maxRetries) {
      throw new Error('Authentication failed after retry. Please login again.');
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 seconds for streaming

    try {
      let modelId = options.model || options.modelId;
      if (modelId && modelId.includes('/')) {
        modelId = modelId.split('/').pop();
      }

      const response = await fetch(`${backendUrl}/api/ai/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          model: modelId,
          messages: messages,
          options: {
            temperature: options.temperature || 0.7,
            maxTokens: options.maxTokens || 2000,
            stream: true
          }
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('[BackendAPIHandler] 🔄 Auth expired in stream (401), attempting refresh...');
          // Auth expired, try to refresh
          try {
            // Clear cached tokens first to force fresh token
            if (chrome.identity && chrome.identity.clearAllCachedAuthTokens) {
              await new Promise((resolve) => {
                chrome.identity.clearAllCachedAuthTokens(() => {
                  console.log('[BackendAPIHandler] Cleared cached tokens');
                  resolve();
                });
              });
              // Small delay to ensure tokens are cleared
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // Try to get a new token (will try interactive if needed)
            const newToken = await this.refreshAuth();
            if (newToken) {
              console.log('[BackendAPIHandler] ✅ Token refreshed, retrying stream request');
              // Retry once with new token (increment retry count)
              return this.callBackendAPIStream(backendUrl, newToken, messages, {
                ...options,
                retryCount: retryCount + 1
              }, streamCallback);
            } else {
              throw new Error('Failed to refresh token - no token returned');
            }
          } catch (refreshError) {
            console.error('[BackendAPIHandler] ❌ Failed to refresh auth:', refreshError);
            // Don't retry if refresh failed - user needs to login again
            throw new Error('Authentication failed after retry. Please login again.');
          }
        }
        
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.message || `API call failed: ${response.status}`);
        error.status = response.status;
        error.code = errorData.error || 'api_error';
        throw error;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let tokens = { input: 0, output: 0, total: 0 };
      let model = modelId;
      let provider = 'unknown';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim() !== '');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              try {
                const json = JSON.parse(data);
                
                if (json.type === 'chunk' && json.content) {
                  fullContent += json.content;
                  if (streamCallback) {
                    streamCallback(json.content);
                  }
                } else if (json.type === 'done') {
                  tokens = json.tokens || tokens;
                  model = json.model || model;
                  provider = json.provider || provider;
                } else if (json.type === 'error') {
                  throw new Error(json.error || 'Streaming error');
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
        clearTimeout(timeoutId);
      }

      return {
        content: fullContent,
        providerId: provider,
        modelId: model,
        fullModelId: `${provider}/${model}`,
        tokens: tokens,
        streamed: true
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Refresh authentication
   * Tries to get a new token, first non-interactively, then interactively if needed
   */
  async refreshAuth() {
    try {
      // First try non-interactive (silent refresh)
      return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: false }, (token) => {
          if (chrome.runtime.lastError) {
            const errorMsg = chrome.runtime.lastError.message;
            console.log('[BackendAPIHandler] Non-interactive refresh failed:', errorMsg);
            // If non-interactive fails, try interactive (will show login popup)
            console.log('[BackendAPIHandler] Trying interactive refresh...');
            chrome.identity.getAuthToken({ interactive: true }, (interactiveToken) => {
              if (chrome.runtime.lastError) {
                const interactiveError = chrome.runtime.lastError.message;
                console.error('[BackendAPIHandler] Interactive refresh also failed:', interactiveError);
                reject(new Error(`Authentication failed: ${interactiveError}. Please login again.`));
              } else {
                console.log('[BackendAPIHandler] ✅ Interactive refresh succeeded');
                resolve(interactiveToken);
              }
            });
          } else {
            if (token) {
              console.log('[BackendAPIHandler] ✅ Non-interactive refresh succeeded');
              resolve(token);
            } else {
              console.warn('[BackendAPIHandler] Non-interactive refresh returned null token');
              // Try interactive as fallback
              chrome.identity.getAuthToken({ interactive: true }, (interactiveToken) => {
                if (chrome.runtime.lastError) {
                  reject(new Error(`Authentication failed: ${chrome.runtime.lastError.message}. Please login again.`));
                } else {
                  resolve(interactiveToken);
                }
              });
            }
          }
        });
      });
    } catch (error) {
      console.error('[BackendAPIHandler] Failed to refresh auth:', error);
      throw new Error(`Authentication failed: ${error.message}. Please login again.`);
    }
  }

  /**
   * Ensure initialized
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}

// Export class
export { BackendAPIHandler };


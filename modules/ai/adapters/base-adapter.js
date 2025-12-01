/**
 * Base Adapter for AI Providers
 * All provider adapters should extend this class
 */

export class BaseAdapter {
  constructor(config) {
    this.config = config;
    this.providerId = config.providerId;
    this.providerType = config.type;
  }
  
  /**
   * Prepare request URL
   */
  getRequestURL(modelId) {
    throw new Error('getRequestURL must be implemented by subclass');
  }
  
  /**
   * Prepare request headers
   */
  getRequestHeaders(useStreaming = false) {
    throw new Error('getRequestHeaders must be implemented by subclass');
  }
  
  /**
   * Prepare request body
   */
  getRequestBody(messages, modelId, options = {}) {
    throw new Error('getRequestBody must be implemented by subclass');
  }
  
  /**
   * Parse response
   */
  parseResponse(response) {
    throw new Error('parseResponse must be implemented by subclass');
  }
  
  /**
   * Parse streaming response chunk
   */
  parseStreamChunk(chunk) {
    throw new Error('parseStreamChunk must be implemented by subclass');
  }
  
  /**
   * Check if model supports files
   */
  supportsFiles(modelId) {
    return false; // Override in subclasses
  }
  
  /**
   * Validate configuration
   */
  validateConfig() {
    if (!this.config.apiKey && this.providerId !== 'cerebras') {
      throw new Error(`API key is required for ${this.providerId}`);
    }
    return true;
  }
}


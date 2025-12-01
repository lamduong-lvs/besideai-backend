/**
 * Base Client Interface
 * Abstract class for AI execution clients (local or server)
 */

export class BaseClient {
  /**
   * Execute AI request
   * @param {string} mode - Execution mode ('single', 'run-race', etc.)
   * @param {Array} messages - Messages to send
   * @param {object} config - Configuration (models, options, etc.)
   * @returns {Promise<object>} AI response
   */
  async execute(mode, messages, config) {
    throw new Error('execute method must be implemented by subclass');
  }
  
  /**
   * Check if client supports streaming
   */
  supportsStreaming() {
    return false;
  }
  
  /**
   * Execute with streaming callback
   * @param {string} mode - Execution mode
   * @param {Array} messages - Messages to send
   * @param {object} config - Configuration
   * @param {Function} streamCallback - Callback for streaming chunks
   * @returns {Promise<object>} AI response
   */
  async executeStream(mode, messages, config, streamCallback) {
    throw new Error('executeStream method must be implemented by subclass');
  }
}


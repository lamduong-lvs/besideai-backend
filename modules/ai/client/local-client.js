/**
 * Local Client
 * Executes AI requests locally using the dispatcher
 */

import { BaseClient } from './base-client.js';

export class LocalClient extends BaseClient {
  constructor(dispatcher) {
    super();
    this.dispatcher = dispatcher;
  }
  
  /**
   * Execute AI request locally
   */
  async execute(mode, messages, config) {
    if (!this.dispatcher) {
      throw new Error('Dispatcher not initialized');
    }
    
    return await this.dispatcher.dispatch({
      mode,
      messages,
      config
    });
  }
  
  /**
   * Execute with streaming
   */
  async executeStream(mode, messages, config, streamCallback) {
    if (!this.dispatcher) {
      throw new Error('Dispatcher not initialized');
    }
    
    return await this.dispatcher.dispatch({
      mode,
      messages,
      config,
      streamCallback
    });
  }
  
  supportsStreaming() {
    return true; // Local execution supports streaming
  }
}


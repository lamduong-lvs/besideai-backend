/**
 * AI Dispatcher
 * Routes AI requests to appropriate execution modes
 * Supports both local and server-side execution
 */

import { executeSingleMode } from './modes/single/index.js';
import { executeRunRaceMode, testRaceCondition } from './modes/run-race/index.js';
import { APIError, NetworkError } from './utils/error-handler.js';
import { LocalClient } from './client/local-client.js';
import { ServerClient } from './client/server-client.js';
import { loadServerConfig } from './config/server-config.js';

export class AIDispatcher {
  constructor(dependencies = {}) {
    this.apiManager = dependencies.apiManager;
    this.getLang = dependencies.getLang || ((key, params) => key);
    this.debugLog = dependencies.debugLog || (() => {});
    
    // Initialize clients
    this.localClient = new LocalClient(this);
    this.serverClient = null; // Will be initialized when needed
    
    // Cache server config
    this.serverConfig = null;
    this.serverConfigLoaded = false;
  }
  
  /**
   * Load server configuration
   */
  async _loadServerConfig() {
    if (this.serverConfigLoaded) return;
    
    try {
      this.serverConfig = await loadServerConfig();
      this.serverConfigLoaded = true;
      
      // Initialize server client if enabled
      if (this.serverConfig.enabled && this.serverConfig.serverUrl) {
        this.serverClient = new ServerClient(this.serverConfig.serverUrl, {
          timeout: this.serverConfig.timeout,
          retryAttempts: this.serverConfig.retryAttempts,
          retryDelay: this.serverConfig.retryDelay
        });
        this.debugLog('Dispatcher', 'Server client initialized:', this.serverConfig.serverUrl);
      }
    } catch (error) {
      console.error('[Dispatcher] Failed to load server config:', error);
      this.serverConfig = { enabled: false };
      this.serverConfigLoaded = true;
    }
  }
  
  /**
   * Get the appropriate client (local or server)
   */
  async _getClient() {
    await this._loadServerConfig();
    
    // Use server if enabled and configured
    if (this.serverConfig?.enabled && this.serverClient) {
      return this.serverClient;
    }
    
    // Default to local
    return this.localClient;
  }
  
  /**
   * Dispatch AI request to appropriate mode
   * @param {object} request - Request object
   * @param {string} request.mode - Execution mode ('single', 'run-race', 'test-race')
   * @param {Array} request.messages - Messages to send
   * @param {object} request.config - Configuration
   * @param {Function} request.streamCallback - Optional streaming callback
   * @param {AbortSignal} request.signal - Optional abort signal
   * @param {boolean} request.forceLocal - Force local execution even if server is enabled
   * @returns {Promise<object>} AI response
   */
  async dispatch(request) {
    const { mode, messages, config, streamCallback, signal, forceLocal = false } = request;
    
    if (!mode) {
      throw new Error('Mode is required');
    }
    
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('Messages are required');
    }
    
    if (!config) {
      throw new Error('Config is required');
    }
    
    // Get appropriate client (local or server)
    let client;
    try {
      client = forceLocal ? this.localClient : await this._getClient();
    } catch (error) {
      this.debugLog('Dispatcher', 'Failed to get client, using local:', error);
      client = this.localClient;
    }
    
    // If using server client, delegate to it
    if (client !== this.localClient && client.supportsStreaming && streamCallback) {
      try {
        this.debugLog('Dispatcher', 'Using server client for:', mode);
        return await client.executeStream(mode, messages, config, streamCallback);
      } catch (error) {
        this.debugLog('Dispatcher', 'Server execution failed, falling back to local:', error);
        
        // Fallback to local if configured
        if (this.serverConfig?.fallbackToLocal) {
          client = this.localClient;
        } else {
          throw error;
        }
      }
    } else if (client !== this.localClient) {
      try {
        this.debugLog('Dispatcher', 'Using server client for:', mode);
        return await client.execute(mode, messages, config);
      } catch (error) {
        this.debugLog('Dispatcher', 'Server execution failed, falling back to local:', error);
        
        // Fallback to local if configured
        if (this.serverConfig?.fallbackToLocal) {
          client = this.localClient;
        } else {
          throw error;
        }
      }
    }
    
    // Use local execution
    // Ensure apiManager is loaded
    if (this.apiManager && typeof this.apiManager.loadFromStorage === 'function') {
      await this.apiManager.loadFromStorage();
    }
    
    const options = {
      apiManager: this.apiManager,
      getLang: this.getLang,
      debugLog: this.debugLog,
      streamCallback,
      signal: signal || null
    };
    
    try {
      switch (mode) {
        case 'single':
          return await this._dispatchSingle(messages, config, options);
        
        case 'run-race':
          return await this._dispatchRunRace(messages, config, options);
        
        case 'test-race':
          return await this._dispatchTestRace(messages, config, options);
        
        // Future modes can be added here:
        // case 'tts':
        //   return await this._dispatchTTS(messages, config, options);
        // case 'video':
        //   return await this._dispatchVideo(messages, config, options);
        // case 'image':
        //   return await this._dispatchImage(messages, config, options);
        // case 'pdf-ocr':
        //   return await this._dispatchPDFOCR(messages, config, options);
        
        default:
          throw new Error(`Unsupported mode: ${mode}`);
      }
    } catch (error) {
      this.debugLog('Dispatcher', 'Error in dispatch:', error);
      throw error;
    }
  }
  
  /**
   * Dispatch single mode request
   */
  async _dispatchSingle(messages, config, options) {
    const { models } = config;
    
    if (!models || !Array.isArray(models) || models.length === 0) {
      throw new Error('Single mode requires at least one model');
    }
    
    const fullModelId = models[0];
    
    this.debugLog('Dispatcher', 'Dispatching to Single mode:', fullModelId);
    
    return await executeSingleMode(fullModelId, messages, options);
  }
  
  /**
   * Dispatch run-race mode request
   */
  async _dispatchRunRace(messages, config, options) {
    const { models } = config;
    
    if (!models || !Array.isArray(models) || models.length < 2) {
      throw new Error('Run Race mode requires at least 2 models');
    }
    
    this.debugLog('Dispatcher', 'Dispatching to Run Race mode:', models);
    
    return await executeRunRaceMode(models, messages, options);
  }
  
  /**
   * Dispatch test-race mode request
   */
  async _dispatchTestRace(messages, config, options) {
    const { models } = config;
    
    if (!models || !Array.isArray(models) || models.length === 0) {
      throw new Error('Test Race mode requires at least one model');
    }
    
    this.debugLog('Dispatcher', 'Dispatching to Test Race mode:', models);
    
    return await testRaceCondition(models, messages, options);
  }
}


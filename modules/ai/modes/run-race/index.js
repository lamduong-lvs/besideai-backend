/**
 * Run Race Mode Handler
 * Executes AI request using multiple models in parallel, returns the fastest response
 */

import { executeSingleMode } from '../single/index.js';
import { hasFiles } from '../../utils/message-processor.js';
import { APIError } from '../../utils/error-handler.js';

/**
 * Execute race mode with multiple models
 */
export async function executeRunRaceMode(fullModelIds, messages, options = {}) {
  const {
    apiManager,
    getLang = (key, params) => key,
    debugLog = () => {}
  } = options;
  
  if (!apiManager) {
    throw new Error('apiManager is required');
  }
  
  if (!Array.isArray(fullModelIds) || fullModelIds.length < 2) {
    throw new Error('Run Race mode requires at least 2 models');
  }
  
  debugLog('RunRaceMode', 'Starting race for models:', fullModelIds);
  
  // Create abort controllers for each model
  const controllers = fullModelIds.map(() => new AbortController());
  const errors = [];
  
  // Create promises for all models
  const promises = fullModelIds.map((fullModelId, index) => {
    return executeSingleMode(fullModelId, messages, {
      ...options,
      signal: controllers[index].signal,
      streamCallback: null // Race mode doesn't support streaming
    }).catch(error => {
      errors.push({ fullModelId, error });
      debugLog('RunRaceMode', `Model ${fullModelId} failed:`, error.message);
      // Return a promise that never resolves to exclude from Promise.any
      return new Promise(() => {});
    });
  });
  
  try {
    // Wait for the first successful response
    const winner = await Promise.any(promises);
    
    // Abort all other requests
    controllers.forEach((controller, index) => {
      if (!controller.signal.aborted) {
        controller.abort();
        debugLog('RunRaceMode', `Aborted request for ${fullModelIds[index]}`);
      }
    });
    
    debugLog('RunRaceMode', `Winner: ${winner.providerId} (${winner.fullModelId})`);
    
    return winner;
  } catch (aggregateError) {
    // All models failed
    console.error('RunRaceMode: All models failed', aggregateError);
    
    // Check if all errors are file support errors
    const hasFileSupportErrors = hasFiles(messages) && errors.length > 0 && 
      errors.every(({ error }) => {
        const msg = (error?.message || '').toLowerCase();
        return msg.includes('hình ảnh') ||
               msg.includes('image') ||
               msg.includes('file') ||
               msg.includes('attachment') ||
               msg.includes('multimodal') ||
               msg.includes('unsupported') ||
               msg.includes('not support');
      });
    
    if (hasFileSupportErrors) {
      throw new Error(getLang('errorModelNotSupportImagesRaceMode'));
    }
    
    // Get the first error message for user feedback
    const firstError = errors[0]?.error;
    if (firstError instanceof APIError) {
      throw new APIError(
        getLang('errorRaceModeFailed') + ': ' + firstError.message,
        firstError.statusCode,
        firstError.provider
      );
    }
    
    throw new Error(getLang('errorRaceModeFailed'));
  }
}

/**
 * Test race condition - run all models without aborting
 * Returns results for all models including latency and status
 */
export async function testRaceCondition(fullModelIds, messages, options = {}) {
  const {
    apiManager,
    getLang = (key, params) => key,
    debugLog = () => {}
  } = options;
  
  if (!apiManager) {
    throw new Error('apiManager is required');
  }
  
  debugLog('RunRaceMode', 'Testing race condition for models:', fullModelIds);
  
  const testPromises = fullModelIds.map(async (fullModelId) => {
    const startTime = performance.now();
    let status = 'Pending';
    let latency = null;
    let errorMsg = null;
    let providerName = 'Unknown';
    let modelDisplayName = 'Unknown';
    
    // Parse full model ID
    const separatorIndex = fullModelId.indexOf('/');
    const providerId = separatorIndex !== -1 ? fullModelId.substring(0, separatorIndex) : null;
    const modelId = separatorIndex !== -1 ? fullModelId.substring(separatorIndex + 1) : fullModelId;
    
    // Get provider info
    if (providerId) {
      const providerConfig = apiManager.getProvider(providerId);
      if (providerConfig) {
        providerName = providerConfig.name;
        const modelInfo = providerConfig.models.find(m => m.id === modelId);
        if (modelInfo) {
          modelDisplayName = modelInfo.displayName;
        } else {
          modelDisplayName = modelId;
        }
      }
    }
    
    try {
      const result = await executeSingleMode(fullModelId, messages, {
        ...options,
        streamCallback: null
      });
      
      const endTime = performance.now();
      latency = Math.round(endTime - startTime);
      status = 'OK';
      
      return {
        fullModelId,
        name: modelDisplayName,
        provider: providerName,
        latency,
        status,
        error: null
      };
    } catch (error) {
      const endTime = performance.now();
      latency = Math.round(endTime - startTime);
      
      if (error instanceof APIError) {
        status = `Error (${error.statusCode || 'API'})`;
        errorMsg = error.message;
      } else if (error.name === 'AbortError') {
        status = 'Aborted';
        errorMsg = 'Request aborted unexpectedly';
      } else {
        status = 'Error (Network/Other)';
        errorMsg = error.message;
      }
      
      console.warn(`[TestRace] Model ${fullModelId} failed: ${status} - ${errorMsg}`);
      
      return {
        fullModelId,
        name: modelDisplayName,
        provider: providerName,
        latency,
        status,
        error: errorMsg
      };
    }
  });
  
  const results = await Promise.all(testPromises);
  return results;
}


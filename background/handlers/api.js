// background/handlers/api.js
// Handlers for API-related actions

import { simulateStreaming } from '../helpers/streaming-simulator.js';

// These will be imported from background.js
let apiManager, getLang, debugLog, checkModelSupportsFiles, runRace, callSingleModel, handleRaceTest, APIError, streamingPorts;

export function initializeAPIHandlers(dependencies) {
  apiManager = dependencies.apiManager;
  getLang = dependencies.getLang;
  debugLog = dependencies.debugLog;
  checkModelSupportsFiles = dependencies.checkModelSupportsFiles;
  runRace = dependencies.runRace;
  callSingleModel = dependencies.callSingleModel;
  handleRaceTest = dependencies.handleRaceTest;
  APIError = dependencies.APIError;
  streamingPorts = dependencies.streamingPorts;
}

export async function handleProcessAction(request, sender, sendResponse) {
  let responseSent = false;
  const safeSendResponse = (response) => {
    if (!responseSent && sendResponse) {
      try {
        sendResponse(response);
        responseSent = true;
      } catch (error) {
        console.warn('[APIHandler] Failed to send response (channel may be closed):', error);
      }
    }
  };

  try {
    await apiManager.loadFromStorage();
    const { messages, config } = request;
    if (!config || !config.models || config.models.length === 0) { 
      throw new Error(getLang('errorNoConfig') || 'No configuration provided'); 
    }
    let result;
    if (config.isRaceMode && config.models.length >= 2) {
      debugLog('ProcessAction', 'Running Race Mode', config.models);
      result = await runRace(config.models, messages);
    } else {
      const fullModelId = config.models[0];
      debugLog('ProcessAction', 'Running Single Mode', fullModelId);
      result = await callSingleModel(fullModelId, messages, null);
    }
    safeSendResponse({
      success: true,
      result: result.content,
      providerUsed: result.providerId,
      usedFullModelId: result.fullModelId
    });
  } catch (error) {
    console.error('[APIHandler] processAction error:', error);
    const errorMessage = error?.message || 'Unknown error occurred';
    if (APIError && error instanceof APIError) {
      safeSendResponse({ success: false, error: { message: `${error.provider}: ${errorMessage}` } });
    } else {
      safeSendResponse({ success: false, error: { message: errorMessage } });
    }
  }
}

export async function handleProcessActionStream(request, sender, sendResponse) {
  let responseSent = false;
  const safeSendResponse = (response) => {
    if (!responseSent && typeof sendResponse === 'function') {
      try {
        sendResponse(response);
        responseSent = true;
      } catch (error) {
        console.warn('[Background] Failed to send processActionStream response (channel may be closed):', error);
      }
    }
  };
  
  try {
    await apiManager.loadFromStorage();
    const { messages = [], config } = request;
    
    const hasImages = !!(request.images && request.images.length > 0);
    const lastMessage = messages && messages.length > 0 ? messages[messages.length - 1] : null;
    const hasAttachedFiles = !!(lastMessage && lastMessage.attachedFiles && lastMessage.attachedFiles.length > 0);
    
    console.log('[Background] processActionStream received:', {
      messagesCount: messages?.length || 0,
      config: config,
      hasImages: hasImages,
      hasAttachedFiles: hasAttachedFiles,
      lastMessageHasFiles: hasAttachedFiles
    });
    
    if (!config || !config.models || config.models.length === 0) { 
      safeSendResponse({ success: false, error: getLang('errorNoConfig') });
      return;
    }
    
    const hasFiles = hasImages || hasAttachedFiles;
    
    if (hasFiles) {
      const modelsSupportFiles = [];
      const modelsNotSupportFiles = [];
      
      for (const fullModelId of config.models) {
        const separatorIndex = fullModelId.indexOf('/');
        if (separatorIndex === -1) continue;
        
        const providerId = fullModelId.substring(0, separatorIndex);
        const modelId = fullModelId.substring(separatorIndex + 1);
        const providerConfig = apiManager.getProvider(providerId);
        
        const supportsFiles = checkModelSupportsFiles(providerId, modelId, providerConfig?.type);
        
        if (supportsFiles) {
          modelsSupportFiles.push(fullModelId);
        } else {
          modelsNotSupportFiles.push(fullModelId);
        }
      }
      
      if (modelsSupportFiles.length === 0 && modelsNotSupportFiles.length > 0) {
        const errorMessage = config.isRaceMode && config.models.length >= 2
          ? getLang('errorModelNotSupportImagesRaceMode')
          : getLang('errorModelNotSupportImages');
        
        safeSendResponse({ 
          success: false, 
          error: errorMessage 
        });
        return;
      }
      
      if (config.isRaceMode && modelsNotSupportFiles.length > 0 && modelsSupportFiles.length > 0) {
        config.models = modelsSupportFiles;
        console.log('[Background] Filtered models to only those supporting files:', config.models);
        
        if (config.models.length < 2) {
          config.isRaceMode = false;
          console.log('[Background] Switched to single mode after filtering (only 1 model supports files)');
        }
      }
    }
    
    let processedMessages = (messages || []).map((msg, index) => {
      const isLastMessage = index === messages.length - 1;
      if (isLastMessage && request.images && request.images.length > 0 && msg.role === 'user') {
        return {
          ...msg,
          images: request.images
        };
      }
      const { images, attachedFiles, ...messageWithoutFiles } = msg;
      return messageWithoutFiles;
    });
    
    // Check if streaming is requested
    let useStreaming = request.streaming === true && request.portName === 'streaming' && request.messageId;
    let streamingPort = null;
    
    if (useStreaming) {
      // Get streaming port from map (set by onConnect listener)
      streamingPort = streamingPorts.get(request.messageId);
      
      if (!streamingPort) {
        console.warn('[Background] Streaming port not found for messageId:', request.messageId, '- falling back to non-streaming');
        useStreaming = false;
      }
    }
    
    if (useStreaming && streamingPort) {
      // Track if port is disconnected
      let isPortDisconnected = false;
      
      // Listen for port disconnection
      streamingPort.onDisconnect.addListener(() => {
        isPortDisconnected = true;
        console.log('[Background] Streaming port disconnected');
      });
      
      // Create a callback to send chunks via port
      const streamCallback = (message) => {
        // Check if port is disconnected
        if (isPortDisconnected || !streamingPort) {
          console.warn('[Background] Port disconnected, skipping chunk');
          return;
        }
        
        try {
          console.log('[Background] Sending stream message:', message.type, message.chunk ? `chunk length: ${message.chunk.length}` : '');
          streamingPort.postMessage(message);
        } catch (error) {
          // Port disconnected error - this is expected if user closes panel
          if (error.message && (error.message.includes('disconnected') || error.message.includes('Attempting to use a disconnected'))) {
            isPortDisconnected = true;
            console.warn('[Background] Port disconnected during streaming, stopping');
            return;
          }
          console.error('[Background] Error sending stream chunk:', error);
        }
      };
      
      let result;
      if (config.isRaceMode && config.models && config.models.length >= 2) {
        // Race mode doesn't support native streaming, use simulated streaming
        debugLog('ProcessActionStream', 'Running Race Mode (simulated streaming)', config.models);
        result = await runRace(config.models, processedMessages);
        
        // Create a wrapper callback that includes usedFullModelId in done message
        const wrappedCallback = (message) => {
          if (message.type === 'done') {
            message.usedFullModelId = result.fullModelId;
            message.providerUsed = result.providerId;
          }
          streamCallback(message);
        };
        
        // Simulate streaming for race mode results
        await simulateStreaming(result.content, wrappedCallback, {
          chunkSize: 4, // Larger chunks for faster streaming
          delay: 8, // 8ms delay = ~125fps for faster streaming
          minDelay: 5,
          maxDelay: 15
        });
        
        safeSendResponse({
          success: true,
          streaming: true,
          providerUsed: result.providerId,
          usedFullModelId: result.fullModelId
        });
      } else if (config.models && config.models.length > 0) {
        const fullModelId = config.models[0];
        debugLog('ProcessActionStream', 'Running Single Mode (streaming)', fullModelId);
        
        // Create a wrapper callback that includes usedFullModelId in done message
        let modelIdForDone = fullModelId; // Store for done message
        const wrappedCallback = (message) => {
          if (message.type === 'done') {
            // If result is available, use it; otherwise use the modelId we're calling
            if (result && result.fullModelId) {
              message.usedFullModelId = result.fullModelId;
              message.providerUsed = result.providerId;
            } else {
              message.usedFullModelId = modelIdForDone;
            }
          }
          streamCallback(message);
        };
        
        // Call with streaming callback
        result = await callSingleModel(fullModelId, processedMessages, null, apiManager, getLang, debugLog, APIError, wrappedCallback);
        
        // Update modelIdForDone with actual result if available
        if (result && result.fullModelId) {
          modelIdForDone = result.fullModelId;
        }
        
        // If result came back immediately (non-streaming), simulate streaming
        if (result && result.content && !result.streamed) {
          console.log('[Background] API returned non-streaming response, simulating streaming');
          // Re-wrap callback to ensure usedFullModelId is included
          const finalWrappedCallback = (message) => {
            if (message.type === 'done') {
              message.usedFullModelId = result.fullModelId || modelIdForDone;
              message.providerUsed = result.providerId;
            }
            streamCallback(message);
          };
          await simulateStreaming(result.content, finalWrappedCallback, {
            chunkSize: 4,
            delay: 8,
            minDelay: 5,
            maxDelay: 15
          });
        }
        
        safeSendResponse({
          success: true,
          streaming: true,
          providerUsed: result.providerId,
          usedFullModelId: result.fullModelId || modelIdForDone
        });
      } else {
        throw new Error(getLang('errorModelNotSupportImages'));
      }
    } else {
      // Non-streaming (original logic)
      let result;
      if (config.isRaceMode && config.models && config.models.length >= 2) {
        debugLog('ProcessActionStream', 'Running Race Mode', config.models);
        result = await runRace(config.models, processedMessages);
      } else if (config.models && config.models.length > 0) {
        const fullModelId = config.models[0];
        debugLog('ProcessActionStream', 'Running Single Mode', fullModelId);
        result = await callSingleModel(fullModelId, processedMessages, null);
      } else {
        throw new Error(getLang('errorModelNotSupportImages'));
      }
      
      console.log('[Background] processActionStream result:', {
        success: true,
        hasContent: !!result?.content,
        contentLength: result?.content?.length || 0,
        providerId: result?.providerId,
        fullModelId: result?.fullModelId
      });
      
      safeSendResponse({
        success: true,
        result: result.content,
        providerUsed: result.providerId,
        usedFullModelId: result.fullModelId,
        streaming: false
      });
    }
  } catch (error) {
    console.error('[Background] processActionStream error:', error);
    
    const hasImages = !!(request.images && request.images.length > 0);
    const requestMessages = Array.isArray(request?.messages) ? request.messages : [];
    const hasAttachedFiles = requestMessages.some(msg => msg.attachedFiles && msg.attachedFiles.length > 0);
    const hasFiles = hasImages || hasAttachedFiles;
    let errorMessage = error.message || getLang('errorGenericPrefix', { error: error.toString() });
    
    if (hasFiles) {
      const errorMsgLower = errorMessage.toLowerCase();
      if (errorMsgLower.includes('hình ảnh') || 
        errorMsgLower.includes('file') ||
        errorMsgLower.includes('attachment') ||
        errorMsgLower.includes('document') ||
        errorMsgLower.includes('image') || 
        errorMsgLower.includes('multimodal') ||
        errorMsgLower.includes('unsupported') ||
        errorMsgLower.includes('not support') ||
        errorMessage.includes('errorModelNotSupportImages')) {
        
        if (config.isRaceMode && config.models.length >= 2) {
          errorMessage = getLang('errorModelNotSupportImagesRaceMode');
        } else {
          errorMessage = getLang('errorModelNotSupportImages');
        }
      }
    }
    
    safeSendResponse({ 
      success: false, 
      error: errorMessage 
    });
  }
}

export async function handleGetAIConfig(request, sender, sendResponse) {
  try {
    await apiManager.loadFromStorage();
    const settings = await chrome.storage.local.get(['aiProvider', 'raceSettings']);
    const defaultModel = settings.aiProvider;
    const raceConfig = settings.raceSettings;
    
    console.log('[Background] getAIConfig - settings:', { defaultModel, raceConfig });
    
    let config;
    if (raceConfig && raceConfig.enabled && Array.isArray(raceConfig.models) && raceConfig.models.length >= 2) {
      config = {
        isRaceMode: true,
        models: raceConfig.models
      };
    } else if (defaultModel) {
      config = {
        isRaceMode: false,
        models: [defaultModel]
      };
    } else {
      const fallbackModel = selectFallbackModel();
      if (fallbackModel) {
        config = {
          isRaceMode: false,
          models: [fallbackModel]
        };
      } else {
        throw new Error(getLang('errorNoModelConfigured') || 'No AI models configured');
      }
    }
    
    console.log('[Background] getAIConfig - config:', config);
    
    sendResponse({
      success: true,
      config: config
    });
  } catch (error) {
    console.error('[Background] getAIConfig error:', error);
    sendResponse({ 
      success: false, 
      error: error.message || 'Lỗi khi lấy cấu hình AI' 
    });
  }
}

export async function handleTestRaceCondition(request, sender, sendResponse) {
  try {
    await apiManager.loadFromStorage();
    const { text, models } = request;
    if (!text || !models || models.length === 0) {
      throw new Error(getLang('errorTestRaceMissing'));
    }
    const testMessages = [{ role: 'user', content: text }];
    
    debugLog('TestRace', 'Starting race test for models:', models);
    const results = await handleRaceTest(testMessages, models);
    debugLog('TestRace', 'Race test completed. Results:', results);
    
    sendResponse({ success: true, results: results });
  } catch (error) {
    console.error('[APIHandler] testRaceCondition error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

function selectFallbackModel() {
  if (!apiManager || typeof apiManager.getAllProviders !== 'function') {
    return null;
  }
  const providers = apiManager.getAllProviders() || [];
  for (const provider of providers) {
    if (!provider) continue;
    const providerId = provider.providerId || provider.id;
    const candidateModel = provider.currentModel || (Array.isArray(provider.models) && provider.models.length > 0 ? provider.models[0].id : null);
    if (!providerId || !candidateModel) continue;
    const hasCredential = providerId === 'cerebras' || !!provider.apiKey || provider.type === 'dify';
    if (!hasCredential) continue;
    return `${providerId}/${candidateModel}`;
  }
  return null;
}


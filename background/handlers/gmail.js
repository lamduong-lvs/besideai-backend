// background/handlers/gmail.js
// Handlers for Gmail-related actions

import { simulateStreaming } from '../helpers/streaming-simulator.js';

// These will be imported from background.js
let getLang, executeSharedAI, buildTranslationPrompt, buildRewritePrompt, streamingPorts, apiManager, callSingleModel, runRace, debugLog, APIError;

export function initializeGmailHandlers(dependencies) {
  getLang = dependencies.getLang;
  executeSharedAI = dependencies.executeSharedAI;
  buildTranslationPrompt = dependencies.buildTranslationPrompt;
  buildRewritePrompt = dependencies.buildRewritePrompt;
  streamingPorts = dependencies.streamingPorts;
  apiManager = dependencies.apiManager;
  callSingleModel = dependencies.callSingleModel;
  runRace = dependencies.runRace;
  debugLog = dependencies.debugLog;
  APIError = dependencies.APIError;
}

export async function handleSummarizeEmail(request, sender, sendResponse) {
  try {
    // ✅ Check feature availability
    try {
      const { checkFeatureAvailability } = await import('../../modules/features/feature-check-helper.js');
      const isAvailable = await checkFeatureAvailability('gmailIntegration');
      if (!isAvailable) {
        sendResponse({ success: false, error: 'Gmail integration is not available for your subscription tier' });
        return;
      }
    } catch (error) {
      console.error('[GmailHandler] Error checking feature availability:', error);
      // Continue anyway if check fails
    }

    const messages = [
      { role: 'system', content: getLang('promptSummarizeSystem') },
      { role: 'user', content: getLang('promptSummarizeUser', { text: request.text }) }
    ];
    
    // Check if streaming is requested (from panel)
    const messageId = request.messageId;
    const useStreaming = messageId && streamingPorts && streamingPorts.has(messageId);
    let streamingPort = null;
    
    if (useStreaming) {
      streamingPort = streamingPorts.get(messageId);
      console.log('[GmailHandler] Using streaming for Gmail summary, messageId:', messageId);
      
      // Track if port is disconnected
      let isPortDisconnected = false;
      streamingPort.onDisconnect.addListener(() => {
        isPortDisconnected = true;
        console.log('[GmailHandler] Streaming port disconnected');
      });
      
      // Create stream callback
      const streamCallback = (message) => {
        if (isPortDisconnected || !streamingPort) {
          console.warn('[GmailHandler] Port disconnected, skipping chunk');
          return;
        }
        try {
          streamingPort.postMessage(message);
        } catch (error) {
          if (error.message && (error.message.includes('disconnected') || error.message.includes('Attempting to use a disconnected'))) {
            isPortDisconnected = true;
            console.warn('[GmailHandler] Port disconnected during streaming');
            return;
          }
          console.error('[GmailHandler] Error sending stream chunk:', error);
        }
      };
      
      // Get AI config for streaming
      await apiManager.loadFromStorage();
      const settings = await chrome.storage.local.get(['aiProvider', 'raceSettings']);
      const defaultModel = settings.aiProvider;
      const raceConfig = settings.raceSettings;
      
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
        // Fallback to first available model
        const providers = Object.keys(apiManager.configs || {});
        if (providers.length > 0) {
          const firstProvider = apiManager.configs[providers[0]];
          const firstModel = firstProvider?.models?.[0]?.id;
          if (firstModel) {
            config = {
              isRaceMode: false,
              models: [`${providers[0]}/${firstModel}`]
            };
          } else {
            throw new Error(getLang('errorNoModelConfigured') || 'No AI models configured');
          }
        } else {
          throw new Error(getLang('errorNoModelConfigured') || 'No AI models configured');
        }
      }
      
      let result;
      if (config.isRaceMode && config.models && config.models.length >= 2) {
        // Race mode - use simulated streaming
        debugLog('GmailSummary', 'Running Race Mode (simulated streaming)', config.models);
        result = await runRace(config.models, messages);
        await simulateStreaming(result.content, streamCallback, {
          chunkSize: 4,
          delay: 8,
          minDelay: 5,
          maxDelay: 15
        });
      } else if (config.models && config.models.length > 0) {
        // Single mode - try native streaming first
        const fullModelId = config.models[0];
        debugLog('GmailSummary', 'Running Single Mode (streaming)', fullModelId);
        result = await callSingleModel(fullModelId, messages, null, apiManager, getLang, debugLog, APIError, streamCallback);
        
        // If result came back immediately (non-streaming), simulate streaming
        if (result && result.content && !result.streamed) {
          console.log('[GmailHandler] API returned non-streaming response, simulating streaming');
          await simulateStreaming(result.content, streamCallback, {
            chunkSize: 4,
            delay: 8,
            minDelay: 5,
            maxDelay: 15
          });
        }
      } else {
        throw new Error(getLang('errorNoConfig'));
      }
      
      // Send response immediately (streaming is handled via port)
      sendResponse({
        success: true,
        streaming: true,
        result: result,
        providerUsed: result.providerId,
        usedFullModelId: result.fullModelId
      });
    } else {
      // Non-streaming (original logic)
      const aiResult = await executeSharedAI(messages, 'gmail');
      
      sendResponse({
        success: true,
        result: aiResult,
        suggestions: [
          getLang('emailSuggestion1'),
          getLang('emailSuggestion2'),
          getLang('emailSuggestion3')
        ]
      });
    }
  } catch (error) {
    console.error("Lỗi khi tóm tắt Gmail:", error);
    
    // Send error via streaming port if available
    if (request.messageId && streamingPorts && streamingPorts.has(request.messageId)) {
      const port = streamingPorts.get(request.messageId);
      try {
        port.postMessage({ type: 'error', error: error.message });
      } catch (e) {
        console.warn('[GmailHandler] Could not send error via streaming port:', e);
      }
    }
    
    sendResponse({ success: false, error: error.message });
  }
}

export async function handleComposeEmail(request, sender, sendResponse) {
  try {
    // ✅ Check feature availability
    try {
      const { checkFeatureAvailability } = await import('../../modules/features/feature-check-helper.js');
      const isAvailable = await checkFeatureAvailability('gmailIntegration');
      if (!isAvailable) {
        sendResponse({ success: false, error: 'Gmail integration is not available for your subscription tier' });
        return;
      }
    } catch (error) {
      console.error('[GmailHandler] Error checking feature availability:', error);
      // Continue anyway if check fails
    }

    const messages = [
      { role: 'system', content: getLang('promptComposeSystem') },
      { role: 'user', content: getLang('promptComposeUser', { context: request.context, prompt: request.prompt }) }
    ];
    
    const aiResult = await executeSharedAI(messages, 'gmail');
    
    sendResponse({
      success: true,
      draft: aiResult.content 
    });
  } catch (error) {
    console.error("Lỗi khi soạn thảo Gmail:", error);
    sendResponse({ success: false, error: error.message });
  }
}

export async function handleQueryEmailContext(request, sender, sendResponse) {
  try {
    // ✅ Check feature availability
    try {
      const { checkFeatureAvailability } = await import('../../modules/features/feature-check-helper.js');
      const isAvailable = await checkFeatureAvailability('gmailIntegration');
      if (!isAvailable) {
        sendResponse({ success: false, error: 'Gmail integration is not available for your subscription tier' });
        return;
      }
    } catch (error) {
      console.error('[GmailHandler] Error checking feature availability:', error);
      // Continue anyway if check fails
    }

    const { context, query } = request;
    
    const messages = [
      { role: 'system', content: getLang('promptQuerySystem') },
      { role: 'user', content: getLang('promptQueryUser', { context: context, query: query }) }
    ];
    
    const aiResult = await executeSharedAI(messages, 'gmail');
    
    sendResponse({
      success: true,
      result: aiResult
    });
  } catch (error) {
    console.error("Lỗi khi truy vấn (Query) Gmail:", error);
    sendResponse({ success: false, error: error.message });
  }
}

export async function handleTranslateText(request, sender, sendResponse) {
  try {
    const { text, targetLang } = request;
    const targetLangName = targetLang === 'vi' ? getLang('translateLangVi') : targetLang;
    const messages = [
      { role: 'system', content: getLang('promptTranslateSystem') },
      { role: 'user', content: getLang('promptTranslateUser', { targetLangName: targetLangName, text: text }) }
    ];
    
    const aiResult = await executeSharedAI(messages, 'gmail');
    
    sendResponse({
      success: true,
      translatedText: aiResult.content
    });
  } catch (error) {
    console.error("Lỗi khi dịch văn bản:", error);
    sendResponse({ success: false, error: error.message });
  }
}

export async function handleAnalyzeEmailForEvents(request, sender, sendResponse) {
  try {
    const messages = [
      { role: 'user', content: request.prompt }
    ];
    
    const aiResult = await executeSharedAI(messages, 'gmail');
    
    sendResponse({
      success: true,
      result: aiResult.content
    });
  } catch (error) {
    console.error("Lỗi AI phân tích email:", error);
    sendResponse({ success: false, error: { message: error.message } });
  }
}

export async function handleTranslateSuggestion(request, sender, sendResponse) {
  try {
    const { title, description, targetLang } = request;
    
    const prompt = buildTranslationPrompt(title, description, targetLang);
    const messages = [ { role: 'user', content: prompt } ];
    
    const aiResult = await executeSharedAI(messages, 'gmail');
    
    let parsedResult;
    try {
      let cleanedResponse = aiResult.content.trim();
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, '');
      cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
      cleanedResponse = cleanedResponse.trim();
      
      parsedResult = JSON.parse(cleanedResponse);
    } catch (e) {
      console.error("Lỗi parse JSON dịch thuật:", e.message);
      console.log("Dữ liệu thô từ AI:", aiResult.content);
      throw new Error(getLang('errorJsonInvalid'));
    }

    sendResponse({
      success: true,
      result: parsedResult 
    });
  } catch (error) {
    console.error("Lỗi khi dịch suggestion:", error);
    sendResponse({ success: false, error: { message: error.message, details: error.stack } });
  }
}

export async function handleRewriteText(request, sender, sendResponse) {
  try {
    const { text, context } = request;
    if (!text) {
      throw new Error(getLang('errorNoTextRewrite'));
    }
    
    const prompt = buildRewritePrompt(text, context);
    const messages = [ { role: 'user', content: prompt } ];
    
    const aiResult = await executeSharedAI(messages, 'gmail');

    sendResponse({
      success: true,
      rewrittenText: aiResult.content 
    });
  } catch (error) {
    console.error("Lỗi khi viết lại văn bản:", error);
    sendResponse({ success: false, error: { message: error.message, details: error.stack } });
  }
}


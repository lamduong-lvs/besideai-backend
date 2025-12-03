// background/background.js
// Main background service worker - refactored for better maintainability

import { auth, SESSION_EVENTS } from '../modules/auth/auth.js';
import { apiManager, APIError, checkModelSupportsFiles as checkModelSupportsFilesUtil, callSingleModel as callSingleModelUtil, executeSharedAI as executeSharedAIUtil } from '../utils/api.js';
import { subscriptionManager } from '../modules/subscription/subscription-manager.js';
import { onboardingManager } from '../modules/subscription/onboarding-manager.js';
import { backendInit } from '../modules/subscription/backend-init.js';
// Import API Gateway at top-level (Service Worker supports static imports)
import { getApiGateway } from '../modules/api-gateway/api-gateway.js';
import { PendingImagesDB } from '../modules/panel/storage/pending-images-db.js';
import * as panelHandlers from './handlers/panel.js';
import * as apiHandlers from './handlers/api.js';
import * as gmailHandlers from './handlers/gmail.js';
import * as screenshotHandlers from './handlers/screenshot.js';

// Import helpers
import { loadI18nStrings, getLang } from './helpers/i18n.js';
import { debugLog, buildTranslationPrompt, buildRewritePrompt } from './helpers/utils.js';
import { tabWindowIdCache, panelStateCache, setupTabListeners, injectIntoTab, isInjectableURL } from './helpers/tabs.js';
import { getRecordingState, startRecordingSession, stopRecordingSession, registerRecorderTab, broadcastPauseState, broadcastMicPermissionState, broadcastCameraState } from './helpers/recording.js';
import { screenshotDataStore, handleScreenshot, handleScreenshotArea } from './helpers/screenshot-helpers.js';
import { handleOpenSidePanel } from './helpers/side-panel.js';
import { setupAuthListeners } from './listeners/auth-listeners.js';

// Store streaming ports by messageId
export const streamingPorts = new Map();

// ========================================
// INITIALIZATION
// ========================================

// ✅ KHỞI TẠO API MANAGER VÀ I18N
(async () => {
    try {
        await loadI18nStrings(); // Tải ngôn ngữ trước
        await apiManager.loadFromStorage();
        // Info log - comment out to reduce console noise
        // debugLog('Background', 'apiManager initialized');
    } catch (e) {
        console.error(getLang('errorInitApiManager'), e);
    }
})();

// ========================================
// CONTEXT MENU SETUP
// ========================================
// NOTE: Custom context menu is now handled in content script (context-menu-injector.js)
// No Chrome native context menu is used anymore

chrome.runtime.onInstalled.addListener(async (details) => {
  // Migration script for translation settings
  if (details.reason === 'install' || details.reason === 'update') {
    try {
      const data = await chrome.storage.local.get(['translatorSettings', 'translateSettings']);
      
      // Migrate translatorSettings to translateSettings
      if (data.translatorSettings && !data.translateSettings) {
        const newSettings = {
          defaultTargetLanguage: data.translatorSettings.targetLanguage || 'vi',
          sourceLanguage: data.translatorSettings.sourceLanguage || 'auto',
          quickPopupEnabled: data.translatorSettings.quickPopupEnabled !== false
        };
        await chrome.storage.local.set({ translateSettings: newSettings });
        console.log('[Migration] Migrated translatorSettings to translateSettings:', newSettings);
      }
      
      // Ensure translateSettings exists with defaults
      if (!data.translateSettings) {
        await chrome.storage.local.set({
          translateSettings: {
            defaultTargetLanguage: 'vi',
            sourceLanguage: 'auto',
            quickPopupEnabled: true
          }
        });
        console.log('[Migration] Created default translateSettings');
      }
    } catch (error) {
      console.error('[Migration] Error during migration:', error);
    }
  }
  
  if (details.reason === 'install') {
    console.log('Extension installed, setting default configuration...');
    // Cài đặt mặc định ban đầu
    chrome.storage.local.set({
      theme: 'auto',
      showFloatingIcon: true,
      // Model sẽ được set từ Backend default
    });
    await auth.initialize();
    
    // ✅ Initialize default model from Backend
    try {
      const { modelsService } = await import('../modules/subscription/models-service.js');
      const { modelPreferenceService } = await import('../modules/subscription/model-preference-service.js');
      
      await modelsService.initialize();
      const defaultModelId = await modelsService.getDefaultModel();
      
      if (defaultModelId) {
        // defaultModelId is already formatted as "provider/modelId"
        await modelPreferenceService.setPreferredModel(defaultModelId);
        await chrome.storage.local.set({
          selectedModel: defaultModelId,
          aiProvider: defaultModelId // Backward compatibility
        });
        console.log('[Background] Default model initialized from Backend:', defaultModelId);
      }
    } catch (error) {
      console.warn('[Background] Failed to initialize default model from Backend:', error);
      // Fallback to a default model
      const fallbackModel = 'openai/gpt-3.5-turbo';
      await chrome.storage.local.set({
        selectedModel: fallbackModel,
        aiProvider: fallbackModel
      });
    }
    
    // ✅ Initialize subscription system
    try {
      await subscriptionManager.initialize();
      await subscriptionManager.setTier('free'); // Default to free tier
      
      // Initialize backend systems (non-blocking)
      backendInit.initialize({
        startSync: true,
        checkMigration: true,
        syncOnInit: false
      }).catch(err => {
        console.warn('[Background] Backend init failed:', err);
      });
      
      // Show welcome screen (will be shown when panel opens)
      // Store flag to show welcome screen
      await chrome.storage.local.set({
        show_welcome_screen: true
      });
      
      console.log('[Background] Subscription system initialized for new install');
    } catch (error) {
      console.error('[Background] Failed to initialize subscription system:', error);
    }
  } else if (details.reason === 'update') {
    // Info log - comment out to reduce console noise
    // console.log('Extension updated');
    await auth.initialize();
    
    // Initialize subscription system on update
    try {
      await subscriptionManager.initialize();
      
      // Initialize backend systems on update (non-blocking)
      backendInit.initialize({
        startSync: true,
        checkMigration: true,
        syncOnInit: true // Sync on update to get latest data
      }).catch(err => {
        console.warn('[Background] Backend init failed on update:', err);
      });
      
      console.log('[Background] Subscription system initialized on update');
    } catch (error) {
      console.error('[Background] Failed to initialize subscription system on update:', error);
    }
  }
  
  // KHÔNG enable side panel tự động - chỉ enable khi user mở
  // await enableSidePanelForAllTabs();
  // Info log - comment out to reduce console noise
  // console.log('[Background] Extension installed/updated - panel will be enabled on user request only');
  
  // Custom context menu is handled in content script, no setup needed here
});

// ========================================
// STARTUP LISTENER
// ========================================

chrome.runtime.onStartup.addListener(async () => {
  console.log('[Background] Extension started');
  await auth.initialize();
  // ✅ TẢI LẠI CONFIG API VÀ I18N KHI KHỞI ĐỘNG
  await loadI18nStrings();
  await apiManager.loadFromStorage();
  // Info log - comment out to reduce console noise
  // debugLog('Background', 'apiManager re-initialized on startup');
  
  // KHÔNG enable side panel tự động - chỉ enable khi user mở
  // await enableSidePanelForAllTabs();
  console.log('[Background] Extension started - panel will be enabled on user request only');
  
  // Custom context menu is handled in content script, no setup needed here
});

// ========================================
// TAB LISTENERS
// ========================================

// Setup tab listeners with recording state
const recordingState = getRecordingState();
setupTabListeners(recordingState, injectIntoTab);

// Handle tab removal for recording
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    // Xóa windowId và panel state khỏi cache khi tab bị đóng
    tabWindowIdCache.delete(tabId);
    panelStateCache.delete(tabId);
    
    if (tabId === recordingState.recorderTabId) {
        debugLog('TabRemoved', 'Recorder tab closed, stopping recording');
        stopRecordingSession();
    }
});

// ========================================
// STREAMING CONNECTIONS
// ========================================

// Handle streaming connections
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'streaming') {
    console.log('[Background] Streaming port connected from tab:', port.sender?.tab?.id);
    
    // Listen for messageId to associate port
    port.onMessage.addListener((msg) => {
      if (msg.type === 'register' && msg.messageId) {
        streamingPorts.set(msg.messageId, port);
        console.log('[Background] Registered streaming port for messageId:', msg.messageId, 'Total ports:', streamingPorts.size);
        
        // Send confirmation back
        try {
          port.postMessage({ type: 'registered', messageId: msg.messageId });
        } catch (e) {
          console.warn('[Background] Could not send registration confirmation:', e);
        }
      }
    });
    
    port.onDisconnect.addListener(() => {
      // Clean up port from map
      for (const [msgId, p] of streamingPorts.entries()) {
        if (p === port) {
          streamingPorts.delete(msgId);
          console.log('[Background] Removed streaming port for messageId:', msgId);
          break;
        }
      }
    });
  }
});

// ========================================
// MESSAGE HANDLING
// ========================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	// Auth message handlers
    if (request.action?.startsWith('auth_') || request.type === 'auth') {
        handleAuthActions(request, sender, sendResponse);
        return true;
    }
    
    // Notification handler
    if (request.type === 'notification') {
        if (chrome.notifications && chrome.notifications.create) {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
                title: 'AI Chat Assistant',
                message: request.data?.message || 'Notification'
            }).catch(err => {
                console.log('[Background] Notification create error:', err);
            });
        }
        sendResponse({ success: true });
        return true;
    }
    
    // i18n helper: fetch lang JSON via SW (bypass page fetch issues)
    if (request.action === 'I18N_FETCH') {
        (async () => {
            try {
                const langCode = request.lang || 'vi';
                const url = chrome.runtime.getURL(`lang/${langCode}.json`);
                const r = await fetch(url);
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                const data = await r.json();
                sendResponse({ success: true, data });
            } catch (e) {
                console.error('[Background] I18N_FETCH error:', e);
                sendResponse({ success: false, error: e.message });
            }
        })();
        return true;
    }
    
    // Router Pattern: Check if action has a handler
    const handler = ACTION_ROUTER[request.action];
    if (handler) {
        (async () => {
            let responseSent = false;
            const safeSendResponse = (response) => {
                if (!responseSent) {
                    try {
                        sendResponse(response);
                        responseSent = true;
                    } catch (error) {
                        console.warn(`[Background] Failed to send response for "${request.action}" (channel may be closed):`, error);
                    }
                }
            };
            
            try {
                await handler(request, sender, sendResponse);
            } catch (error) {
                // Chỉ gọi sendResponse nếu handler không gọi (handler nên tự xử lý lỗi)
                // Nhưng để an toàn, vẫn gọi nếu có lỗi ở wrapper level
                console.error(`[Background] Error in handler for "${request.action}":`, error);
                if (!responseSent) {
                    if (error instanceof APIError) {
                        safeSendResponse({ success: false, error: { message: `${error.provider}: ${error.message}` } });
                    } else {
                        safeSendResponse({ success: false, error: { message: error.message || 'Unknown error' } });
                    }
                }
            }
        })();
        return true; // Keep channel open for async
    }
    

    if (request.action === 'GET_AUTH_TOKEN') {
        debugLog('AuthToken', 'Nhận được yêu cầu GET_AUTH_TOKEN...');
        
        if (chrome.identity && chrome.identity.getAuthToken) {
            // Yêu cầu token
            // 'interactive: true' sẽ hiện popup đăng nhập nếu cần
            chrome.identity.getAuthToken({ interactive: true }, (token) => {
                if (chrome.runtime.lastError) {
                    // Lỗi (ví dụ: người dùng đóng popup)
                    console.error("Background Error (getAuthToken):", chrome.runtime.lastError.message);
                    sendResponse({ success: false, error: chrome.runtime.lastError.message });
                } else if (token) {
                    // Gửi token về cho content script
                    debugLog('AuthToken', 'Đã lấy token, đang gửi về tab...');
                    sendResponse({ success: true, token: token });
                } else {
                    // Lỗi không xác định
                    sendResponse({ success: false, error: getLang('errorGetAuthTokenDefault') });
                }
            });
        } else {
            // Lỗi hiếm gặp
            const errorMsg = getLang('errorGetAuthTokenApi');
            console.error("Background Error:", errorMsg);
            sendResponse({ success: false, error: errorMsg });
        }
        
        // Rất quan trọng: Báo cho Chrome biết rằng chúng ta sẽ trả lời bất đồng bộ
        return true; 
    }

    const knownActions = [
		'openRecorderPopup', 'updateBadge',
        'recorderControl', 'startRecordingSession', 'stopRecordingSession', 'registerRecorderTab',
        'injectIntoNewTab', 'broadcastMicPermission', 'hideContextMenu', 'newChat',
        'meetExtensionReady',
        'createGoogleDoc'
    ];

    if (knownActions.includes(request.action)) {
        (async () => {
            try {
                switch (request.action) {
                    case 'openRecorderPopup': { await chrome.action.openPopup(); sendResponse({ success: true }); break; }
                    case 'startRecordingSession': { startRecordingSession(request.settings, sender.tab.id, request.sharingMode || 'monitor', request.targetTabs || []); sendResponse({ success: true }); break; }
                    case 'stopRecordingSession': { stopRecordingSession(); sendResponse({ success: true }); break; }
                    case 'registerRecorderTab': { 
                        registerRecorderTab(request.recorderTabId, request.settings, request.sharingMode, request.targetTabs); 
                        sendResponse({ success: true }); 
                        break; 
                    }
                    case 'injectIntoNewTab': { if (recordingState.isRecording && request.tabId) { const success = await injectIntoTab(request.tabId, recordingState.settings); sendResponse({ success }); } else { sendResponse({ success: false, error: 'Not recording' }); } break; }

                    case 'updateBadge': { if (request.text) { chrome.action.setBadgeText({ text: request.text }); chrome.action.setBadgeBackgroundColor({ color: request.color || '#FF0000' }); } else { chrome.action.setBadgeText({ text: '' }); } sendResponse({ success: true }); break; }
                    case 'recorderControl': { debugLog('Background', 'Received recorderControl:', request.controlAction, request.data); if (recordingState.recorderTabId) { try { await chrome.tabs.sendMessage(recordingState.recorderTabId, { action: 'recorderControl', controlAction: request.controlAction, data: request.data }); } catch (err) { debugLog('RecorderControl', 'Failed to forward to recorder tab:', err.message); } } if (request.controlAction === 'pause') { await broadcastPauseState(request.data.isPaused); } else if (request.controlAction === 'toggleCamera') { await broadcastCameraState(request.data.enabled); } else if (request.controlAction === 'cameraClosed') { await broadcastCameraState(false); } sendResponse({ success: true }); break; }
                    case 'broadcastMicPermission': { debugLog('Background', 'Broadcasting mic permission state:', request.enabled); await broadcastMicPermissionState(request.enabled); sendResponse({ success: true }); break; }
                    case 'newChat':
                    case 'hideContextMenu': { sendResponse({ success: true }); break; }
				
					case 'meetExtensionReady': {
                        console.log('[Background] Meet extension ready:', request.url);
                        sendResponse({ success: true });
                        break;
                    }

                    case 'createGoogleDoc': {
                        console.log('[Background] Creating Google Doc:', request.title);
                        
                        const content = request.content;
                        const title = request.title || 'Meet Summary';
                        
                        // Create blob and download
                        const blob = new Blob([content], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        
                        chrome.downloads.download({
                            url: url,
                            filename: `${title.replace(/[^a-z0-9]/gi, '_')}.txt`,
                            saveAs: true
                        }, (downloadId) => {
                            URL.revokeObjectURL(url);
                            
                            if (downloadId) {
                                sendResponse({ 
                                    success: true, 
                                    docUrl: 'Downloaded as text file'
                                });
                            } else {
                                sendResponse({ 
                                    success: false, 
                                    error: getLang('errorDownloadFailed')
                                });
                            }
                        });
                        
                        break;
                    }

                } // Kết thúc switch

            } catch (error) {
                console.error(`Error handling action "${request.action}":`, error);
                 if (error instanceof APIError) { sendResponse({ success: false, error: { message: `${error.provider}: ${error.message}` } }); } 
                 else { sendResponse({ success: false, error: { message: error.message } }); }
            } // ✅ ĐÓNG khối try-catch
        })();
        return true; // Giữ kênh mở cho (async)
    }
});

// ========================================
// API & ACTION FUNCTIONS
// ========================================

/**
 * Kiểm tra model có hỗ trợ files (multimodal) không
 */
function checkModelSupportsFiles(providerId, modelId, providerType) {
    return checkModelSupportsFilesUtil(providerId, modelId, providerType);
}

/**
 * ✅ UPDATED: Call single model using API Gateway
 * Supports both new signature (with apiGateway) and old signature (for backward compatibility)
 */
async function callSingleModel(fullModelId, messages, signal, ...args) {
    // Check if old signature is used (has apiManager as 4th arg)
    const isOldSignature = args.length > 0 && (args[0] === apiManager || typeof args[0] === 'object');
    
    if (isOldSignature) {
        // Old signature: callSingleModel(fullModelId, messages, signal, apiManager, getLang, debugLog, APIError, streamCallback)
        const [apiManagerArg, getLangArg, debugLogArg, APIErrorArg, streamCallback] = args;
        try {
            // Use API Gateway (all calls go through Backend)
            const gateway = getApiGateway();
            await gateway.ensureInitialized();
            const [providerId, model] = fullModelId.split('/');
            const text = messages.map(m => m.content).join(' ');
            const estimatedTokens = Math.ceil(text.length / 4);
            
            const result = await gateway.call(messages, {
                providerId: providerId,
                model: model,
                feature: 'chat',
                estimatedTokens: estimatedTokens,
                stream: !!streamCallback,
                streamCallback: streamCallback
            });
            
            return {
                content: result.content,
                providerId: result.providerId,
                modelId: result.modelId,
                fullModelId: result.fullModelId,
                streamed: result.streamed || false
            };
        } catch (error) {
            // NO FALLBACK - All calls must go through Backend
            console.error('[Background] API Gateway failed - Backend required:', error);
            throw new Error(`Backend unavailable: ${error.message}. Please check your connection and try again.`);
        }
    } else {
        // New signature: callSingleModel(fullModelId, messages, signal, streamCallback)
        const streamCallback = args[0] || null;
        try {
            // Use API Gateway (all calls go through Backend)
            const gateway = getApiGateway();
            await gateway.ensureInitialized();
            const [providerId, model] = fullModelId.split('/');
            const text = messages.map(m => m.content).join(' ');
            const estimatedTokens = Math.ceil(text.length / 4);
            
            const result = await gateway.call(messages, {
                providerId: providerId,
                model: model,
                feature: 'chat',
                estimatedTokens: estimatedTokens,
                stream: !!streamCallback,
                streamCallback: streamCallback
            });
            
            return {
                content: result.content,
                providerId: result.providerId,
                modelId: result.modelId,
                fullModelId: result.fullModelId,
                streamed: result.streamed || false
            };
        } catch (error) {
            // NO FALLBACK - All calls must go through Backend
            console.error('[Background] API Gateway failed - Backend required:', error);
            throw new Error(`Backend unavailable: ${error.message}. Please check your connection and try again.`);
        }
    }
}

/**
 * ✅ UPDATED: Execute shared AI using API Gateway
 * Chỉ sử dụng Single Mode - Model được chọn từ user preference hoặc default
 */
async function executeSharedAI(messages, feature = 'chat') {
    try {
        // Use API Gateway (all calls go through Backend)
        const gateway = getApiGateway();
        await gateway.ensureInitialized();
        
        // Get user's selected model (from preference or default)
        const settings = await chrome.storage.local.get(['selectedModel', 'aiProvider']);
        const selectedModel = settings.selectedModel || settings.aiProvider;
        
        if (!selectedModel) {
            throw new Error(getLang('errorNoModelConfigured'));
        }
        
        // Estimate tokens
        const text = messages.map(m => m.content).join(' ');
        const estimatedTokens = Math.ceil(text.length / 4);
        
        // Single model call only
        debugLog('executeSharedAI', 'Running Single Mode via Gateway', selectedModel);
        const [providerId, model] = selectedModel.split('/');
        const result = await gateway.call(messages, {
            providerId: providerId,
            model: model,
            feature: feature,
            estimatedTokens: estimatedTokens
        });
        
        return {
            content: result.content,
            providerId: result.providerId,
            modelId: result.modelId,
            fullModelId: result.fullModelId,
            streamed: result.streamed || false
        };
    } catch (error) {
        // NO FALLBACK - All calls must go through Backend
        console.error('[Background] API Gateway executeSharedAI failed - Backend required:', error);
        throw new Error(`Backend unavailable: ${error.message}. Please check your connection and try again.`);
    }
}

// ========================================
// CONTEXT MENU & COMMANDS
// ========================================

// Custom context menu actions are handled via chrome.runtime.onMessage
// See ACTION_ROUTER below for 'contextMenuAction' handler

// Xử lý phím tắt (nếu bạn định nghĩa trong manifest.json)
if (chrome.commands) {
    chrome.commands.onCommand.addListener((command, tab) => {
        if (command === 'open-popup') { // Ví dụ tên command là 'open-popup'
            // Có thể dùng để mở recorder popup
            chrome.action.openPopup();
            // Hoặc gửi lệnh mở side panel cho content script
            // if (tab && tab.id) {
            //     chrome.tabs.sendMessage(tab.id, { action: 'toggleSidePanel' });
            // }
        }
    });
}

// ========================================
// ROUTER PATTERN: Initialize Handlers
// ========================================
// Initialize handlers with dependencies (after all functions are defined)
panelHandlers.initializePanelHandlers({
  panelStateCache,
  tabWindowIdCache,
  isInjectableURL,
  getLang,
  handleOpenSidePanelInternal: handleOpenSidePanel
});

apiHandlers.initializeAPIHandlers({
  streamingPorts: streamingPorts,
  apiManager,
  getLang,
  debugLog,
  checkModelSupportsFiles,
  callSingleModel,
  APIError
});

gmailHandlers.initializeGmailHandlers({
  getLang,
  executeSharedAI,
  buildTranslationPrompt,
  buildRewritePrompt,
  streamingPorts: streamingPorts,
  apiManager,
  callSingleModel,
  debugLog,
  APIError
});

screenshotHandlers.initializeScreenshotHandlers({
  getLang,
  handleScreenshot,
  handleScreenshotArea,
  screenshotDataStore,
  PendingImagesDB,
  startRecordingSession // Pass the function as a dependency
});

// Router mapping: action -> handler function
const ACTION_ROUTER = {
  // Panel actions
  'openSidePanel': panelHandlers.handleOpenSidePanel,
  'closeSidePanel': panelHandlers.handleCloseSidePanel,
  'panelClosed': panelHandlers.handlePanelClosed,
  'enableSidePanelForTab': panelHandlers.handleEnableSidePanelForTab,
  'ensureSidePanelOpen': panelHandlers.handleEnsureSidePanelOpen,
  'openSidePanelForTab': panelHandlers.handleOpenSidePanelForTab,
  
  // API actions
  'processAction': apiHandlers.handleProcessAction,
  'processActionStream': apiHandlers.handleProcessActionStream,
  'getAIConfig': apiHandlers.handleGetAIConfig,
  
  // Gmail actions
  'SUMMARIZE_EMAIL': gmailHandlers.handleSummarizeEmail,
  'COMPOSE_EMAIL': gmailHandlers.handleComposeEmail,
  'QUERY_EMAIL_CONTEXT': gmailHandlers.handleQueryEmailContext,
  'TRANSLATE_TEXT': gmailHandlers.handleTranslateText,
  'ANALYZE_EMAIL_FOR_EVENTS': gmailHandlers.handleAnalyzeEmailForEvents,
  'TRANSLATE_SUGGESTION': gmailHandlers.handleTranslateSuggestion,
  'REWRITE_TEXT': gmailHandlers.handleRewriteText,
  
  // Screenshot actions
  'contextMenuAction': screenshotHandlers.handleContextMenuAction,
  'screenshotAreaSelected': screenshotHandlers.handleScreenshotAreaSelected,
  'processScreenshotForChat': screenshotHandlers.handleProcessScreenshotForChat,
  'getScreenshotData': screenshotHandlers.handleGetScreenshotData,
  'startRecording': screenshotHandlers.handleStartRecording,
};

// ========================================
// KEEP ALIVE
// ========================================

// Giữ service worker sống (quan trọng)
let keepAliveInterval;
function keepAlive() {
    keepAliveInterval = setInterval(() => {
        // Thực hiện một hành động API không đáng kể để reset bộ đếm thời gian chờ
        if (chrome.runtime.getPlatformInfo) {
            chrome.runtime.getPlatformInfo(() => {
                // Callback rỗng, chỉ cần gọi API
                let error = chrome.runtime.lastError; // Kiểm tra lỗi để tránh log không cần thiết
                // if (error) console.log("Keep alive ping failed:", error);
            });
        }
        // Hoặc dùng chrome.alarms API nếu cần độ chính xác cao hơn
    }, 20 * 1000); // Gửi ping mỗi 20 giây
}
keepAlive(); // Bắt đầu keepAlive khi script chạy

// ========================================
// AUTH HANDLERS
// ========================================

// Xử lý các action liên quan đến Auth gửi từ các phần khác của extension
async function handleAuthActions(request, sender, sendResponse) {
  try {
    switch(request.action) {
      case 'auth_initialize': await auth.initialize(); sendResponse({ success: true }); break;
      case 'auth_login': 
        const useWebFlow = request.useWebFlow || false;
        const user = await auth.login(request.accountHint, useWebFlow); 
        sendResponse({ success: true, user }); 
        break;
      case 'auth_logout': await auth.logout(); sendResponse({ success: true }); break;
      case 'auth_is_logged_in': const isLoggedIn = await auth.isLoggedIn(); sendResponse({ success: true, isLoggedIn }); break;
      case 'auth_get_user': const currentUser = await auth.getCurrentUser(); sendResponse({ success: true, user: currentUser }); break;
      case 'auth_get_token': const token = await auth.getToken(); sendResponse({ success: true, token }); break;
      case 'auth_get_session_stats': const stats = await auth.getSessionStats(); sendResponse({ success: true, stats }); break;
      case 'auth_web_callback':
        // Handle web callback - save token and get user info
        await handleWebAuthCallback(request.token, sendResponse);
        return true; // Keep channel open for async
      default: sendResponse({ success: false, error: getLang('errorAuthUnknownAction') });
    }
  } catch (error) {
    console.error('[Background] Auth action failed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle web authentication callback
async function handleWebAuthCallback(token, sendResponse) {
  try {
    console.log('[Background] Handling web auth callback...');
    
    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!userInfoResponse.ok) {
      throw new Error('Failed to get user info from Google');
    }
    
    const googleUserInfo = await userInfoResponse.json();
    
    const user = {
      id: googleUserInfo.id,
      email: googleUserInfo.email,
      name: googleUserInfo.name,
      picture: googleUserInfo.picture,
      verified_email: googleUserInfo.verified_email
    };
    
    // Establish session with token
    await auth.sessionManager.establishSession(user);
    
    // Store token in chrome.storage.local
    await chrome.storage.local.set({ 'web_auth_token': token });
    
    console.log('[Background] Web auth callback successful:', user.email);
    sendResponse({ success: true, user });
    
    // Token is already stored in chrome.storage.local as 'web_auth_token'
    // oauth-handler will detect it via chrome.storage.onChanged listener
    // Also broadcast message for direct listeners
    chrome.runtime.sendMessage({
      action: 'auth_web_callback_token',
      token: token,
      promiseId: 'any' // Will match any listener waiting for token
    }).catch(() => {
      // Ignore errors if no listeners
    });
    
  } catch (error) {
    console.error('[Background] Web auth callback failed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// ========================================
// AUTH LISTENERS
// ========================================

// Setup auth listeners
setupAuthListeners();

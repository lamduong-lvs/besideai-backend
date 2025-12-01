// background/helpers/recording.js
// Recording session management

import { debugLog } from './utils.js';
import { isInjectableURL, injectIntoTab } from './tabs.js';

let recordingState = {
    isRecording: false,
    settings: null,
    recorderTabId: null,
    sharingMode: 'monitor',
    targetTabs: []
};

export function getRecordingState() {
    return recordingState;
}

/**
 * Bắt đầu một phiên ghi hình mới.
 * @param {object} settings - Cài đặt ghi hình
 * @param {number} tabId - ID của tab yêu cầu
 * @returns {Promise<object>} - Promise resolves với { success: true, streamId: '...' } nếu thành công
 */
export function startRecordingSession(settings, tabId) {
  return new Promise(async (resolve, reject) => {
    // ✅ Check feature availability
    try {
      const { checkFeatureAvailability } = await import('../../modules/features/feature-check-helper.js');
      const isAvailable = await checkFeatureAvailability('recording', {
        durationMinutes: 60 // Estimate 1 hour for recording session
      });
      if (!isAvailable) {
        recordingState.isRecording = false;
        reject(new Error('Recording feature is not available for your subscription tier'));
        return;
      }
    } catch (error) {
      console.error('[Recording] Error checking feature availability:', error);
      // Continue anyway if check fails
    }

    if (recordingState.isRecording) {
      debugLog('Recording', 'Recording is already in progress.');
      reject(new Error('Recording is already in progress.'));
      return;
    }

    recordingState.isRecording = true;
    recordingState.settings = settings;

    const sourceTypes = [];
    if (settings.source === 'tab') sourceTypes.push('tab');
    if (settings.source === 'desktop') sourceTypes.push('window', 'screen', 'audio');
    
    // Nếu chỉ quay camera thì không cần chọn nguồn
    if (settings.source === 'camera') {
        // ... (logic for camera only recording)
    }

    try {
      let targetTab;
      try {
          targetTab = await chrome.tabs.get(tabId);
      } catch (err) {
          console.error('Could not get target tab for desktop capture:', err);
          throw new Error('Could not find the target tab to show the screen selection prompt.');
      }

      const streamId = await new Promise((resolveChoose, rejectChoose) => {
        chrome.desktopCapture.chooseDesktopMedia(sourceTypes, targetTab, (streamId, options) => {
          if (streamId) {
            resolveChoose(streamId);
          } else {
            debugLog('Recording', 'User cancelled screen sharing selection.');
            recordingState.isRecording = false;
            recordingState.settings = null;
            resolve(null);
          }
        });
      });

      if (!streamId) {
         // Cancelled
         resolve({ success: false, cancelled: true });
         return;
      }

      // ✅ KHÔNG set badge "REC" ở đây
      // Tab recorder sẽ set badge với thời gian sau khi bắt đầu recording
      // await updateBadge('REC', '#FF0000');

      // ✅ KHÔNG MỞ TAB RECORDER Ở ĐÂY
      // Tab recorder đã được mở từ toolbar trước đó
      // Chỉ cần set recorderTabId và trả về streamId
      recordingState.recorderTabId = tabId;
      
      console.log('[Recording] Screen selected, streamId:', streamId, 'recorderTabId:', tabId);

      // ✅ LƯU STREAMID VÀO STORAGE ĐỂ TAB RECORDER CÓ THỂ ĐỌC
      // Tab recorder sẽ kiểm tra storage trước khi gọi startRecordingSession
      // Nếu có streamId trong storage, tab recorder sẽ sử dụng nó thay vì gọi startRecordingSession lại
      await chrome.storage.local.set({ 
        recorderStreamId: streamId,
        recorderSettings: settings,
        recorderTabId: tabId
      });
      console.log('[Recording] Saved streamId to storage for recorder tab');
      
      // === INJECT FEATURES INTO TABS ===
      // Inject Control Bar, Camera, etc. into all injectable tabs
      // Skip the recorder tab itself
      try {
          const allTabs = await chrome.tabs.query({});
          for (const tab of allTabs) {
              // Skip the recorder tab itself and non-injectable URLs
              if (tab.id !== tabId && isInjectableURL(tab.url)) {
                  console.log('[Recording] Injecting features into tab:', tab.id);
                  // We don't await this to speed up the start process
                  injectIntoTab(tab.id, settings).catch(err => console.error('Injection failed for tab', tab.id, err));
              }
          }
      } catch (injectError) {
          console.warn('[Recording] Error injecting features:', injectError);
      }
      
      // Resolve with the streamId so the caller knows it succeeded
      resolve({ success: true, streamId: streamId, recorderTabId: tabId });

    } catch (error) {
      console.error('Error starting recording session:', error);
      // Reset state on error
      recordingState.isRecording = false;
      recordingState.settings = null;
      await updateBadge('', '');
      reject(error);
    }
  });
}


/**
 * Đăng ký recorder tab với background (được gọi từ tab recorder sau khi load)
 */
export function registerRecorderTab(recorderTabId, settings, sharingMode, targetTabs) {
    if (!recordingState.isRecording) {
        console.warn('[Recording] Attempted to register recorder tab but no recording session is active');
        return;
    }
    
    // Cập nhật recorderTabId nếu chưa được set hoặc khác
    if (recordingState.recorderTabId !== recorderTabId) {
        console.log('[Recording] Updating recorderTabId:', recordingState.recorderTabId, '->', recorderTabId);
        recordingState.recorderTabId = recorderTabId;
    }
    
    // Cập nhật settings và sharing mode nếu có
    if (settings) {
        recordingState.settings = settings;
    }
    if (sharingMode) {
        recordingState.sharingMode = sharingMode;
    }
    if (targetTabs) {
        recordingState.targetTabs = targetTabs;
    }
    
    console.log('[Recording] Recorder tab registered:', recorderTabId);
}

export function stopRecordingSession() {
    recordingState.isRecording = false;
    recordingState.settings = null;
    recordingState.recorderTabId = null;
    recordingState.sharingMode = 'monitor';
    recordingState.targetTabs = [];
    chrome.action.setBadgeText({ text: '' });
    debugLog('Session', 'Recording session stopped');
}

export async function broadcastPauseState(isPaused) {
    debugLog('Broadcast', 'Broadcasting pause state:', isPaused);
    const tabs = await chrome.tabs.query({});
    let successCount = 0;
    for (const tab of tabs) {
        if (tab.id === recordingState.recorderTabId || !isInjectableURL(tab.url)) continue;
        try {
            await chrome.tabs.get(tab.id);
            await chrome.tabs.sendMessage(tab.id, { action: 'updatePauseState', isPaused: isPaused });
            successCount++;
        } catch (err) {
            /* Ignored */
        }
    }
    debugLog('Broadcast', `Pause state sent to ${successCount} tabs`);
}

export async function broadcastMicPermissionState(hasPermission) {
    debugLog('Broadcast', 'Broadcasting mic PERMISSION state:', hasPermission);
    const tabs = await chrome.tabs.query({});
    let successCount = 0;
    for (const tab of tabs) {
        if (tab.id === recordingState.recorderTabId || !isInjectableURL(tab.url)) continue;
        try {
            await chrome.tabs.get(tab.id);
            await chrome.tabs.sendMessage(tab.id, { action: 'updateMicState', enabled: hasPermission });
            successCount++;
        } catch (err) {
            /* Ignored */
        }
    }
    debugLog('Broadcast', `Mic permission state sent to ${successCount} tabs`);
}

export async function broadcastCameraState(enabled) {
    debugLog('Broadcast', 'Broadcasting camera state:', enabled);
    const tabs = await chrome.tabs.query({});
    let successCount = 0;
    for (const tab of tabs) {
        if (tab.id === recordingState.recorderTabId || !isInjectableURL(tab.url)) continue;
        try {
            await chrome.tabs.get(tab.id);
            await chrome.tabs.sendMessage(tab.id, { action: 'updateCameraState', enabled: enabled, _fromBroadcast: true });
            successCount++;
        } catch (err) {
            /* Ignored */
        }
    }
    debugLog('Broadcast', `Camera state sent to ${successCount} tabs`);
}

/**
 * Helper function to update the extension badge.
 * @param {string} text - The text to display on the badge.
 * @param {string} color - The background color of the badge.
 */
async function updateBadge(text, color) {
    try {
        await chrome.action.setBadgeText({ text: text || '' });
        if (color) {
            await chrome.action.setBadgeBackgroundColor({ color: color });
        }
    } catch (error) {
        console.error('Error updating badge:', error);
    }
}

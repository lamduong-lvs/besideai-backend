// setting/services/server-settings.js - Server settings service

import { showToast } from '../modules/core/toast.js';

export async function loadServerSettings() {
  try {
    const data = await chrome.storage.local.get(['aiServerConfig']);
    console.log("[Setting] Loaded server settings:", data);
    populateServerModeSettings(data.aiServerConfig);
  } catch (error) {
    console.error('[ServerSettings] Failed to load:', error);
  }
}

export function populateServerModeSettings(serverConfig) {
  const enableServerMode = document.getElementById('enableServerMode');
  const serverConfigSection = document.getElementById('serverConfigSection');
  const serverUrl = document.getElementById('serverUrl');
  const serverFallback = document.getElementById('serverFallbackToLocal');
  
  if (!enableServerMode || !serverConfigSection) return;
  
  const config = serverConfig || { enabled: false, serverUrl: '', fallbackToLocal: true };
  
  enableServerMode.checked = config.enabled || false;
  if (serverUrl) serverUrl.value = config.serverUrl || '';
  if (serverFallback) serverFallback.checked = config.fallbackToLocal !== false;
  
  if (enableServerMode.checked) {
    serverConfigSection.classList.remove('d-none');
  } else {
    serverConfigSection.classList.add('d-none');
  }
}

export async function saveServerModeSettings() {
  const enableServerMode = document.getElementById('enableServerMode');
  const serverUrl = document.getElementById('serverUrl');
  const serverFallback = document.getElementById('serverFallbackToLocal');
  
  if (!enableServerMode) return;
  
  const config = {
    enabled: enableServerMode.checked,
    serverUrl: serverUrl?.value.trim() || '',
    fallbackToLocal: serverFallback?.checked !== false,
    timeout: 60000,
    retryAttempts: 3,
    retryDelay: 1000
  };
  
  try {
    await chrome.storage.local.set({ aiServerConfig: config });
    showToast(window.Lang?.get('successSaveServerSettings') || 'Server settings saved', 'success');
  } catch (error) {
    console.error('[ServerSettings] Failed to save:', error);
    showToast(window.Lang?.get('errorSaveServerSettings') || 'Failed to save server settings', 'error');
  }
}

export async function testServerConnection() {
  const serverUrl = document.getElementById('serverUrl')?.value.trim();
  const testResult = document.getElementById('serverTestResult');
  const testBtn = document.getElementById('testServerConnection');
  
  if (!serverUrl) {
    showToast(window.Lang?.get('errorServerUrlRequired') || 'Server URL is required', 'error');
    return;
  }
  
  if (testBtn) testBtn.disabled = true;
  if (testResult) {
    testResult.classList.remove('d-none');
    testResult.className = 'test-result test-result-loading';
    testResult.innerHTML = '<div class="test-result-text">Testing connection...</div>';
  }
  
  try {
    const { testServerConnection } = await import('../../modules/ai/config/server-config.js');
    const result = await testServerConnection(serverUrl);
    
    if (testResult) {
      if (result.success) {
        testResult.className = 'test-result test-result-success';
        testResult.innerHTML = `<div class="test-result-text">✓ ${result.message || 'Connection successful!'}</div>`;
      } else {
        testResult.className = 'test-result test-result-error';
        testResult.innerHTML = `<div class="test-result-text">✗ ${result.error || 'Connection failed'}</div>`;
      }
    }
    
    if (result.success) {
      showToast(window.Lang?.get('successServerConnection') || 'Server connection successful', 'success');
    } else {
      showToast(window.Lang?.get('errorServerConnection') || result.error || 'Connection failed', 'error');
    }
  } catch (error) {
    console.error('[ServerSettings] Test connection error:', error);
    if (testResult) {
      testResult.className = 'test-result test-result-error';
      testResult.innerHTML = `<div class="test-result-text">✗ ${error.message || 'Test failed'}</div>`;
    }
    showToast(window.Lang?.get('errorServerConnection') || error.message || 'Test failed', 'error');
  } finally {
    if (testBtn) testBtn.disabled = false;
  }
}


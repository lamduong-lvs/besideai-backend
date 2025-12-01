// setting/modules/pages/model-settings-page.js - Model settings page

import { apiManager } from '../../../utils/api.js';
import { showToast } from '../core/toast.js';
import { 
  saveModelSelectionSettings, 
  refreshModelSelectionSettings, 
  syncModelSelectionSettings,
  updateModelList 
} from '../../services/model-settings.js';
import { initRaceTest } from './race-test.js';

export function initModelSettingsPage() {
  setupAutoSaveListeners();
  setupProviderEventListeners();
  initRaceTest();
}

function setupAutoSaveListeners() {
  // const saveBtn = document.getElementById('saveProviderSettings');
  // saveBtn?.addEventListener('click', saveModelSelectionSettings);
  
  // Auto-save model selection settings
  document.getElementById('defaultModelSelect')?.addEventListener('change', saveModelSelectionSettings);
  document.getElementById('enableRacingMode')?.addEventListener('change', saveModelSelectionSettings);
  document.getElementById('racingModelChecklist')?.addEventListener('change', (e) => {
    if (e.target.name === 'racingModel') {
      saveModelSelectionSettings();
    }
  });

  // Race mode toggle UI update
  const raceToggle = document.getElementById('enableRacingMode');
  raceToggle?.addEventListener('change', (e) => {
    const testSection = document.getElementById('race-test-section');
    if (testSection) {
      if (e.target.checked) {
        testSection.classList.remove('d-none');
      } else {
        testSection.classList.add('d-none');
      }
    }
  });
}

function setupProviderEventListeners() {
  // Server mode listeners
  const enableServerMode = document.getElementById('enableServerMode');
  const serverConfigSection = document.getElementById('serverConfigSection');
  const testServerBtn = document.getElementById('testServerConnection');
  
  enableServerMode?.addEventListener('change', async (e) => {
    if (serverConfigSection) {
      if (e.target.checked) {
        serverConfigSection.classList.remove('d-none');
      } else {
        serverConfigSection.classList.add('d-none');
      }
    }
    const { saveServerModeSettings } = await import('../../services/server-settings.js');
    saveServerModeSettings();
  });
  
  document.getElementById('serverUrl')?.addEventListener('blur', async () => {
    const { saveServerModeSettings } = await import('../../services/server-settings.js');
    saveServerModeSettings();
  });
  
  document.getElementById('serverFallbackToLocal')?.addEventListener('change', async () => {
    const { saveServerModeSettings } = await import('../../services/server-settings.js');
    saveServerModeSettings();
  });
  
  testServerBtn?.addEventListener('click', async () => {
    const { testServerConnection } = await import('../../services/server-settings.js');
    testServerConnection();
  });
  
  // Event delegation for dynamically created provider pages
  const contentHost = document.getElementById('content-host');
  contentHost?.addEventListener('click', async (e) => {
    const target = e.target.closest('button');
    if (!target) return;
    
    const providerId = target.dataset.provider;
    const pageElement = target.closest('.setting-page');
    
    if (!providerId || !pageElement) return;
    
    switch (target.getAttribute('name')) {
      // This will be handled by blur event now
      // case 'saveProviderCredentials':
      //   await saveProviderCredentials(providerId, pageElement);
      //   break;
      case 'addModel':
        await handleAddModel(providerId, pageElement);
        break;
      case 'testApiConnection':
        await testApiConnection(providerId, pageElement);
        break;
    }
    
    if (target.classList.contains('delete-model-btn')) {
      const modelId = target.dataset.modelId;
      if (modelId) {
        await handleDeleteModel(providerId, modelId);
      }
    }
  });

  // Add blur event listeners for auto-saving credentials
  contentHost?.addEventListener('blur', async (e) => {
    const target = e.target;
    if (target.matches('.provider-apiKey, .provider-baseURL, .provider-anthropicVersion')) {
      const pageElement = target.closest('.setting-page');
      const providerId = pageElement?.dataset.pageId?.replace('provider-', '');
      if (providerId && pageElement) {
        await saveProviderCredentials(providerId, pageElement, true); // Pass a flag to suppress toast
      }
    }
  }, true); // Use capturing to ensure blur event is caught
}

async function saveProviderCredentials(providerId, pageElement, isAutoSave = false) {
  const apiKeyInput = pageElement.querySelector('.provider-apiKey');
  const baseURLInput = pageElement.querySelector('.provider-baseURL');
  
  const apiKey = apiKeyInput?.value.trim() || null;
  const baseURL = baseURLInput?.value.trim() || null;
  
  // Do not show error toast on auto-save if key is empty, just silently fail
  if (providerId !== 'cerebras' && !apiKey) {
    if (!isAutoSave) {
      showToast(window.Lang?.get('errorProviderApiKey', { providerId }) || 'API Key required', 'error');
    }
    return;
  }
  
  let credentials = { apiKey, baseURL };
  
  if (providerId === 'anthropic') {
    const versionInput = pageElement.querySelector('.provider-anthropicVersion');
    credentials.anthropicVersion = versionInput?.value.trim() || '2023-06-01';
  }
  
  try {
    await apiManager.updateProviderCredentials(providerId, credentials);
    if (!isAutoSave) {
      showToast(window.Lang?.get('successProviderApiSaved', { providerId }) || 'API saved', 'success');
    }
    await refreshModelSelectionSettings();
    await syncModelSelectionSettings();
  } catch (error) {
    console.error(`Failed to save credentials for ${providerId}:`, error);
    showToast(window.Lang?.get('errorProviderApiSaved', { providerId }) || 'Failed to save', 'error');
  }
}

async function handleAddModel(providerId, pageElement) {
  const modelIdInput = pageElement.querySelector('.provider-modelId');
  const displayNameInput = pageElement.querySelector('.provider-displayName');
  
  const modelId = modelIdInput?.value.trim();
  const displayName = displayNameInput?.value.trim();
  
  if (!modelId || !displayName) {
    showToast(window.Lang?.get('errorProviderModelFields') || 'All fields required', 'error');
    return;
  }
  
  try {
    const modelData = { id: modelId, displayName };
    await apiManager.addModelToProvider(providerId, modelData);
    showToast(window.Lang?.get('successProviderModelAdded', { displayName }) || 'Model added', 'success');
    if (modelIdInput) modelIdInput.value = '';
    if (displayNameInput) displayNameInput.value = '';
    
    const provider = apiManager.getProvider(providerId);
    if (provider) updateModelList(pageElement, provider);
    await refreshModelSelectionSettings();
    await syncModelSelectionSettings();
  } catch (error) {
    console.error(`Failed to add model to ${providerId}:`, error);
    showToast(window.Lang?.get('errorProviderModelAdd', { error: error.message }) || 'Failed to add', 'error');
  }
}

async function handleDeleteModel(providerId, modelId) {
  if (!confirm(window.Lang?.get('confirmDeleteModel', { modelId }) || `Delete ${modelId}?`)) return;
  
  try {
    await apiManager.deleteModelFromProvider(providerId, modelId);
    showToast(window.Lang?.get('successProviderModelDeleted', { modelId }) || 'Model deleted', 'success');
    
    const provider = apiManager.getProvider(providerId);
    const pageElement = document.querySelector(`[data-page-id="provider-${providerId}"]`);
    if (provider && pageElement) updateModelList(pageElement, provider);
    await refreshModelSelectionSettings();
    await syncModelSelectionSettings();
  } catch (error) {
    console.error(`Failed to delete model ${modelId} from ${providerId}:`, error);
    showToast(window.Lang?.get('errorProviderModelDelete', { error: error.message }) || 'Failed to delete', 'error');
  }
}

async function testApiConnection(providerId, pageElement) {
  const provider = apiManager.getProvider(providerId);
  if (!provider) {
    showToast(window.Lang?.get('errorProviderNotFound', { providerId }) || 'Provider not found', 'error');
    return;
  }
  
  const testModelId = provider.models[0]?.id || apiManager.getDefaultModelForProvider(providerId);
  
  if (!testModelId) {
    showToast(window.Lang?.get('errorProviderTestNoModel', { name: provider.name }) || 'No model available', 'error');
    return;
  }
  
  showToast(window.Lang?.get('infoProviderTesting', { name: provider.name, modelId: testModelId }) || 'Testing...', 'info');
  const result = await apiManager.testConnection(providerId, testModelId);
  showToast(result.message, result.success ? 'success' : 'error');
}


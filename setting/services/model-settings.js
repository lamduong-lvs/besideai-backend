// setting/services/model-settings.js - Model settings service

import { apiManager } from '../../utils/api.js';
import { showToast } from '../modules/core/toast.js';
import { populateSubSidebar } from '../modules/navigation/sub-nav.js';
import { showPage } from '../modules/core/page-manager.js';

// Build allModels from providers with tier filtering
async function buildAllModels(providers) {
  const allModels = [];
  
  // ✅ Get current tier to filter models
  let subscriptionManager = null;
  let currentTier = 'free';
  try {
    const { subscriptionManager: sm } = await import('../../modules/subscription/subscription-manager.js');
    subscriptionManager = sm;
    await subscriptionManager.ensureInitialized();
    currentTier = await subscriptionManager.getTier();
  } catch (error) {
    console.warn('[ModelSettings] Failed to load subscription manager:', error);
  }
  
  // ✅ Import model checking function
  let isModelAllowedForTier = null;
  try {
    const { isModelAllowedForTier: checkFn } = await import('../../modules/subscription/subscription-config.js');
    isModelAllowedForTier = checkFn;
  } catch (error) {
    console.warn('[ModelSettings] Failed to load subscription config:', error);
  }
  
  providers.forEach(provider => {
    if (provider.models && provider.models.length > 0) {
      provider.models.forEach(model => {
        const fullModelId = `${provider.providerId}/${model.id}`;
        
        // ✅ Filter models based on tier
        if (isModelAllowedForTier && currentTier !== 'byok') {
          const isAllowed = isModelAllowedForTier(currentTier, fullModelId);
          if (!isAllowed) {
            // Skip this model - not available for current tier
            return;
          }
        }
        
        allModels.push({
          ...model,
          providerName: provider.name,
          providerId: provider.providerId,
          fullModelId: fullModelId
        });
      });
    }
  });
  
  return allModels;
}

export async function loadModelSettings() {
  try {
    console.log("[Setting] Loading model settings...");
    await apiManager.loadFromStorage();
    const providers = apiManager.getAllProviders();
    console.log("[Setting] Providers loaded:", providers.length);
    
    const allModels = await buildAllModels(providers);
    console.log("[Setting] All models built (filtered by tier):", allModels.length);
    
    const data = await chrome.storage.local.get(['aiProvider', 'raceSettings']);
    console.log("[Setting] Loaded model data:", data);
    
    // Populate sub-sidebar
    populateSubSidebar(providers);
    console.log("[Setting] Sub-sidebar populated");
    
    // Create provider config pages
    populateProviderConfigPages(providers);
    console.log("[Setting] Provider config pages created");
    
    // Populate model selection settings
    await populateModelSelectionSettings(allModels, data.aiProvider, data.raceSettings);
    console.log("[Setting] Model selection settings populated");
    
    // Only re-activate page if we're currently on model-settings section
    const mainNavActive = document.querySelector('.menu-item-main.active[data-nav-group="model-settings"]');
    if (mainNavActive) {
      const currentSubNavPage = 'model-settings-main';
      const activeSubLink = document.querySelector(`.menu-item-sub[data-page-id="${currentSubNavPage}"]`);
      if (activeSubLink) {
        activeSubLink.classList.add('active');
        showPage(currentSubNavPage);
      } else {
        // Wait a bit for DOM to update, then try again
        setTimeout(() => {
          const firstSubLink = document.querySelector('.menu-item-sub');
          if (firstSubLink) {
            firstSubLink.click();
          } else {
            showPage('model-settings-main');
          }
        }, 100);
      }
    }
    
    // Show/hide race test section
    const raceToggle = document.getElementById('enableRacingMode');
    const testSection = document.getElementById('race-test-section');
    if (raceToggle && testSection) {
      if (raceToggle.checked) {
        testSection.classList.remove('d-none');
      } else {
        testSection.classList.add('d-none');
      }
    }
  } catch (error) {
    console.error('[ModelSettings] Failed to load:', error);
    showToast(window.Lang?.get('errorLoadSettings') || 'Failed to load settings', 'error');
  }
}

export async function saveModelSelectionSettings() {
  const enableToggle = document.getElementById('enableRacingMode');
  const enabled = enableToggle?.checked ?? false;
  const selectedModels = Array.from(
    document.querySelectorAll('#racingModelChecklist input[name="racingModel"]:checked')
  ).map(cb => cb.value);
  const defaultModelSelect = document.getElementById('defaultModelSelect');
  const defaultModel = defaultModelSelect?.value || null;
  const errorEl = document.getElementById('racingModelError');
  
  // Validate race models
  if (enabled && (selectedModels.length < 2 || selectedModels.length > 4)) {
    if (errorEl) {
      errorEl.textContent = window.Lang?.get('errorRaceModelCount') || 'Please select 2-4 models';
      errorEl.classList.remove('d-none');
    }
    showToast(window.Lang?.get('errorRaceModelCountToast') || 'Please select 2-4 models', 'error');
    return;
  }
  
  if (errorEl) errorEl.classList.add('d-none');
  
  try {
    await chrome.storage.local.set({
      aiProvider: defaultModel,
      raceSettings: { enabled, models: selectedModels }
    });
    // Do not show toast for auto-save
    // showToast(window.Lang?.get('successSaveResponseSettings') || 'Settings saved', 'success');
    
    // Show/hide race test section
    const testSection = document.getElementById('race-test-section');
    if (testSection) {
      if (enabled) {
        testSection.classList.remove('d-none');
      } else {
        testSection.classList.add('d-none');
      }
    }
  } catch (error) {
    console.error('[ModelSettings] Failed to save:', error);
    showToast(window.Lang?.get('errorSaveResponseSettings') || 'Failed to save settings', 'error');
  }
}

export async function refreshModelSelectionSettings() {
  try {
    const providers = apiManager.getAllProviders();
    const allModels = await buildAllModels(providers);
    const data = await chrome.storage.local.get(['aiProvider', 'raceSettings']);
    populateModelSelectionSettings(allModels, data.aiProvider, data.raceSettings);
  } catch (error) {
    console.error('[ModelSettings] Failed to refresh:', error);
  }
}

export async function syncModelSelectionSettings() {
  try {
    const enableToggle = document.getElementById('enableRacingMode');
    const defaultModelSelect = document.getElementById('defaultModelSelect');
    const selectedModels = Array.from(
      document.querySelectorAll('#racingModelChecklist input[name="racingModel"]:checked')
    ).map(cb => cb.value);
    
    const currentSettings = {
      aiProvider: defaultModelSelect?.value || null,
      raceSettings: {
        enabled: enableToggle?.checked ?? false,
        models: selectedModels
      }
    };
    
    if (currentSettings.aiProvider || currentSettings.raceSettings.models.length > 0) {
      await chrome.storage.local.set(currentSettings);
    }
  } catch (error) {
    console.error('[ModelSettings] Failed to sync:', error);
  }
}

// Provider config functions
export function populateProviderConfigPages(providers) {
  const contentHost = document.getElementById('content-host');
  const template = document.getElementById('provider-config-template');
  
  if (!contentHost) {
    console.error('[ModelSettings] content-host not found');
    return;
  }
  
  if (!template) {
    console.error('[ModelSettings] provider-config-template not found');
    return;
  }
  
  if (!window.Lang) {
    console.error('[ModelSettings] window.Lang not available');
    return;
  }
  
  // Remove existing provider pages
  contentHost.querySelectorAll('.setting-page[data-page-id^="provider-"]').forEach(p => p.remove());
  console.log('[ModelSettings] Removed existing provider pages');
  
  if (!providers || providers.length === 0) {
    console.warn('[ModelSettings] No providers to create pages for');
    return;
  }
  
  providers.forEach(provider => {
    try {
      const page = document.createElement('div');
      page.className = 'setting-page';
      page.dataset.pageId = `provider-${provider.providerId}`;
      
      const content = template.content.cloneNode(true);
      
      const titleEl = content.querySelector('.provider-title');
      const descEl = content.querySelector('.provider-description');
      
      if (titleEl) {
        titleEl.textContent = window.Lang.get('providerConfigTitleDyn', { name: provider.name }) || `Cấu hình ${provider.name}`;
      }
      if (descEl) {
        descEl.textContent = window.Lang.get('providerConfigDescDyn', { name: provider.name }) || `Nhập thông tin xác thực cho ${provider.name}`;
      }
      
      const apiKeyInput = content.querySelector('.provider-apiKey');
      const baseURLInput = content.querySelector('.provider-baseURL');
      
      if (apiKeyInput) apiKeyInput.value = provider.apiKey || '';
      if (baseURLInput) baseURLInput.value = provider.baseURL || apiManager.getDefaultBaseURL(provider.providerId) || '';
      
      const specialField = content.querySelector(`.special-field[data-provider-type="${provider.type}"]`);
      if (specialField) {
        specialField.classList.remove('d-none');
        if (provider.type === 'anthropic') {
          const versionInput = specialField.querySelector('.provider-anthropicVersion');
          if (versionInput) {
            versionInput.value = provider.anthropicVersion || '2023-06-01';
          }
        }
      }
      
      content.querySelectorAll('[name="saveProviderCredentials"], [name="addModel"], [name="testApiConnection"]')
        .forEach(btn => {
          btn.dataset.provider = provider.providerId;
        });
      
      page.appendChild(content);
      updateModelList(page, provider);
      contentHost.appendChild(page);
      
      console.log(`[ModelSettings] Created page for provider: ${provider.providerId}`);
    } catch (error) {
      console.error(`[ModelSettings] Error creating page for provider ${provider.providerId}:`, error);
    }
  });
  
  console.log(`[ModelSettings] Created ${providers.length} provider config pages`);
}

export function updateModelList(pageElement, provider) {
  const listElement = pageElement.querySelector('.model-list');
  const placeholder = pageElement.querySelector('.model-list-placeholder');
  const template = document.getElementById('model-list-item-template');
  if (!listElement || !placeholder || !template) return;
  
  listElement.innerHTML = '';
  
  if (!provider.models || provider.models.length === 0) {
    const placeholderClone = placeholder.cloneNode(true);
    placeholderClone.classList.remove('d-none');
    listElement.appendChild(placeholderClone);
    return;
  }
  
  placeholder.classList.add('d-none');
  
  provider.models.forEach(model => {
    const item = template.content.cloneNode(true);
    item.querySelector('.model-name').textContent = model.displayName;
    item.querySelector('.model-id').textContent = model.id;
    
    const deleteBtn = item.querySelector('.delete-model-btn');
    deleteBtn.dataset.provider = provider.providerId;
    deleteBtn.dataset.modelId = model.id;
    
    listElement.appendChild(item);
  });
}

async function populateModelSelectionSettings(allModels, savedDefaultModel, savedRaceSettings) {
  const defaultSelect = document.getElementById('defaultModelSelect');
  const raceChecklist = document.getElementById('racingModelChecklist');
  const raceChecklistPlaceholder = raceChecklist?.querySelector('.checkbox-item-placeholder');
  const enableToggle = document.getElementById('enableRacingMode');
  
  if (!defaultSelect || !raceChecklist || !enableToggle || !window.Lang) return;
  
  defaultSelect.innerHTML = '';
  raceChecklist.querySelectorAll('.checkbox-item').forEach(item => item.remove());
  
  if (allModels.length === 0) {
    defaultSelect.innerHTML = `<option value="">${window.Lang.get('errorNoModelsConfigured')}</option>`;
    defaultSelect.disabled = true;
    if (raceChecklistPlaceholder) raceChecklistPlaceholder.classList.remove('d-none');
    enableToggle.checked = false;
    enableToggle.disabled = true;
    return;
  }
  
  if (raceChecklistPlaceholder) raceChecklistPlaceholder.classList.add('d-none');
  defaultSelect.disabled = false;
  enableToggle.disabled = allModels.length < 2;
  
  // ✅ Get current tier to show upgrade prompts
  let subscriptionManager = null;
  let currentTier = 'free';
  try {
    const { subscriptionManager: sm } = await import('../../modules/subscription/subscription-manager.js');
    subscriptionManager = sm;
    await subscriptionManager.ensureInitialized();
    currentTier = await subscriptionManager.getTier();
  } catch (error) {
    console.warn('[ModelSettings] Failed to load subscription manager:', error);
  }
  
  allModels.forEach(model => {
    const option = new Option(`${model.displayName} (${model.providerName})`, model.fullModelId);
    defaultSelect.add(option);
    
    const div = document.createElement('div');
    div.className = 'checkbox-item';
    div.innerHTML = `
      <input type="checkbox" id="race-${model.fullModelId.replace(/[^a-zA-Z0-9]/g, '-')}" name="racingModel" value="${model.fullModelId}">
      <label for="race-${model.fullModelId.replace(/[^a-zA-Z0-9]/g, '-')}">${model.displayName} (${model.providerName})</label>
    `;
    
    // ✅ Add click handler to show upgrade prompt if model not available
    const checkbox = div.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', async (e) => {
      if (e.target.checked && currentTier !== 'byok') {
        try {
          const { isModelAllowedForTier, getRequiredTierForModel } = await import('../../modules/subscription/subscription-config.js');
          const isAllowed = isModelAllowedForTier(currentTier, model.fullModelId);
          if (!isAllowed) {
            e.target.checked = false;
            const requiredTier = getRequiredTierForModel(model.fullModelId);
            const { upgradePrompts } = await import('../../modules/features/upgrade-prompts.js');
            await upgradePrompts.show('model_not_available', {
              modelId: model.fullModelId,
              requiredTier: requiredTier
            });
          }
        } catch (error) {
          console.error('[ModelSettings] Error checking model availability:', error);
        }
      }
    });
    
    raceChecklist.appendChild(div);
  });
  
  if (savedDefaultModel && defaultSelect.querySelector(`option[value="${savedDefaultModel}"]`)) {
    defaultSelect.value = savedDefaultModel;
  } else if (allModels.length > 0) {
    defaultSelect.value = allModels[0].fullModelId;
  }
  
  if (savedRaceSettings) {
    enableToggle.checked = savedRaceSettings.enabled && allModels.length >= 2;
    savedRaceSettings.models.forEach(modelId => {
      const checkbox = raceChecklist.querySelector(`input[value="${modelId}"]`);
      if (checkbox) checkbox.checked = true;
    });
  } else {
    enableToggle.checked = false;
  }
  
  const testSection = document.getElementById('race-test-section');
  if (testSection) {
    if (enableToggle.checked) {
      testSection.classList.remove('d-none');
    } else {
      testSection.classList.add('d-none');
    }
  }
}



// setting/services/model-settings.js - Model settings service

import { modelsService } from '../../modules/subscription/models-service.js';
import { modelPreferenceService } from '../../modules/subscription/model-preference-service.js';
import { showToast } from '../modules/core/toast.js';
import { populateSubSidebar } from '../modules/navigation/sub-nav.js';
import { showPage } from '../modules/core/page-manager.js';
import { apiManager } from '../../utils/api.js';

// Get models from Backend
async function buildAllModels() {
  try {
    await modelsService.initialize();
    const models = await modelsService.getModels();
    
    // Transform Backend models to match expected format
    return models.map(model => ({
      id: model.id,
      displayName: model.name,
      providerName: model.providerName,
      providerId: model.provider,
      fullModelId: `${model.provider}/${model.id}`,
      category: model.category || 'llm',
      tier: model.tier,
      description: model.description,
      maxTokens: model.maxTokens,
      supportsStreaming: model.supportsStreaming
    }));
  } catch (error) {
    console.error('[ModelSettings] Failed to load models from Backend:', error);
    return [];
  }
}

export async function loadModelSettings() {
  try {
    console.log("[Setting] Loading model settings...");
    
    // Get models from Backend
    const allModels = await buildAllModels();
    console.log("[Setting] Models loaded from Backend:", allModels.length);
    
    // Get saved preferences
    const savedDefaultModel = await modelPreferenceService.getPreferredModel();
    console.log("[Setting] Saved default model:", savedDefaultModel);
    
    // Populate sub-sidebar (still need providers for API key config)
    await apiManager.loadFromStorage();
    const providers = apiManager.getAllProviders();
    populateSubSidebar(providers);
    
    // Create provider config pages
    populateProviderConfigPages(providers);
    
    // Populate model selection UI
    await populateModelSelectionSettings(allModels, savedDefaultModel);
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
    
    return {
      models: allModels,
      defaultModel: savedDefaultModel
    };
  } catch (error) {
    console.error('[ModelSettings] Error loading model settings:', error);
    showToast('Failed to load models', 'error');
    return {
      models: [],
      defaultModel: null
    };
  }
}

export async function saveModelSelectionSettings() {
  const defaultModelSelect = document.getElementById('defaultModelSelect');
  const defaultModel = defaultModelSelect?.value || null;
  
  if (!defaultModel) {
    showToast('Please select a model', 'error');
    return;
  }
  
  try {
    await modelPreferenceService.setPreferredModel(defaultModel);
    await chrome.storage.local.set({
      selectedModel: defaultModel,
      aiProvider: defaultModel // Backward compatibility
    });
    showToast('Model preference saved', 'success');
  } catch (error) {
    console.error('[ModelSettings] Failed to save:', error);
    showToast('Failed to save model preference', 'error');
  }
}

export async function refreshModelSelectionSettings() {
  try {
    const allModels = await buildAllModels();
    const savedDefaultModel = await modelPreferenceService.getPreferredModel();
    await populateModelSelectionSettings(allModels, savedDefaultModel);
  } catch (error) {
    console.error('[ModelSettings] Failed to refresh:', error);
  }
}

export async function syncModelSelectionSettings() {
  try {
    const defaultModelSelect = document.getElementById('defaultModelSelect');
    const defaultModel = defaultModelSelect?.value || null;
    
    if (defaultModel) {
      await modelPreferenceService.setPreferredModel(defaultModel);
      await chrome.storage.local.set({
        selectedModel: defaultModel,
        aiProvider: defaultModel
      });
    }
  } catch (error) {
    console.error('[ModelSettings] Failed to sync:', error);
  }
}

// Provider config functions
export function populateProviderConfigPages(providers) {
  const contentHost = document.getElementById('content-host');
  const template = document.getElementById('provider-config-template');
  
  if (!contentHost || !template || !window.Lang) {
    return;
  }
  
  // Remove existing provider pages
  contentHost.querySelectorAll('.setting-page[data-page-id^="provider-"]').forEach(p => p.remove());
  
  if (!providers || providers.length === 0) {
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
    } catch (error) {
      console.error(`[ModelSettings] Error creating page for provider ${provider.providerId}:`, error);
    }
  });
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

async function populateModelSelectionSettings(allModels, savedDefaultModel) {
  const defaultSelect = document.getElementById('defaultModelSelect');
  
  if (!defaultSelect || !window.Lang) return;
  
  defaultSelect.innerHTML = '';
  
  if (allModels.length === 0) {
    defaultSelect.innerHTML = `<option value="">${window.Lang.get('errorNoModelsConfigured')}</option>`;
    defaultSelect.disabled = true;
    return;
  }
  
  defaultSelect.disabled = false;
  
  // Group models by category
  const modelsByCategory = {};
  allModels.forEach(model => {
    const category = model.category || 'llm';
    if (!modelsByCategory[category]) {
      modelsByCategory[category] = [];
    }
    modelsByCategory[category].push(model);
  });
  
  // Category names
  const categoryNames = {
    'llm': 'LLM (Text Generation)',
    'tts': 'TTS (Text-to-Speech)',
    'image': 'Image Generation',
    'video': 'Video Generation',
    'coding': 'Code Generation',
    'chat': 'Chat'
  };
  
  // Add category optgroups
  const categoryOrder = ['llm', 'chat', 'coding', 'tts', 'image', 'video'];
  categoryOrder.forEach(category => {
    const models = modelsByCategory[category];
    if (!models || models.length === 0) return;
    
    const optgroup = document.createElement('optgroup');
    optgroup.label = categoryNames[category] || category;
    
    models.forEach(model => {
      const option = new Option(`${model.displayName} (${model.providerName})`, model.fullModelId);
      optgroup.appendChild(option);
    });
    
    defaultSelect.appendChild(optgroup);
  });
  
  // Set selected value
  if (savedDefaultModel && defaultSelect.querySelector(`option[value="${savedDefaultModel}"]`)) {
    defaultSelect.value = savedDefaultModel;
  } else if (allModels.length > 0) {
    defaultSelect.value = allModels[0].fullModelId;
  }
  
  // Save handler
  defaultSelect.addEventListener('change', async (e) => {
    const modelId = e.target.value;
    if (modelId) {
      try {
        await modelPreferenceService.setPreferredModel(modelId);
        showToast('Model preference saved', 'success');
      } catch (error) {
        console.error('[ModelSettings] Error saving model preference:', error);
        showToast('Failed to save model preference', 'error');
      }
    }
  });
}

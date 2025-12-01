// settings-controller.js
// Module quản lý cài đặt API providers, thay thế các hàm trùng lặp

// Import utils from panel-utils wrapper for consistent imports
import { apiManager, themeManager } from '../utils/panel-utils.js';
import { SlideInPanel } from '../components/SlideInPanel.js';

// Cấu hình các provider và các field tương ứng
const PROVIDER_CONFIGS = {
  cerebras: {
    fields: ['apiKey', 'baseUrl', 'model', 'temperature', 'maxTokens'],
    displayName: 'Cerebras',
    successKey: 'successCerebrasSaved'
  },
  dify: {
    fields: ['apiKey', 'baseUrl'],
    displayName: 'Dify',
    successKey: 'successDifySaved',
    customTest: true
  },
  openai: {
    fields: ['apiKey', 'baseUrl', 'model'],
    displayName: 'OpenAI',
    successKey: 'successOpenAISaved',
    needsInit: true
  },
  anthropic: {
    fields: ['apiKey', 'baseUrl', 'model'],
    displayName: 'Anthropic',
    successKey: 'successAnthropicSaved',
    needsInit: true
  },
  groq: {
    fields: ['apiKey', 'baseUrl', 'model'],
    displayName: 'Groq',
    successKey: 'successGroqSaved',
    needsInit: true
  },
  custom: {
    fields: ['providerName', 'apiKey', 'baseUrl', 'model'],
    displayName: 'Custom',
    successKey: 'successCustomProviderAdded',
    isCustom: true
  }
};

// Helper để lấy giá trị từ input
function getFieldValue(providerId, fieldName) {
  const elementId = fieldName === 'providerName' 
    ? 'customProviderName'
    : `${providerId}${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`;
  const element = document.getElementById(elementId);
  return element ? element.value.trim() : '';
}

// Helper để kiểm tra các field bắt buộc
function validateRequiredFields(providerId, config) {
  const requiredFields = config.fields;
  for (const field of requiredFields) {
    const value = getFieldValue(providerId, field);
    if (!value) {
      return false;
    }
  }
  return true;
}

// Hàm lưu cấu hình chung
export async function saveConfig(providerId, showError, showSuccess, Lang) {
  const config = PROVIDER_CONFIGS[providerId];
  if (!config) {
    showError(`Provider ${providerId} không được hỗ trợ`);
    return;
  }

  // Validate
  if (!validateRequiredFields(providerId, config)) {
    showError(Lang.get("errorAllFieldsRequired"));
    return;
  }

  try {
    // Lấy các giá trị
    const apiKey = getFieldValue(providerId, 'apiKey');
    const baseUrl = getFieldValue(providerId, 'baseUrl');
    const model = getFieldValue(providerId, 'model');
    
    // Xử lý đặc biệt cho từng provider
    if (providerId === 'cerebras') {
      const temperature = parseFloat(getFieldValue(providerId, 'temperature'));
      const maxTokens = parseInt(getFieldValue(providerId, 'maxTokens'));
      
      apiManager.updateConfig('cerebras', {
        apiKey: apiKey,
        baseURL: baseUrl,
        currentModel: model,
        temperature: temperature,
        maxTokens: maxTokens
      });
      apiManager.setActiveProvider('cerebras');
    } else if (providerId === 'dify') {
      apiManager.updateConfig('dify', {
        apiKey: apiKey,
        baseURL: baseUrl
      });
      apiManager.setActiveProvider('dify');
    } else if (providerId === 'custom') {
      const name = getFieldValue(providerId, 'providerName');
      const id = apiManager.addCustomConfig({
        name: name,
        apiKey: apiKey,
        baseURL: baseUrl,
        models: [{ id: model, displayName: model }],
        currentModel: model
      });
      apiManager.setActiveProvider(id);
      
      // Clear form
      document.getElementById('customProviderName').value = '';
      document.getElementById('customApiKey').value = '';
      document.getElementById('customBaseUrl').value = '';
      document.getElementById('customModel').value = '';
      
      showSuccess(Lang.get(config.successKey, { name: name }));
      return;
    } else {
      // OpenAI, Anthropic, Groq
      if (config.needsInit && !apiManager.configs[providerId]) {
        apiManager.configs[providerId] = { 
          type: 'custom', 
          name: config.displayName 
        };
      }
      
      apiManager.updateConfig(providerId, {
        apiKey: apiKey,
        baseURL: baseUrl,
        currentModel: model
      });
      apiManager.setActiveProvider(providerId);
    }
    
    await apiManager.saveToStorage();
    showSuccess(Lang.get(config.successKey));
  } catch (error) {
    console.error(`[SettingsController] Error saving ${providerId} config:`, error);
    showError(`Lỗi khi lưu cấu hình: ${error.message}`);
  }
}

// Hàm test kết nối chung
export async function testConnection(providerId, showError, showInfo, showSuccess, Lang, apiManager) {
  const config = PROVIDER_CONFIGS[providerId];
  if (!config) {
    showError(`Provider ${providerId} không được hỗ trợ`);
    return;
  }

  // Validate
  if (!validateRequiredFields(providerId, config)) {
    showError(Lang.get("errorAllFieldsRequired"));
    return;
  }

  try {
    const apiKey = getFieldValue(providerId, 'apiKey');
    const baseUrl = getFieldValue(providerId, 'baseUrl');
    const model = getFieldValue(providerId, 'model');
    
    showInfo(Lang.get("infoTestingConnection"));
    
    // Xử lý đặc biệt cho Dify
    if (providerId === 'dify' && config.customTest) {
      const result = await testDifyAPI(baseUrl, apiKey, Lang);
      if (result.success) {
        showSuccess(result.message);
      } else {
        showError(result.message);
      }
      return;
    }
    
    // Xử lý đặc biệt cho Anthropic (không có test thực sự)
    if (providerId === 'anthropic') {
      showSuccess(Lang.get("infoAnthropicTest"));
      return;
    }
    
    // Test cho các provider khác
    const result = await apiManager.testConnection({
      name: config.displayName,
      apiKey: apiKey,
      baseURL: baseUrl,
      model: model
    });
    
    if (result.success) {
      showSuccess(result.message);
    } else {
      showError(result.message);
    }
  } catch (error) {
    console.error(`[SettingsController] Error testing ${providerId} connection:`, error);
    showError(`Lỗi khi test kết nối: ${error.message}`);
  }
}

// Helper function cho Dify API test
async function testDifyAPI(baseUrl, apiKey, Lang) {
  try {
    const response = await fetch(`${baseUrl}/parameters`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (response.ok) {
      return { success: true, message: Lang.get("successConnection") };
    } else {
      return { success: false, message: `HTTP ${response.status}: ${response.statusText}` };
    }
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// ========================================
// SETTINGS PANEL INITIALIZATION
// ========================================

async function loadSettings() {
  const data = await chrome.storage.local.get([
    'theme',
    'showFloatingIcon',
    'apiConfigs',
    'activeProvider'
  ]);

  if (data.theme) {
    const darkModeToggle = document.getElementById('darkModeTogglePanel');
    if (darkModeToggle) {
      darkModeToggle.checked = (data.theme === 'dark');
    }
  }

  const showFloatingIconCheckbox = document.getElementById('showFloatingIcon');
  if (showFloatingIconCheckbox) {
    showFloatingIconCheckbox.checked = data.showFloatingIcon !== false;
  }
}

async function loadSettingsData() {
  const cerebrasConfig = apiManager.configs.cerebras;
  if (cerebrasConfig) {
    document.getElementById('cerebrasApiKey').value = cerebrasConfig.apiKey || '';
    document.getElementById('cerebrasBaseUrl').value = cerebrasConfig.baseURL || 'https://api.cerebras.ai/v1/chat/completions';
    document.getElementById('cerebrasModel').value = cerebrasConfig.currentModel || 'llama-4-scout-17b-16e-instruct';
    document.getElementById('cerebrasTemperature').value = cerebrasConfig.temperature || 0.7;
    document.getElementById('cerebrasMaxTokens').value = cerebrasConfig.maxTokens || 2000;
  }
  
  const difyConfig = apiManager.configs.dify;
  if (difyConfig) {
    document.getElementById('difyApiKey').value = difyConfig.apiKey || '';
    document.getElementById('difyBaseUrl').value = difyConfig.baseURL || '';
  }
  
  if (apiManager.configs.openai) {
    document.getElementById('openaiApiKey').value = apiManager.configs.openai.apiKey || '';
    document.getElementById('openaiModel').value = apiManager.configs.openai.currentModel || 'gpt-4o';
  }
  
  if (apiManager.configs.anthropic) {
    document.getElementById('anthropicApiKey').value = apiManager.configs.anthropic.apiKey || '';
    document.getElementById('anthropicModel').value = apiManager.configs.anthropic.currentModel || 'claude-3-5-sonnet-20241022';
  }
  
  if (apiManager.configs.groq) {
    document.getElementById('groqApiKey').value = apiManager.configs.groq.apiKey || '';
    document.getElementById('groqModel').value = apiManager.configs.groq.currentModel || 'llama-3.3-70b-versatile';
  }
}

function handleSettingsMenuSwitch(e) {
  const targetPanel = e.currentTarget.dataset.panel;
  
  document.querySelectorAll('.settings-menu-item').forEach(btn => btn.classList.remove('active'));
  e.currentTarget.classList.add('active');
  
  document.querySelectorAll('.settings-panel-content').forEach(content => content.classList.remove('active'));
  document.querySelector(`.settings-panel-content[data-panel="${targetPanel}"]`)?.classList.add('active');
}

async function handleThemeChange(e, Lang, showError, showSuccess) {
  const theme = e.target.checked ? 'dark' : 'light';
  
  try {
    await themeManager.setTheme(theme);
    const themeName = theme === 'light' ? Lang.get("themeLight") : Lang.get("themeDark");
    showSuccess(Lang.get("successThemeChanged", { theme: themeName }));
  } catch (error) {
    console.error('[SettingsController] Error setting theme:', error);
    showError(Lang.get("errorThemeChange", { error: error.message }));
  }
}

async function handleFloatingIconToggle(e, Lang, showSuccess, showInfo) {
  const enabled = e.target.checked;
  await chrome.storage.local.set({ showFloatingIcon: enabled });
  showSuccess(enabled ? Lang.get("successFloatingIconOn") : Lang.get("successFloatingIconOff"));
  showInfo(Lang.get("infoReloadRequired"));
}

let settingsPanelInstance = null;

function createSettingsPanelHTML() {
  // Get the existing settings panel HTML from DOM or create it
  const existingPanel = document.getElementById('settingsPanel');
  if (existingPanel) {
    // Clone the existing panel HTML
    return existingPanel.outerHTML;
  }
  
  // If not found, return template (shouldn't happen, but fallback)
  return `
    <div class="settings-overlay"></div>
    <div class="settings-content">
      <div class="settings-header">
        <h2 class="settings-title" data-i18n="settingsTitle">Cài đặt</h2>
        <button class="settings-close" id="settingsClose">
          <img src="../../icons/svg/icon/Essentional, UI/Close Circle.svg" alt="Close" class="icon">
        </button>
      </div>
      <div class="settings-main">
        <div class="settings-sidebar">
          <!-- Menu items will be added by initializeSettingsPanel -->
        </div>
        <div class="settings-body">
          <!-- Content panels will be added by initializeSettingsPanel -->
        </div>
      </div>
    </div>
  `;
}

function createSettingsPanelInstance(Lang) {
  if (!settingsPanelInstance) {
    // Get existing panel HTML from DOM
    const existingPanel = document.getElementById('settingsPanel');
    let panelHTML = '';
    
    if (existingPanel) {
      // Clone innerHTML (content without the outer div wrapper)
      panelHTML = existingPanel.innerHTML;
      // Remove the old panel from DOM (it will be recreated by SlideInPanel)
      existingPanel.remove();
    }
    
    settingsPanelInstance = new SlideInPanel({
      id: 'settingsPanel',
      wrapperClass: 'settings-panel',
      title: 'settingsTitle',
      overlayClass: 'settings-overlay',
      contentClass: 'settings-content',
      headerClass: 'settings-header',
      titleClass: 'settings-title',
      closeBtnId: 'settingsClose',
      bodyId: 'settingsPanelBody',
      onClose: () => {
        settingsPanelInstance = null;
      },
      onOpen: () => {
        loadSettingsData();
      }
    });
    
    // Create panel with custom HTML (preserve the existing structure)
    if (panelHTML) {
      settingsPanelInstance.create(Lang, `
        <div class="settings-overlay"></div>
        ${panelHTML}
      `);
    } else {
      // Fallback: create default structure
      settingsPanelInstance.create(Lang);
    }
  }
  return settingsPanelInstance;
}

function openSettings(Lang, showError, showSuccess, showInfo, apiManager) {
  const panel = createSettingsPanelInstance(Lang);
  panel.open(Lang);
  loadSettingsData();
  // Re-attach event listeners after panel is created
  attachSettingsEventListeners(Lang, showError, showSuccess, showInfo, apiManager);
}

function closeSettings() {
  if (settingsPanelInstance) {
    settingsPanelInstance.close();
  }
}

function attachSettingsEventListeners(Lang, showError, showSuccess, showInfo, apiManager) {
  // Settings menu items
  document.querySelectorAll('.settings-menu-item').forEach(btn => {
    btn.addEventListener('click', handleSettingsMenuSwitch);
  });

  // Theme toggle
  document.getElementById('darkModeTogglePanel')?.addEventListener('change', (e) => {
    handleThemeChange(e, Lang, showError, showSuccess);
  });

  // Floating icon toggle
  document.getElementById('showFloatingIcon')?.addEventListener('change', (e) => {
    handleFloatingIconToggle(e, Lang, showSuccess, showInfo);
  });

  // Save configs - ALL PROVIDERS
  document.getElementById('saveCerebrasConfig')?.addEventListener('click', () => saveConfig('cerebras', showError, showSuccess, Lang));
  document.getElementById('saveDifyConfig')?.addEventListener('click', () => saveConfig('dify', showError, showSuccess, Lang));
  document.getElementById('saveOpenaiConfig')?.addEventListener('click', () => saveConfig('openai', showError, showSuccess, Lang));
  document.getElementById('saveAnthropicConfig')?.addEventListener('click', () => saveConfig('anthropic', showError, showSuccess, Lang));
  document.getElementById('saveGroqConfig')?.addEventListener('click', () => saveConfig('groq', showError, showSuccess, Lang));
  document.getElementById('saveCustomConfig')?.addEventListener('click', () => saveConfig('custom', showError, showSuccess, Lang));

  // Test connections - ALL PROVIDERS
  document.getElementById('testCerebrasConnection')?.addEventListener('click', () => testConnection('cerebras', showError, showInfo, showSuccess, Lang, apiManager));
  document.getElementById('testDifyConnection')?.addEventListener('click', () => testConnection('dify', showError, showInfo, showSuccess, Lang, apiManager));
  document.getElementById('testOpenaiConnection')?.addEventListener('click', () => testConnection('openai', showError, showInfo, showSuccess, Lang, apiManager));
  document.getElementById('testAnthropicConnection')?.addEventListener('click', () => testConnection('anthropic', showError, showInfo, showSuccess, Lang, apiManager));
  document.getElementById('testGroqConnection')?.addEventListener('click', () => testConnection('groq', showError, showInfo, showSuccess, Lang, apiManager));
  document.getElementById('testCustomConnection')?.addEventListener('click', () => testConnection('custom', showError, showInfo, showSuccess, Lang, apiManager));
}

export function initializeSettingsPanel(Lang, showError, showSuccess, showInfo, apiManager) {
  // Settings panel will be created dynamically using SlideInPanel when openSettings() is called
  // Attach event listeners to existing elements (if panel HTML is already in DOM)
  attachSettingsEventListeners(Lang, showError, showSuccess, showInfo, apiManager);
  
  // Initialize Models Selector (backend-managed models)
  try {
    import('../components/ModelsSelector.js').then(({ ModelsSelector }) => {
      const modelsSelector = new ModelsSelector('modelsSelectorContainer');
      // Initialize when settings panel is opened
      const originalOpenSettings = window.openSettings;
      if (originalOpenSettings) {
        window.openSettings = async function(...args) {
          await originalOpenSettings.apply(this, args);
          // Wait a bit for DOM to be ready
          setTimeout(() => {
            modelsSelector.initialize().catch(err => {
              console.error('[Settings] Failed to initialize ModelsSelector:', err);
            });
          }, 100);
        };
      }
    }).catch(err => {
      console.warn('[Settings] ModelsSelector not available:', err);
    });
  } catch (error) {
    console.warn('[Settings] Could not load ModelsSelector:', error);
  }
}

export { openSettings, closeSettings, loadSettings, loadSettingsData };

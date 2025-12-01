// modules/panel/controllers/recorder-controller.js
// Module quản lý recorder panel

const RECORDER_SETTINGS_KEY = 'recorderSettings';
const DEFAULT_RECORDER_SETTINGS = {
  mic: false,
  systemAudio: false,
  camera: false,
  clickEffect: false,
  draw: false,
  showControls: true,
  cameraShape: 'circle',
  source: 'desktop',
  quality: '1080p',
  frameRate: 60,
  format: 'webm'
};

let currentRecordSettings = null;

async function getRecordSettings() {
  try {
    const data = await chrome.storage.local.get(RECORDER_SETTINGS_KEY);
    return { ...DEFAULT_RECORDER_SETTINGS, ...(data[RECORDER_SETTINGS_KEY] || {}) };
  } catch (error) {
    console.error('[Recorder] Error getting recorder settings:', error);
    return DEFAULT_RECORDER_SETTINGS;
  }
}

async function saveRecordSettings(settings) {
  try {
    await chrome.storage.local.set({ [RECORDER_SETTINGS_KEY]: settings });
  } catch (error) {
    console.error('[Recorder] Error saving recorder settings:', error);
  }
}

function initializeRecordPanel() {
  if (!currentRecordSettings) {
    getRecordSettings().then(settings => {
      currentRecordSettings = settings;
      initializeRecordUI();
      setupRecordEventListeners();
    });
  } else {
    initializeRecordUI();
    setupRecordEventListeners();
  }
}

function initializeRecordUI() {
  if (!currentRecordSettings) return;
  
  // Update source buttons
  document.querySelectorAll('.source-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.source === currentRecordSettings.source);
  });
  
  // Update setting buttons
  document.getElementById('micBtn')?.classList.toggle('active', currentRecordSettings.mic);
  // systemAudioBtn logic might need review based on source, keeping simple for now
  document.getElementById('systemAudioBtn')?.classList.toggle('active', currentRecordSettings.systemAudio); 
  document.getElementById('cameraBtn')?.classList.toggle('active', currentRecordSettings.camera);
  document.getElementById('clickEffectBtn')?.classList.toggle('active', currentRecordSettings.clickEffect);
  document.getElementById('annotationBtn')?.classList.toggle('active', currentRecordSettings.draw);
  
  const controlBarToggle = document.getElementById('controlBarToggle');
  if (controlBarToggle) controlBarToggle.checked = currentRecordSettings.showControls;
  
  // Update shape buttons
  document.querySelectorAll('.shape-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.shape === currentRecordSettings.cameraShape);
  });
  
  // Update custom selects
  updateRecordCustomSelect('quality-selector', currentRecordSettings.quality);
  updateRecordCustomSelect('fps-selector', currentRecordSettings.frameRate);
  updateRecordCustomSelect('format-selector', currentRecordSettings.format);
  
  // Update settings availability
  updateRecordSettingsAvailability(currentRecordSettings.source);
}

function updateRecordCustomSelect(wrapperId, value) {
  const wrapper = document.getElementById(wrapperId);
  if (!wrapper) return;
  const selectedValueSpan = wrapper.querySelector('.selected-value');
  const menu = wrapper.querySelector('.custom-select-menu');
  const options = menu.querySelectorAll('li');
  let selectedOption = null;
  options.forEach(opt => {
    const isActive = String(opt.dataset.value) === String(value);
    opt.classList.toggle('selected', isActive);
    if (isActive) selectedOption = opt;
  });
  if (selectedOption) {
    let text = selectedOption.textContent.trim();
    // Special handling for quality selector to keep the text short
    if (wrapperId === 'quality-selector') {
      text = text.split(' ')[0];
    }
    selectedValueSpan.textContent = text;
  }
}

function updateRecordShapeSelectorState() {
  const shapeSelector = document.getElementById('shapeSelector');
  const cameraActive = document.getElementById('cameraBtn')?.classList.contains('active');
  if (shapeSelector) {
    shapeSelector.classList.toggle('disabled', !cameraActive);
  }
}

function updateRecordSettingsAvailability(source) {
  const systemAudioBtn = document.getElementById('systemAudioBtn');
  const cameraBtn = document.getElementById('cameraBtn');
  const clickEffectBtn = document.getElementById('clickEffectBtn');
  const annotationBtn = document.getElementById('annotationBtn');
  
  [systemAudioBtn, cameraBtn, clickEffectBtn, annotationBtn].forEach(btn => {
    if (btn) btn.classList.remove('disabled');
  });
  
  if (source === 'camera_only') { // Assuming 'camera_only' is the value for Camera Only mode
    if (systemAudioBtn) systemAudioBtn.classList.add('disabled');
    if (clickEffectBtn) clickEffectBtn.classList.add('disabled');
    if (annotationBtn) annotationBtn.classList.add('disabled');
    if (cameraBtn) cameraBtn.classList.add('disabled');
  }
  
  updateRecordShapeSelectorState();
}

function setupRecordEventListeners() {
  const rebind = (selector, event, handler) => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      if (element._boundHandler) {
        element.removeEventListener(event, element._boundHandler);
      }
      element._boundHandler = handler;
      element.addEventListener(event, element._boundHandler);
    });
  };
  
  const rebindById = (id, event, handler) => {
    const element = document.getElementById(id);
    if (element) {
      if (element._boundHandler) {
        element.removeEventListener(event, element._boundHandler);
      }
      element._boundHandler = handler;
      element.addEventListener(event, element._boundHandler);
    }
  };

  // Source buttons
  document.querySelectorAll('.source-btn').forEach(button => {
    const handler = async () => {
      const newSource = button.dataset.source;
      if (newSource === currentRecordSettings.source) return;
      currentRecordSettings.source = newSource;
      document.querySelectorAll('.source-btn').forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      updateRecordSettingsAvailability(newSource);
      await saveRecordSettings(currentRecordSettings);
    };
    if (button._sourceHandler) button.removeEventListener('click', button._sourceHandler);
    button._sourceHandler = handler;
    button.addEventListener('click', button._sourceHandler);
  });
  
  // Setting buttons
  document.querySelectorAll('.setting-btn[data-setting]').forEach(btn => {
    const handler = async () => {
      if (btn.classList.contains('disabled')) return;
      const setting = btn.dataset.setting;
      
      // Map old data-setting values to new property names if necessary
      // Assuming HTML still has 'cameraEnabled' etc, we need to map them.
      // Or better, update HTML data-attributes.
      // For now, let's assume data-attributes in HTML are still old: 
      // micEnabled, systemAudioEnabled, cameraEnabled, clickEffectEnabled, annotationEnabled
      
      let key = setting;
      if (setting === 'micEnabled') key = 'mic';
      if (setting === 'systemAudioEnabled') key = 'systemAudio';
      if (setting === 'cameraEnabled') key = 'camera';
      if (setting === 'clickEffectEnabled') key = 'clickEffect';
      if (setting === 'annotationEnabled') key = 'draw';
      
      currentRecordSettings[key] = !currentRecordSettings[key];
      btn.classList.toggle('active');
      if (key === 'camera') updateRecordShapeSelectorState();
      await saveRecordSettings(currentRecordSettings);
    };
    if (btn._settingHandler) btn.removeEventListener('click', btn._settingHandler);
    btn._settingHandler = handler;
    btn.addEventListener('click', btn._settingHandler);
  });
  
  // Control bar toggle
  rebindById('controlBarToggle', 'change', async (e) => {
    currentRecordSettings.showControls = e.target.checked;
    await saveRecordSettings(currentRecordSettings);
  });
  
  // Shape buttons
  document.querySelectorAll('.shape-btn').forEach(btn => {
    const handler = async () => {
      const shapeSelector = document.getElementById('shapeSelector');
      if (shapeSelector && shapeSelector.classList.contains('disabled')) return;
      currentRecordSettings.cameraShape = btn.dataset.shape;
      document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      await saveRecordSettings(currentRecordSettings);
    };
    if (btn._shapeHandler) btn.removeEventListener('click', btn._shapeHandler);
    btn._shapeHandler = handler;
    btn.addEventListener('click', btn._shapeHandler);
  });
  
  // Custom select wrappers (Quality, FPS, Format)
  document.querySelectorAll('.custom-select-wrapper').forEach(wrapper => {
    const trigger = wrapper.querySelector('.custom-select-trigger');
    if (!trigger) return;
    
    const triggerHandler = (e) => {
      e.stopPropagation();
      document.querySelectorAll('.custom-select-wrapper').forEach(w => {
        if (w !== wrapper) w.classList.remove('open');
      });
      wrapper.classList.toggle('open');
    };
    if (trigger._triggerHandler) trigger.removeEventListener('click', trigger._triggerHandler);
    trigger._triggerHandler = triggerHandler;
    trigger.addEventListener('click', trigger._triggerHandler);
    
    wrapper.querySelectorAll('.custom-select-menu li').forEach(option => {
      const optionHandler = async () => {
        const settingRaw = option.parentElement.dataset.setting; // videoQuality, frameRate, videoFormat
        const value = option.dataset.value;
        
        // Map to new keys
        let key = settingRaw;
        if (settingRaw === 'videoQuality') key = 'quality';
        if (settingRaw === 'videoFormat') key = 'format';
        
        currentRecordSettings[key] = (key === 'frameRate') ? parseInt(value, 10) : value;
        updateRecordCustomSelect(wrapper.id, value);
        await saveRecordSettings(currentRecordSettings);
        wrapper.classList.remove('open');
      };
      if (option._optionHandler) option.removeEventListener('click', option._optionHandler);
      option._optionHandler = optionHandler;
      option.addEventListener('click', option._optionHandler);
    });
  });
  
  // Close custom selects when clicking outside
  const closeDropdowns = () => {
    document.querySelectorAll('.custom-select-wrapper.open').forEach(w => w.classList.remove('open'));
  };
  if (window._closeDropdownsHandler) {
    window.removeEventListener('click', window._closeDropdownsHandler);
  }
  window._closeDropdownsHandler = closeDropdowns;
  window.addEventListener('click', window._closeDropdownsHandler);
  
  // Start record button
  rebindById('startRecordBtn', 'click', async () => {
    try {
      console.log('[RecorderPanel] Starting recording with settings:', currentRecordSettings);
      await saveRecordSettings(currentRecordSettings);
      
      // Gửi tin nhắn startRecording tới Background
      // Background sẽ xử lý việc chọn màn hình và tự động mở tab recorder-tab.html khi xong
      chrome.runtime.sendMessage({ action: 'startRecording', settings: currentRecordSettings }, (response) => {
          if (chrome.runtime.lastError) {
              const errorMsg = chrome.runtime.lastError.message || 'Failed to communicate with background script.';
              console.error('[RecorderPanel] Error starting recording:', errorMsg);
              // TODO: Hiển thị thông báo lỗi cho user (có thể dùng notification hoặc UI element)
              return;
          }
          
          if (!response) {
              console.error('[RecorderPanel] No response received from background script');
              // TODO: Hiển thị thông báo lỗi cho user
              return;
          }
          
          if (response.success && response.streamId) {
              console.log('[RecorderPanel] Recording initiated successfully. Background will open recorder tab. Stream ID:', response.streamId);
              // Background đã tự mở tab recorder, không cần mở lại
              // Đóng panel sau khi bắt đầu (tùy chọn)
              // window.close(); 
          } else if (response.cancelled) {
              console.log('[RecorderPanel] User cancelled selection');
              // Không cần hiển thị thông báo khi user tự cancel
          } else {
              const errorMsg = response?.error || response?.message || 'Unknown error occurred';
              console.error('[RecorderPanel] Recording cancelled or failed:', errorMsg, 'Full response:', response);
              // TODO: Hiển thị thông báo lỗi cho user
          }
      });
      
    } catch (error) {
      console.error('[RecorderPanel] Error starting recording:', error);
    }
  });
}

export function handleRecBtn() {
  const chatView = document.getElementById('chatView');
  const recordView = document.getElementById('recordView');
  const translateView = document.getElementById('translateView');
  const pdfChatView = document.getElementById('pdfChatView');
  const footerInput = document.querySelector('.footer-input');
  
  if (chatView) chatView.style.display = 'none';
  if (translateView) translateView.style.display = 'none';
  if (pdfChatView) {
    pdfChatView.style.display = 'none';
    pdfChatView.classList.add('d-none');
  }
  if (recordView) {
    recordView.style.display = 'flex';
    recordView.classList.remove('d-none');
  }
  if (footerInput) footerInput.style.display = 'none';
  
  document.querySelectorAll('.sidebar-item .menu-icon').forEach(btn => {
    btn.classList.remove('active');
  });
  const recBtn = document.getElementById('recBtn');
  if (recBtn) recBtn.classList.add('active');
  
  initializeRecordPanel();
}

export function initializeRecorderPanel() {
  // Recorder button event listener will be attached in panel.js
}

export { initializeRecordPanel };

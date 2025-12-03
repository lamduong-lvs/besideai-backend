// modules/toolbar/menu-toolbar.js

// ===== 1. IMPORT MODULES =====
import { auth, SESSION_EVENTS } from '../auth/auth.js';
import { themeManager } from '../../utils/theme.js';
// =============================

// ===== 1.5. I18N LOADER (CHO MODULE) =====
const SUPPORTED_LANGUAGES = [
    { code: 'vi',    name_key: 'lang_vi', icon_file: 'vi' },
    { code: 'en',    name_key: 'lang_en', icon_file: 'en' },
    { code: 'ja',    name_key: 'lang_ja', icon_file: 'jp' },
    { code: 'ko',    name_key: 'lang_ko', icon_file: 'kr' },
    { code: 'zh',    name_key: 'lang_zh', icon_file: 'cn' },
    { code: 'fr',    name_key: 'lang_fr', icon_file: 'fr' },
    { code: 'de',    name_key: 'lang_de', icon_file: 'de' },
    { code: 'es',    name_key: 'lang_es', icon_file: 'es' }
];

let i18nStrings = {};
let currentLang = 'en'; 

async function loadI18n() {
    let targetLang = 'en';
    try {
        const data = await chrome.storage.sync.get('userLang');
        targetLang = data.userLang || 'en'; 
    } catch (e) {
        targetLang = 'en';
    }
    
    currentLang = targetLang;

    const langUrl = chrome.runtime.getURL(`lang/${targetLang}.json`);
    try {
        const response = await fetch(langUrl);
        if (!response.ok) throw new Error(`Không thể tải ${targetLang}.json`);
        i18nStrings = await response.json();
    } catch (error) {
        console.error('i18n (Popup): Lỗi tải file ngôn ngữ!', error);
    }
}

function getLang(key, replaces = null) {
    let str = i18nStrings[key];
    
    if (str === undefined) {
        console.warn(`i18n (Popup): Thiếu key: "${key}"`);
        return `[${key}]`; 
    }
    
    if (replaces) {
        for (const rKey in replaces) {
            str = str.replace(new RegExp(`%${rKey}%`, 'g'), replaces[rKey]);
        }
    }
    return str;
}

// ===== 2. RECORDER STORAGE LOGIC =====
const RECORDER_SETTINGS_KEY = 'recorderSettings';
// ✅ UPDATED: Use standardized property names
const DEFAULT_SETTINGS = {
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

async function getSettings() {
    try {
        const data = await chrome.storage.local.get(RECORDER_SETTINGS_KEY);
        return { ...DEFAULT_SETTINGS, ...(data[RECORDER_SETTINGS_KEY] || {}) };
    } catch (error) { 
        console.error(getLang('errorGetSettings'), error); 
        return DEFAULT_SETTINGS; 
    }
}
async function saveSettings(settings) {
    try { 
        await chrome.storage.local.set({ [RECORDER_SETTINGS_KEY]: settings }); 
    } 
    catch (error) { 
        console.error(getLang('errorSaveSettings'), error); 
    }
}
// ======================================

let currentSettings = null;
let domElements; 

// ===== 3. INITIALIZATION =====
document.addEventListener('DOMContentLoaded', async () => {
    await loadI18n();

    if (window.Lang && window.Lang.applyToDOM) {
        await window.Lang?.initializationPromise; 
        window.Lang.applyToDOM(document.body);
    } else {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            el.textContent = getLang(key);
        });
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            el.title = getLang(key);
        });
    }

    domElements = {
        headerLoggedIn: document.getElementById('header-logged-in'),
        headerLoggedOut: document.getElementById('header-logged-out'),
        userInfoAvatar: document.getElementById('user-info-avatar'),
        userInfoName: document.getElementById('user-info-name'),
        userInfoEmail: document.getElementById('user-info-email'),
        popupTabs: document.querySelector('.popup-tabs'),
        mainMenuPanel: document.getElementById('main-menu-panel'),
        tabButtons: document.querySelectorAll('.popup-tabs .tab-btn'),
        contentPanels: document.querySelectorAll('.popup-content .tab-panel'),
        languageSelectorWrapper: document.getElementById('language-selector-wrapper'),
        languageSelectorTrigger: document.getElementById('language-selector-trigger'),
        languageSelectedValue: document.getElementById('language-selected-value'),
        languageSelectorMenu: document.getElementById('language-selector-menu')
    };
    
    await themeManager.init();
	themeManager.addListener(updatePopupThemeUI);
    setupAuthListeners();

    try {
        await auth.initialize();
        console.log('[Popup] Auth module initialized');
        const user = await auth.getCurrentUser();
        if (user) {
            updateLoggedInState(user);
        } else {
            updateLoggedOutState();
        }
    } catch (authError) {
        console.error(getLang('errorAuthInit'), authError);
        updateLoggedOutState();
    }
    
    currentSettings = await getSettings();
    initializeUI(); 
    initializeLanguageSelector();
    initializeEventListeners();
    await loadThemeSettings();
    initializeFooter();
    
    await checkAndOpenStartupTab();
});

// ===== 4. AUTH STATE UI HANDLERS =====
function updateLoggedInState(user) {
    domElements.headerLoggedIn.classList.remove('hidden');
    domElements.headerLoggedOut.classList.add('hidden');
    if (domElements.userInfoAvatar) domElements.userInfoAvatar.src = user.picture || '';
    if (domElements.userInfoName) domElements.userInfoName.textContent = user.name || 'User';
    if (domElements.userInfoEmail) domElements.userInfoEmail.textContent = user.email || '';
    domElements.popupTabs.classList.remove('hidden');
    domElements.contentPanels.forEach(panel => panel.classList.remove('active'));
    domElements.mainMenuPanel.classList.add('active');
}

function updateLoggedOutState() {
    domElements.headerLoggedIn.classList.add('hidden');
    domElements.headerLoggedOut.classList.remove('hidden'); // Show login button
    domElements.popupTabs.classList.add('hidden');
    domElements.contentPanels.forEach(panel => panel.classList.remove('active'));
    domElements.mainMenuPanel.classList.add('active');
}

// ===== 4.5. LANGUAGE SELECTOR =====
function initializeLanguageSelector() {
    if (!domElements.languageSelectorMenu || !domElements.languageSelectedValue) return;

    domElements.languageSelectorMenu.innerHTML = ''; 
    let currentLangName = '';
    let currentIconFile = ''; 

    SUPPORTED_LANGUAGES.forEach(lang => {
        const langName = getLang(lang.name_key); 
        const iconFile = lang.icon_file; 
        const iconUrl = chrome.runtime.getURL(`icons/svg/lang/${iconFile}.svg`);
        
        const li = document.createElement('li');
        li.dataset.value = lang.code;
        
        li.innerHTML = `<img src="${iconUrl}" class="lang-flag-icon" alt="${iconFile}" title="${langName}">`; 
        
        if (lang.code === currentLang) {
            li.classList.add('selected');
            currentLangName = langName;
            currentIconFile = iconFile; 
        }
        
        domElements.languageSelectorMenu.appendChild(li);
    });

    const currentIconUrl = chrome.runtime.getURL(`icons/svg/lang/${currentIconFile}.svg`);
    domElements.languageSelectedValue.innerHTML = `<img src="${currentIconUrl}" class="lang-flag-icon" alt="${currentIconFile}" title="${currentLangName}">`;
    
    if (domElements.languageSelectorTrigger) {
        const arrowIcon = domElements.languageSelectorTrigger.querySelector('.chevron-right');
        if (arrowIcon) arrowIcon.style.display = 'none';
        domElements.languageSelectorTrigger.style.padding = '5px 6px';
        domElements.languageSelectorTrigger.style.minWidth = 'auto';
    }
}


// ===== 5. EVENT LISTENERS =====
function setupAuthListeners() {
    auth.on(SESSION_EVENTS.CREATED, (user) => {
        console.log('[Popup] User logged in:', user);
        updateLoggedInState(user);
    });
    auth.on(SESSION_EVENTS.DESTROYED, () => {
        console.log('[Popup] User logged out');
        updateLoggedOutState();
    });
    auth.on(SESSION_EVENTS.EXPIRED, () => {
        console.log('[Popup] Session expired');
        updateLoggedOutState();
        alert(getLang('alertSessionExpired'));
    });
}

function initializeEventListeners() {
    // --- TAB SWITCHING ---
    domElements.tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetPanelId = button.dataset.panel;
            const targetPanel = document.getElementById(targetPanelId);
            const isAlreadyActive = button.classList.contains('active');
            domElements.tabButtons.forEach(btn => btn.classList.remove('active'));
            domElements.contentPanels.forEach(panel => panel.classList.remove('active'));
            if (isAlreadyActive) {
                domElements.mainMenuPanel.classList.add('active');
            } else {
                button.classList.add('active');
                if (targetPanel) {
                    targetPanel.classList.add('active');
                } else {
                    domElements.mainMenuPanel.classList.add('active');
                }
            }
        });
    });

    // --- Auth buttons ---
    document.getElementById('login-with-google-btn')?.addEventListener('click', handleLogin);
    document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
    document.getElementById('google-account-btn')?.addEventListener('click', () => {
        chrome.tabs.create({ url: 'https://myaccount.google.com' });
    });
    document.getElementById('settings-btn')?.addEventListener('click', () => {
        const settingsUrl = chrome.runtime.getURL('setting/setting.html');
        chrome.tabs.create({ url: settingsUrl });
    });

    // --- Theme Toggle Buttons ---
    const themeButtons = document.querySelectorAll('.theme-toggle-btn');
    if (themeButtons.length > 0) {
        themeButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                const theme = button.getAttribute('data-theme');
                try {
                    // Lưu theme vào storage (hỗ trợ 'auto')
                    await chrome.storage.local.set({ theme: theme });
                    
                    // Áp dụng theme hiệu quả
                    if (theme === 'auto') {
                        // Xác định theme dựa trên system preference
                        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                        const effectiveTheme = prefersDark ? 'dark' : 'light';
                        await themeManager.setTheme(effectiveTheme);
                    } else {
                        await themeManager.setTheme(theme);
                    }
                    
                    updateThemeToggleState(theme);
                    console.log(`[Popup] Theme set to: ${theme}`);
                } catch (error) {
                    console.error(getLang('errorTheme'), error);
                }
            });
        });
    }

    // --- RECORDER LISTENERS ---
    document.querySelectorAll('.source-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const newSource = button.dataset.source;
            if (newSource === currentSettings.source) return;
            currentSettings.source = newSource;
            document.querySelectorAll('.source-btn').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            updateSettingsAvailability(newSource);
            await saveSettings(currentSettings);
        });
    });
    
    document.querySelectorAll('.setting-btn[data-setting]').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (btn.classList.contains('disabled')) return;
            const key = btn.dataset.setting;
            
            // Direct mapping as HTML is updated
            currentSettings[key] = !currentSettings[key];
            btn.classList.toggle('active');
            if (key === 'camera') updateShapeSelectorState();
            await saveSettings(currentSettings);
        });
    });
    
    document.getElementById('controlBarToggle').addEventListener('change', async (e) => {
        currentSettings.showControls = e.target.checked;
        await saveSettings(currentSettings);
    });
    
    document.querySelectorAll('.shape-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (document.getElementById('shapeSelector').classList.contains('disabled')) return;
            currentSettings.cameraShape = btn.dataset.shape;
            document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            await saveSettings(currentSettings);
        });
    });
    
    document.querySelectorAll('.custom-select-wrapper').forEach(wrapper => {
        if (wrapper.id === 'language-selector-wrapper') return; 
        wrapper.querySelector('.custom-select-trigger').addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.custom-select-wrapper').forEach(w => {
                if (w !== wrapper) w.classList.remove('open');
            });
            wrapper.classList.toggle('open');
        });
        wrapper.querySelectorAll('.custom-select-menu li').forEach(option => {
            option.addEventListener('click', async () => {
                const key = option.parentElement.dataset.setting; // quality, frameRate, format
                const value = option.dataset.value;
                
                currentSettings[key] = (key === 'frameRate') ? parseInt(value, 10) : value;
                updateCustomSelect(wrapper.id, value);
                await saveSettings(currentSettings);
                wrapper.classList.remove('open');
            });
        });
    });
    window.addEventListener('click', () => { document.querySelectorAll('.custom-select-wrapper').forEach(w => w.classList.remove('open')); });
    
    // ✅ UPDATED: Start Recording Logic
    document.getElementById('startRecordBtn').addEventListener('click', startRecording);
    
    // --- CAPTURE LISTENERS ---
    document.querySelectorAll('.capture-btn').forEach(button => {
        button.addEventListener('click', () => {
            const actionType = button.dataset.action;
            if (!actionType) return;
            chrome.runtime.sendMessage({ action: 'contextMenuAction', type: actionType, selectedText: '' }, 
            (response) => { 
                if (chrome.runtime.lastError) {
                    console.error("Lỗi:", chrome.runtime.lastError.message);
                    alert(chrome.runtime.lastError.message);
                } else if (!response || response.success === false) {
                    if (response?.error) {
                        alert(response.error);
                    } else {
                        alert('Không thể thực hiện hành động này trên trang hiện tại.');
                    }
                }
            });
            window.close();
        });
    });

    // --- LANGUAGE SELECTOR LISTENERS ---
    if (domElements.languageSelectorTrigger) {
        domElements.languageSelectorTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.custom-select-wrapper').forEach(w => {
                if (w.id !== 'language-selector-wrapper') w.classList.remove('open');
            });
            domElements.languageSelectorWrapper.classList.toggle('open');
        });
    }

    if (domElements.languageSelectorMenu) {
    domElements.languageSelectorMenu.addEventListener('click', async (e) => {
        const targetLi = e.target.closest('li');
        if (targetLi) {
            const newLangCode = targetLi.dataset.value;
            if (newLangCode && newLangCode !== currentLang) {
                try {
                    await window.Lang.setLanguage(newLangCode);
                } catch (err) {
                    console.error('i18n (Popup): Không thể lưu ngôn ngữ', err);
                }
            }
        }
    });
}
  chrome.storage.onChanged.addListener(async (changes, namespace) => {
      if (namespace === 'sync' && changes.userLang) {
          const newLangCode = changes.userLang.newValue;
          if (newLangCode && newLangCode !== currentLang) {
              try {
                  const langUrl = chrome.runtime.getURL(`lang/${newLangCode}.json`);
                  const response = await fetch(langUrl);
                  if (!response.ok) throw new Error(`Không thể tải ${newLangCode}.json`);
                  const newStrings = await response.json();
                  currentLang = newLangCode;
                  i18nStrings = newStrings;
                  document.documentElement.lang = newLangCode;
                  document.querySelectorAll('[data-i18n]').forEach(el => {
                      const key = el.getAttribute('data-i18n');
                      el.textContent = getLang(key);
                  });
                  document.querySelectorAll('[data-i18n-title]').forEach(el => {
                      const key = el.getAttribute('data-i18n-title');
                      el.title = getLang(key);
                  });
                  initializeLanguageSelector();
                  console.log(`[Popup] Ngôn ngữ đã được cập nhật sang ${newLangCode}`);
              } catch (error) {
                  console.error('[Popup] Lỗi khi cập nhật ngôn ngữ:', error);
              }
          }
      }
  });
}

// ===== 6. ACTION HANDLERS =====
async function handleLogin() {
    try { await auth.login(); } 
    catch (error) { console.error(getLang('errorLogin'), error); }
}
async function handleLogout() {
    try { await auth.logout(); } 
    catch (error) { console.error(getLang('errorLogout'), error); }
}

// ✅ UPDATED: Standard start recording function
async function startRecording() {
    try {
        console.log('[Popup] Starting recording with settings:', currentSettings);
        await saveSettings(currentSettings);
        
        chrome.runtime.sendMessage({ action: 'startRecording', settings: currentSettings }, (response) => {
            if (chrome.runtime.lastError) {
                const errorMsg = chrome.runtime.lastError.message || 'Failed to communicate with background script.';
                console.error('[Popup] Error starting recording:', errorMsg);
                alert(getLang('errorStartRecordAlert', { message: errorMsg }));
                return;
            }
            
            if (!response) {
                console.error('[Popup] No response received from background script');
                alert(getLang('errorStartRecordAlert', { message: 'No response from background script' }));
                return;
            }
            
            if (response.success && response.streamId) {
                console.log('[Popup] Recording initiated. Background will open recorder tab. StreamId:', response.streamId);
                // Background đã tự mở tab recorder, không cần mở lại
                window.close();
            } else if (response.cancelled) {
                console.log('[Popup] User cancelled selection.');
                // Không cần hiển thị alert khi user tự cancel
            } else {
                const errorMsg = response?.error || response?.message || 'Unknown error occurred';
                console.error('[Popup] Recording failed:', errorMsg, 'Full response:', response);
                alert(getLang('errorStartRecordAlert', { message: errorMsg }));
            }
        });
    } catch (error) { 
        console.error(getLang('errorStartRecord'), error); 
        alert(getLang('errorStartRecordAlert', { message: error.message })); 
    }
}

// --- Theme Handlers ---
function updateThemeToggleState(activeTheme) {
    const themeButtons = document.querySelectorAll('.theme-toggle-btn');
    const themeGroup = document.querySelector('.theme-toggle-group');
    
    // Cập nhật data-theme trên container để slider di chuyển
    if (themeGroup) {
        themeGroup.setAttribute('data-theme', activeTheme);
    }
    
    // Cập nhật active state cho các buttons
    themeButtons.forEach(button => {
        const buttonTheme = button.getAttribute('data-theme');
        if (buttonTheme === activeTheme) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

async function loadThemeSettings() {
    try {
        const data = await chrome.storage.local.get('theme');
        const savedTheme = data.theme || 'light';
        updateThemeToggleState(savedTheme);
        
        // Nếu là auto, áp dụng theme hiệu quả
        if (savedTheme === 'auto') {
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            const effectiveTheme = prefersDark ? 'dark' : 'light';
            await themeManager.setTheme(effectiveTheme);
        }
    } catch (error) { 
        console.error(getLang('errorLoadTheme'), error); 
    }
}

function updatePopupThemeUI(theme) {
    // Load theme từ storage để cập nhật toggle state (bao gồm 'auto')
    chrome.storage.local.get('theme', (data) => {
        const savedTheme = data.theme || 'light';
        updateThemeToggleState(savedTheme);
    });
}

// ===== 7. UI INITIALIZATION (RECORDER-specific) =====
function initializeUI() {
    // ✅ UPDATED: Use new property names directly
    document.getElementById('micBtn').classList.toggle('active', currentSettings.mic);
    document.getElementById('systemAudioBtn').classList.toggle('active', currentSettings.systemAudio);
    document.getElementById('cameraBtn').classList.toggle('active', currentSettings.camera);
    document.getElementById('clickEffectBtn').classList.toggle('active', currentSettings.clickEffect);
    document.getElementById('annotationBtn').classList.toggle('active', currentSettings.draw);
    document.getElementById('controlBarToggle').checked = currentSettings.showControls;
    
    document.querySelectorAll('.shape-btn').forEach(btn => { btn.classList.toggle('active', btn.dataset.shape === currentSettings.cameraShape); });
    document.querySelectorAll('.source-btn').forEach(btn => { btn.classList.toggle('active', btn.dataset.source === currentSettings.source); });
    
    updateCustomSelect('quality-selector', currentSettings.quality);
    updateCustomSelect('fps-selector', currentSettings.frameRate);
    updateCustomSelect('format-selector', currentSettings.format);
    
    updateSettingsAvailability(currentSettings.source);
}
function updateCustomSelect(wrapperId, value) {
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
        let text = selectedOption.textContent.trim().split(' ')[0];
        selectedValueSpan.textContent = text;
    }
}
function updateShapeSelectorState() {
    const shapeSelector = document.getElementById('shapeSelector');
    const cameraActive = document.getElementById('cameraBtn').classList.contains('active');
    shapeSelector.classList.toggle('disabled', !cameraActive);
}
function updateSettingsAvailability(source) {
    const systemAudioBtn = document.getElementById('systemAudioBtn');
    const cameraBtn = document.getElementById('cameraBtn');
    const clickEffectBtn = document.getElementById('clickEffectBtn');
    const annotationBtn = document.getElementById('annotationBtn');
    [systemAudioBtn, cameraBtn, clickEffectBtn, annotationBtn].forEach(btn => btn.classList.remove('disabled'));
    if (source === 'camera_only') {
        systemAudioBtn.classList.add('disabled');
        clickEffectBtn.classList.add('disabled');
        annotationBtn.classList.add('disabled');
        cameraBtn.classList.add('disabled');
    }
    updateShapeSelectorState();
}

// ===== 8. HÀM CẬP NHẬT FOOTER =====
function initializeFooter() {
    try {
        const manifest = chrome.runtime.getManifest();
        const version = manifest.version;
        const name = manifest.name; 
        const footerText = `V${version} | ${name} by Lam Dương`;
        const footerElement = document.getElementById('popup-footer-info');
        if (footerElement) {
            footerElement.textContent = footerText;
        }
    } catch (error) {
        console.error(getLang('errorInitFooter'), error);
        const footerElement = document.getElementById('popup-footer-info');
        if (footerElement) {
            footerElement.textContent = getLang('footerDefault');
        }
    }
}

// ===== CHECK AND OPEN STARTUP TAB =====
async function checkAndOpenStartupTab() {
    try {
        const data = await chrome.storage.local.get('startupTab');
        const startupTab = data.startupTab;
        
        if (startupTab) {
            const tabButton = document.querySelector(`.tab-btn[data-panel="${startupTab}"]`);
            if (tabButton) {
                tabButton.click();
            }
            await chrome.storage.local.remove('startupTab');
        }
    } catch (error) {
        console.error('Error checking startup tab:', error);
    }
}

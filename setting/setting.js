import { TokenStorage } from '../modules/auth/core/token-storage.js';
import { auth } from '../modules/auth/auth.js';
import { apiManager } from '../utils/api.js';
import { showToast } from './modules/core/toast.js';
import { SUPPORTED_LANGUAGES } from './constants.js';

// Translation languages configuration (inline definition for simplicity)
const TRANSLATION_LANGUAGES = [
    { value: 'vi', label: 'Tiếng Việt' },
    { value: 'en', label: 'English' },
    { value: 'ja', label: '日本語' },
    { value: 'ko', label: '한국어' },
    { value: 'zh', label: '中文' },
    { value: 'fr', label: 'Français' },
    { value: 'de', label: 'Deutsch' },
    { value: 'es', label: 'Español' }
];

// Initialize services
const tokenStorage = new TokenStorage();
const authModule = auth;

// State
let currentProviderId = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Wait for i18n to be ready
  if (window.Lang && window.Lang.initializationPromise) {
    await window.Lang.initializationPromise;
  }
  
    // Load manifest info
    loadManifestInfo();

    // Load API Configs
    await apiManager.loadFromStorage();

    // ✅ Initialize theme first to ensure it's applied before rendering
    await initializeTheme();

    // Initialize UI
    await renderAccountInfo();
    setupNavigation();
    setupEventListeners();
    setupAIProviderConfig();
    setupRacingMode();
    setupTranslateSettings();
    setupWebAssistantSettings();
    setupContextMenuSettings();
    setupSearch();
    initializeLanguageSelector();
    initializeThemeTooltips();
    
    // NEW: Populate model selectors on load
    populateModelSelectors();
});

function loadManifestInfo() {
    try {
        const manifest = chrome.runtime.getManifest();
        const appNameEl = document.getElementById('app-name');
        const appVersionEl = document.getElementById('app-version');
        const appLogoEl = document.getElementById('app-logo');
        const pageTitleTag = document.getElementById('page-title-tag') || document.querySelector('title');
        
        // Update sidebar app logo
        if (appLogoEl && manifest.icons && manifest.icons['48']) {
            appLogoEl.src = chrome.runtime.getURL(manifest.icons['48']);
            appLogoEl.alt = manifest.name || 'Extension Logo';
        }
        
        // Update sidebar app name
        if (appNameEl && manifest.name) {
            appNameEl.textContent = manifest.name;
        }
        
        // Update sidebar version
        if (appVersionEl && manifest.version) {
            appVersionEl.textContent = `v${manifest.version}`;
        }
        
        // Update page title tag
        if (pageTitleTag && manifest.name) {
            const settingsText = window.Lang ? window.Lang.get('settings_page_title') : 'Settings';
            pageTitleTag.textContent = `${manifest.name} - ${settingsText}`;
        }
    } catch (error) {
        console.error('Error loading manifest info:', error);
        // Fallback values
        const appNameEl = document.getElementById('app-name');
        const appVersionEl = document.getElementById('app-version');
        const appLogoEl = document.getElementById('app-logo');
        const pageTitleTag = document.getElementById('page-title-tag') || document.querySelector('title');
        if (appLogoEl) appLogoEl.src = chrome.runtime.getURL('icons/icon-48.png');
        if (appNameEl) appNameEl.textContent = 'AI Chat Assistant';
        if (appVersionEl) appVersionEl.textContent = 'v1.0.0';
        if (pageTitleTag) {
            const settingsText = window.Lang ? window.Lang.get('settings_page_title') : 'Settings';
            pageTitleTag.textContent = `AI Chat Assistant - ${settingsText}`;
        }
    }
}

async function renderAccountInfo() {
    const user = await tokenStorage.getUser();
    const avatarEl = document.getElementById('profile-avatar');
    const nameEl = document.getElementById('profile-name');
    const emailEl = document.getElementById('profile-email');
    const logoutBtn = document.getElementById('btn-logout');

    if (user) {
        // Set Avatar
        const avatarHtml = user.picture 
            ? `<img src="${user.picture}" alt="${user.name}" class="w-full h-full object-cover">`
            : `<span class="text-xl font-bold">${user.name ? user.name.charAt(0).toUpperCase() : 'U'}</span>`;

        if (avatarEl) avatarEl.innerHTML = avatarHtml;

        // Set Text
        const displayName = user.name || 'User';
        if (nameEl) nameEl.textContent = displayName;
        if (emailEl) emailEl.textContent = user.email || '';
        
        // Logout Button
        if (logoutBtn) {
            logoutBtn.textContent = window.Lang ? window.Lang.get('settings_account_logout') : 'Đăng xuất';
            logoutBtn.onclick = handleLogout;
        }
    } else {
        // Handle Guest State
        const guestName = window.Lang ? window.Lang.get('authUserFallback') : 'Guest';
        const loginText = window.Lang ? window.Lang.get('authLoginButton') : 'Đăng nhập';

        if (nameEl) nameEl.textContent = guestName;
        if (emailEl) emailEl.textContent = '';
        
        if (avatarEl) avatarEl.textContent = '?';

        if (logoutBtn) {
            logoutBtn.textContent = loginText;
            logoutBtn.onclick = handleLogin;
        }
    }
}

async function handleLogin() {
    try {
        const user = await authModule.login();
        if (user) {
            await renderAccountInfo();
        } else {
            console.log('Login process was not completed.');
        }
    } catch (error) {
        console.error('Login failed from settings page:', error);
        alert('Đăng nhập thất bại. Vui lòng thử lại.');
    }
}

async function handleLogout() {
    const confirmMsg = window.Lang ? window.Lang.get('authLogoutConfirm') : 'Bạn có chắc muốn đăng xuất?';
    if (confirm(confirmMsg)) {
        try {
            await authModule.logout();
            window.location.reload();
        } catch (error) {
            console.error('Logout failed:', error);
            alert('Đăng xuất thất bại. Vui lòng thử lại.');
        }
    }
}

function setupNavigation() {
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    const sections = document.querySelectorAll('.setting-section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            const targetId = item.getAttribute('data-target');
            sections.forEach(section => {
                section.classList.add('d-none');
                section.classList.remove('active');
            });
            
            const targetSection = document.getElementById(`section-${targetId}`);
            if (targetSection) {
                targetSection.classList.remove('d-none');
                setTimeout(() => targetSection.classList.add('active'), 10);
            }
        });
    });
}

function setupEventListeners() {
    // Theme Toggle Buttons
    const themeButtons = document.querySelectorAll('.theme-toggle-btn');
    if (themeButtons.length > 0) {
        // Load saved theme and apply immediately
        chrome.storage.local.get('theme', (data) => {
            const savedTheme = data.theme || 'light';
            updateThemeToggleState(savedTheme);
            applyTheme(savedTheme);
        });

        // Add click handlers to theme buttons
        themeButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                const theme = button.getAttribute('data-theme');
                try {
                    await chrome.storage.local.set({ theme: theme });
                    updateThemeToggleState(theme);
                    applyTheme(theme);
                    showToast('Đã lưu cài đặt', 'success');
                } catch (error) {
                    console.error('[Setting] Error saving theme:', error);
                    showToast('Không thể lưu cài đặt', 'error');
                }
            });
        });
        
        // ✅ Listen for theme changes from other pages (toolbar, etc.)
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local' && changes.theme) {
                const newTheme = changes.theme.newValue || 'light';
                updateThemeToggleState(newTheme);
                applyTheme(newTheme);
            }
        });
    }

    // Language Selector - Removed (now handled by initializeLanguageSelector)
    
    // Default Model Selector
    const defaultModelSelect = document.getElementById('select-default-model');
    if (defaultModelSelect) {
        // Load saved default model
        chrome.storage.local.get('aiProvider', (data) => {
            if (data.aiProvider) {
                defaultModelSelect.value = data.aiProvider;
            }
        });
        
        defaultModelSelect.addEventListener('change', (e) => {
            const fullModelId = e.target.value;
            apiManager.setActiveProvider(fullModelId.split('/')[0]); // This logic might need adjustment depending on how apiManager works
            // Actually we should save the full model ID as the preferred "default"
            chrome.storage.local.set({ aiProvider: fullModelId }, () => {
                showToast('Đã lưu cài đặt', 'success');
            });
        });
    }
    
    // PDF Chat Model Selector - Populate from Gemini models
    const pdfChatModelSelect = document.getElementById('select-pdfchat-model');
    if (pdfChatModelSelect) {
        // Function to populate PDF Chat models from Gemini config
        function populatePDFChatModels() {
            const geminiConfig = apiManager.getProvider('googleai');
            
            // Clear existing options
            pdfChatModelSelect.innerHTML = '';
            
            if (geminiConfig && geminiConfig.models && geminiConfig.models.length > 0) {
                // Add models from Gemini config
                geminiConfig.models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.id;
                    option.textContent = model.displayName || model.id;
                    pdfChatModelSelect.appendChild(option);
                });
                
                // Load saved selection
                chrome.storage.local.get('pdfChat_selectedModel', (data) => {
                    if (data.pdfChat_selectedModel) {
                        pdfChatModelSelect.value = data.pdfChat_selectedModel;
                    }
                });
            } else {
                // No models available
                const option = document.createElement('option');
                option.value = '';
                option.disabled = true;
                option.selected = true;
                option.textContent = 'Vui lòng thêm model Gemini trong phần cấu hình...';
                pdfChatModelSelect.appendChild(option);
            }
        }
        
        // Initial population
        populatePDFChatModels();
        
        // Save when changed
        pdfChatModelSelect.addEventListener('change', (e) => {
            const modelId = e.target.value;
            chrome.storage.local.set({ pdfChat_selectedModel: modelId }, () => {
                console.log('[Settings] PDF Chat model saved:', modelId);
                showToast('Đã lưu cài đặt', 'success');
            });
        });
        
        // Re-populate when modal is closed (after adding models)
        document.addEventListener('pdfModelsUpdated', () => {
            populatePDFChatModels();
        });
    }
}

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

async function initializeTheme() {
    try {
        const data = await chrome.storage.local.get('theme');
        const savedTheme = data.theme || 'light';
        applyTheme(savedTheme);
    } catch (error) {
        console.error('[Setting] Error loading theme:', error);
        applyTheme('light');
    }
}

function applyTheme(theme) {
    // Determine effective theme
    let effectiveTheme = theme;
    if (theme === 'auto') {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            effectiveTheme = 'dark';
        } else {
            effectiveTheme = 'light';
        }
    }
    
    // Apply theme using data-theme attribute (matching CSS theme files)
    if (document.documentElement) {
        document.documentElement.setAttribute('data-theme', effectiveTheme);
    }
    
    // Also update body classes for compatibility
    document.body.classList.remove('theme-light', 'theme-dark', 'theme-auto');
    document.body.classList.add(`theme-${effectiveTheme}`);
    
    console.log('[Settings] Theme applied:', effectiveTheme);
}

// ===== LANGUAGE SELECTOR =====
// Store event handlers to prevent duplicate listeners
let languageSelectorHandlers = {
    triggerClick: null,
    menuClick: null,
    documentClick: null,
    resize: null,
    scroll: null,
    storageChange: null
};

function initializeLanguageSelector() {
    const wrapper = document.getElementById('setting-language-selector-wrapper');
    const trigger = document.getElementById('setting-language-selector-trigger');
    const selectedValueSpan = document.getElementById('setting-language-selected-value');
    const menu = document.getElementById('setting-language-selector-menu');

    if (!wrapper || !trigger || !selectedValueSpan || !menu || !window.Lang) return;

    // Remove old event listeners if they exist
    if (languageSelectorHandlers.triggerClick) {
        trigger.removeEventListener('click', languageSelectorHandlers.triggerClick);
    }
    if (languageSelectorHandlers.menuClick) {
        menu.removeEventListener('click', languageSelectorHandlers.menuClick);
    }
    if (languageSelectorHandlers.documentClick) {
        document.removeEventListener('click', languageSelectorHandlers.documentClick);
    }
    if (languageSelectorHandlers.resize) {
        window.removeEventListener('resize', languageSelectorHandlers.resize);
    }
    if (languageSelectorHandlers.scroll) {
        window.removeEventListener('scroll', languageSelectorHandlers.scroll, true);
    }

    const currentLang = window.Lang.getCurrentLanguage();
    menu.innerHTML = ''; // Clear previous items

    let currentLangName = '';
    let currentIconFile = '';

    SUPPORTED_LANGUAGES.forEach(lang => {
        const langName = window.Lang.get(lang.name_key); 
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

        menu.appendChild(li);
    });

    // Update selected value in trigger
    const currentIconUrl = chrome.runtime.getURL(`icons/svg/lang/${currentIconFile}.svg`);
    selectedValueSpan.innerHTML = `<img src="${currentIconUrl}" class="lang-flag-icon" alt="${currentIconFile}" title="${currentLangName}">`;
    
    // Hide chevron icon for language selector (like Toolbar)
    const arrowIcon = trigger.querySelector('.chevron-right');
    if (arrowIcon) arrowIcon.style.display = 'none';
    trigger.style.padding = '5px 6px';
    trigger.style.minWidth = 'auto';

    // Function to calculate and adjust dropdown position
    function adjustDropdownPosition() {
        // Force menu to be visible temporarily to measure it accurately
        const originalDisplay = menu.style.display;
        const originalVisibility = menu.style.visibility;
        
        if (originalDisplay === 'none' || !wrapper.classList.contains('open')) {
            menu.style.display = 'grid';
            menu.style.visibility = 'hidden';
            menu.style.position = 'absolute';
        }
        
        const rect = trigger.getBoundingClientRect();
        const menuRect = menu.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        
        // Restore original visibility if we changed it
        if (originalDisplay === 'none' || !wrapper.classList.contains('open')) {
            menu.style.visibility = originalVisibility || '';
        }
        
        // Remove previous position classes
        menu.classList.remove('open-up');
        
        // Calculate space below and above
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        const menuHeight = menuRect.height || 200; // Fallback estimate
        const requiredSpace = menuHeight + 10; // Add some margin (5px margin + 5px buffer)
        
        // If not enough space below but enough space above, open upward
        if (spaceBelow < requiredSpace && spaceAbove > requiredSpace) {
            menu.classList.add('open-up');
        }
        
        // Adjust horizontal position if needed (prevent overflow on right)
        const spaceRight = viewportWidth - rect.right;
        const menuWidth = menuRect.width || 250;
        
        if (spaceRight < menuWidth && rect.left >= menuWidth) {
            // If not enough space on right but enough on left, align to left edge of trigger
            menu.style.right = 'auto';
            menu.style.left = '0';
        } else if (spaceRight < menuWidth) {
            // If not enough space on either side, align to viewport edge with max-width
            menu.style.right = '0';
            menu.style.left = 'auto';
            menu.style.maxWidth = `${spaceRight - 10}px`; // Prevent overflow with margin
        } else {
            // Reset to default (right aligned)
            menu.style.right = '0';
            menu.style.left = 'auto';
            menu.style.maxWidth = '';
        }
    }
    
    // Setup event listeners with stored handlers
    let resizeTimeout;
    
    languageSelectorHandlers.triggerClick = (e) => {
        e.stopPropagation();
        // Close other dropdowns
        document.querySelectorAll('.custom-select-wrapper.open').forEach(w => {
            if (w.id !== 'setting-language-selector-wrapper') w.classList.remove('open');
        });
        
        const wasOpen = wrapper.classList.contains('open');
        wrapper.classList.toggle('open');
        
        // If opening, adjust position
        if (!wasOpen && wrapper.classList.contains('open')) {
            // Use setTimeout to ensure menu is rendered before calculating
            setTimeout(() => {
                adjustDropdownPosition();
            }, 0);
        }
    };
    
    languageSelectorHandlers.menuClick = async (e) => {
        const targetLi = e.target.closest('li');
        if (targetLi) {
            const newLangCode = targetLi.dataset.value;
            const currentLang = window.Lang.getCurrentLanguage();
            
            if (newLangCode && newLangCode !== currentLang) {
                // Close dropdown immediately
                wrapper.classList.remove('open');
                
                try {
                    // Use i18n.js setLanguage function to save and reload
                    await window.Lang.setLanguage(newLangCode);
                    // Re-initialize to update UI (cờ và selected state)
                    initializeLanguageSelector();
                    // Re-render everything that might depend on lang
                    populateModelSelectors();
                    showToast('Đã lưu cài đặt', 'success');
                } catch (err) {
                    console.error('i18n (Setting): Không thể lưu ngôn ngữ', err);
                    showToast("Lỗi khi đổi ngôn ngữ", "error");
                    // Re-initialize even on error to restore UI state
                    initializeLanguageSelector();
                }
            } else {
                // Same language selected, just close dropdown
                wrapper.classList.remove('open');
            }
        }
    };
    
    languageSelectorHandlers.documentClick = (e) => {
        if (!wrapper.contains(e.target)) {
            wrapper.classList.remove('open');
        }
    };
    
    languageSelectorHandlers.resize = () => {
        if (wrapper.classList.contains('open')) {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                adjustDropdownPosition();
            }, 100);
        }
    };
    
    languageSelectorHandlers.scroll = () => {
        if (wrapper.classList.contains('open')) {
            adjustDropdownPosition();
        }
    };
    
    // Attach event listeners
    trigger.addEventListener('click', languageSelectorHandlers.triggerClick);
    menu.addEventListener('click', languageSelectorHandlers.menuClick);
    document.addEventListener('click', languageSelectorHandlers.documentClick);
    window.addEventListener('resize', languageSelectorHandlers.resize);
    window.addEventListener('scroll', languageSelectorHandlers.scroll, true);
}

// Setup storage listener once (outside of initializeLanguageSelector to avoid duplicates)
if (!window.languageStorageListenerSetup) {
    chrome.storage.onChanged.addListener(async (changes, namespace) => {
        if (namespace === 'sync' && changes.userLang) {
            const newLangCode = changes.userLang.newValue;
            if (newLangCode && window.Lang && newLangCode !== window.Lang.getCurrentLanguage()) {
                // Re-initialize to update UI
                initializeLanguageSelector();
                // Re-render model selectors as they might have language-dependent text
                populateModelSelectors();
            }
        }
    });
    window.languageStorageListenerSetup = true;
}

// Initialize tooltips for theme toggle buttons
function initializeThemeTooltips() {
    const themeButtons = document.querySelectorAll('.theme-toggle-btn');
    themeButtons.forEach(button => {
        const tooltipKey = button.getAttribute('data-tooltip');
        if (tooltipKey && window.Lang) {
            // Get translated text from i18n and set as title
            const tooltipText = window.Lang.get(tooltipKey);
            if (tooltipText) {
                button.setAttribute('title', tooltipText);
                // Also attach to tooltip manager if available
                if (window.tooltipManager) {
                    window.tooltipManager.attach(button, {
                        content: tooltipText,
                        i18n: false // Already translated
                    });
                }
            }
        }
    });
}

// === AI CONFIGURATION ===

async function populateModelSelectors() {
    // Get all configured models
    const allModels = apiManager.getAllAddedModels();
    
    console.log('[Setting] Total models from apiManager:', allModels.length);
    if (allModels.length > 0) {
        console.log('[Setting] Available models:', allModels.map(m => m.fullModelId));
    }
    
    // ✅ Filter models based on tier
    let filteredModels = allModels;
    try {
        const { subscriptionManager } = await import('../modules/subscription/subscription-manager.js');
        const { isModelAllowedForTier, getLimitsForTier } = await import('../modules/subscription/subscription-config.js');
        await subscriptionManager.ensureInitialized();
        const currentTier = await subscriptionManager.getTier();
        
        console.log('[Setting] Current tier:', currentTier);
        
        if (currentTier !== 'byok') {
            const limits = getLimitsForTier(currentTier);
            console.log('[Setting] Allowed models for tier:', limits.allowedModels);
            
            filteredModels = allModels.filter(model => {
                const isAllowed = isModelAllowedForTier(currentTier, model.fullModelId);
                if (!isAllowed) {
                    console.log(`[Setting] Model ${model.fullModelId} is not allowed for tier ${currentTier}`);
                }
                return isAllowed;
            });
            console.log('[Setting] Filtered models after tier check:', filteredModels.length);
            if (filteredModels.length > 0) {
                console.log('[Setting] Allowed models:', filteredModels.map(m => m.fullModelId));
            }
        } else {
            console.log('[Setting] BYOK tier - showing all models');
        }
    } catch (error) {
        console.warn('[Setting] Failed to filter models by tier:', error);
        // Fallback: show all models if filtering fails
        filteredModels = allModels;
    }
    
    const defaultSelect = document.getElementById('select-default-model');
    const racingList = document.getElementById('racing-models-list');
    
    if (!defaultSelect || !racingList) {
        console.warn('[Setting] Missing selectors:', { defaultSelect: !!defaultSelect, racingList: !!racingList });
        return;
    }
    
    // Clear existing options
    defaultSelect.innerHTML = '<option value="" disabled selected>Chọn model...</option>';
    racingList.innerHTML = '';
    
    if (filteredModels.length === 0) {
        // ✅ Fallback: If no models after filtering but we have models, show all with warning
        if (allModels.length > 0) {
            console.warn('[Setting] No models match tier restrictions, showing all models as fallback');
            filteredModels = allModels;
            
            // Show warning message
            const warningDiv = document.createElement('div');
            warningDiv.className = 'text-sm text-warning mb-sm p-xs bg-warning/10 border border-warning/20 rounded';
            warningDiv.textContent = '⚠️ Một số model có thể không khả dụng với gói hiện tại của bạn.';
            racingList.appendChild(warningDiv);
        } else {
            const noModelOption = document.createElement('option');
            noModelOption.textContent = "Chưa có model nào được cấu hình hoặc không có model phù hợp với gói của bạn";
            noModelOption.disabled = true;
            defaultSelect.appendChild(noModelOption);
            
            racingList.innerHTML = '<p class="text-sm text-muted italic">Vui lòng thêm và cấu hình API Key cho ít nhất 2 model, hoặc nâng cấp gói để sử dụng các model nâng cao.</p>';
            console.warn('[Setting] No models available after filtering');
            return;
        }
    }
    
    // Populate Default Selector
    filteredModels.forEach(model => {
        const option = document.createElement('option');
        option.value = model.fullModelId;
        option.textContent = `${model.providerName} - ${model.displayName || model.id}`;
        defaultSelect.appendChild(option);
    });
    
    // Restore selected default model
    chrome.storage.local.get('aiProvider', (data) => {
        if (data.aiProvider && filteredModels.some(m => m.fullModelId === data.aiProvider)) {
            defaultSelect.value = data.aiProvider;
        } else if (filteredModels.length > 0) {
            defaultSelect.value = filteredModels[0].fullModelId;
        }
    });
    
    // Populate Racing Checkboxes - Use async/await instead of callback
    const raceData = await chrome.storage.local.get('raceSettings');
    const selectedModels = raceData.raceSettings?.models || [];
    
    console.log('[Setting] Populating racing checkboxes:', filteredModels.length, 'models');
    
    filteredModels.forEach(model => {
        const div = document.createElement('div');
        div.className = 'checkbox-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `race-${model.fullModelId}`;
        checkbox.value = model.fullModelId;
        checkbox.checked = selectedModels.includes(model.fullModelId);
        
        // Event listener to save changes immediately
        checkbox.addEventListener('change', async () => {
            await updateRacingConfig();
            showToast('Đã lưu cài đặt', 'success');
        });
        
        const label = document.createElement('label');
        label.htmlFor = `race-${model.fullModelId}`;
        label.textContent = `${model.providerName} - ${model.displayName || model.id}`;
        
        div.appendChild(checkbox);
        div.appendChild(label);
        racingList.appendChild(div);
    });
    
    console.log('[Setting] Racing checkboxes populated:', racingList.children.length);
}

async function updateRacingConfig() {
    const checkboxes = document.querySelectorAll('#racing-models-list input[type="checkbox"]');
    const selected = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
    
    const data = await chrome.storage.local.get('raceSettings');
    const currentSettings = data.raceSettings || {};
    
    await chrome.storage.local.set({
        raceSettings: {
            ...currentSettings,
            models: selected
        }
    });
    console.log('Updated racing models:', selected);
}

function setupAIProviderConfig() {
    const modal = document.getElementById('modal-provider-config');
    const title = document.getElementById('modal-title-provider');
    const apiKeyInput = document.getElementById('input-api-key');
    const baseUrlInput = document.getElementById('input-base-url');
    const saveBtn = document.getElementById('btn-save-provider');
    const closeBtns = document.querySelectorAll('.close-modal');
    
    // Model management fields
    const modelIdInput = document.getElementById('input-model-id');
    const modelNameInput = document.getElementById('input-model-name');
    const addModelBtn = document.getElementById('btn-add-model');
    const modelsListContainer = document.getElementById('provider-models-list');

    // Open Modal Handlers
    document.querySelectorAll('[data-action="config-provider"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const providerId = btn.getAttribute('data-provider');
            currentProviderId = providerId;
            
            const config = apiManager.getProvider(providerId);
            if (config) {
                title.textContent = `Cấu hình ${config.name || providerId}`;
                apiKeyInput.value = config.apiKey || '';
                baseUrlInput.value = config.baseURL || apiManager.getDefaultBaseURL(providerId) || '';
                
                // Clear model inputs
                if(modelIdInput) modelIdInput.value = '';
                if(modelNameInput) modelNameInput.value = '';
                
                // Render existing models
                renderProviderModelsList(config);
                
                // Force display with inline style
                modal.style.display = 'flex';
            }
        });
    });

    // Render list of models in modal
    function renderProviderModelsList(config) {
        if (!modelsListContainer) return;
        modelsListContainer.innerHTML = '';
        
        if (config.models && config.models.length > 0) {
            const listTitle = document.createElement('h5');
            listTitle.className = 'text-xs font-semibold text-muted mb-xs uppercase mt-sm';
            listTitle.textContent = 'Danh sách Model';
            modelsListContainer.appendChild(listTitle);
            
            config.models.forEach(model => {
                const item = document.createElement('div');
                item.className = 'd-flex justify-between align-center p-xs border rounded-sm mb-xs bg-secondary';
                item.innerHTML = `
                    <span class="text-sm">${model.displayName || model.id} <span class="text-xs text-muted">(${model.id})</span></span>
                    <button class="btn-icon-only text-danger delete-model-btn" data-id="${model.id}">✕</button>
                `;
                modelsListContainer.appendChild(item);
            });
            
            // Add delete handlers
            modelsListContainer.querySelectorAll('.delete-model-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const modelId = e.target.getAttribute('data-id');
                    if(confirm(`Xóa model ${modelId}?`)) {
                        await apiManager.deleteModelFromProvider(currentProviderId, modelId);
                        // Refresh list
                        const updatedConfig = apiManager.getProvider(currentProviderId);
                        renderProviderModelsList(updatedConfig);
                        populateModelSelectors(); // Refresh main page selectors
                        
                        // Trigger event for PDF Chat model selector
                        if (currentProviderId === 'googleai') {
                            document.dispatchEvent(new CustomEvent('pdfModelsUpdated'));
                        }
                    }
                });
            });
        }
    }

    // Add Model Handler
    if (addModelBtn) {
        addModelBtn.addEventListener('click', async () => {
            if (!currentProviderId) return;
            const modelId = modelIdInput.value.trim();
            const modelName = modelNameInput.value.trim() || modelId;
            
            if (!modelId) {
                alert('Vui lòng nhập Model ID');
                return;
            }
            
            await apiManager.addModelToProvider(currentProviderId, {
                id: modelId,
                displayName: modelName
            });
            
            // Clear inputs
            modelIdInput.value = '';
            modelNameInput.value = '';
            
            // Refresh list
            const updatedConfig = apiManager.getProvider(currentProviderId);
            renderProviderModelsList(updatedConfig);
            populateModelSelectors(); // Refresh main page selectors
            
            // Trigger event for PDF Chat model selector
            if (currentProviderId === 'googleai') {
                document.dispatchEvent(new CustomEvent('pdfModelsUpdated'));
            }
        });
    }

    // Close Modal Handlers
    const closeModal = () => {
        modal.style.display = 'none';
        currentProviderId = null;
    };

    closeBtns.forEach(btn => btn.addEventListener('click', closeModal));
    
    // Close on click outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Save Handler
    saveBtn.addEventListener('click', async () => {
        if (!currentProviderId) return;

        const apiKey = apiKeyInput.value.trim();
        const baseURL = baseUrlInput.value.trim();

        apiManager.updateConfig(currentProviderId, {
            apiKey: apiKey,
            baseURL: baseURL
        });

        await apiManager.saveToStorage();
        
        populateModelSelectors(); // Refresh main selectors incase API key changed availability
        showToast('Đã lưu cấu hình thành công!', 'success');
        closeModal();
    });
}

async function setupRacingMode() {
    const toggle = document.getElementById('toggle-racing-mode');
    const container = document.getElementById('racing-config-container');
    const testBtn = document.getElementById('btn-test-racing');
    const resultsDiv = document.getElementById('racing-test-results');
    
    if (!toggle) return;

    // Load state
    try {
        const data = await chrome.storage.local.get('raceSettings');
        if (data.raceSettings && data.raceSettings.enabled) {
            toggle.checked = true;
            if(container) container.classList.remove('d-none');
            // ✅ Ensure models are populated when racing mode is already enabled
            await populateModelSelectors();
        } else {
            toggle.checked = false;
            if(container) container.classList.add('d-none');
        }
    } catch (e) {
        console.error('Error loading racing settings:', e);
    }

    // Change Handler
    toggle.addEventListener('change', async (e) => {
        const enabled = e.target.checked;
        if(container) {
            enabled ? container.classList.remove('d-none') : container.classList.add('d-none');
        }
        
        try {
            const data = await chrome.storage.local.get('raceSettings');
            const raceSettings = data.raceSettings || {};
            
            await chrome.storage.local.set({
                raceSettings: {
                    ...raceSettings,
                    enabled: enabled
                }
            });
            
            // ✅ Repopulate model selectors when racing mode is enabled
            if (enabled) {
                await populateModelSelectors();
            }
            
            showToast('Đã lưu cài đặt', 'success');
        } catch (e) {
            console.error('Error saving racing settings:', e);
            toggle.checked = !enabled;
            showToast('Không thể lưu cài đặt. Vui lòng thử lại.', 'error');
        }
    });
    
    // Racing Test Handler
    if (testBtn) {
        testBtn.addEventListener('click', async () => {
            const checkboxes = document.querySelectorAll('#racing-models-list input[type="checkbox"]:checked');
            const selectedModels = Array.from(checkboxes).map(cb => cb.value);
            
            if (selectedModels.length < 2) {
                alert('Vui lòng chọn ít nhất 2 model để test Racing Mode.');
                return;
            }
            
            testBtn.disabled = true;
            testBtn.textContent = 'Đang test...';
            resultsDiv.innerHTML = '<div class="loading-spinner"></div>';
            
            try {
                // Import runRace from api.js is not enough because it expects specific params.
                // We should use apiManager.handleRaceTest if available or simulate it.
                // Since we are in setting.js, we might not have full environment.
                // Let's use a simple ping to each model.
                
                // Since apiManager.handleRaceTest is available via export, let's try to import it or implement simple version
                // But `apiManager` instance is what we have.
                
                // Quick implementation of parallel testing
                const results = await Promise.all(selectedModels.map(async (fullModelId) => {
                    const startTime = performance.now();
                    try {
                        // Use apiManager to test connection
                        const [providerId, modelId] = fullModelId.split('/');
                        const config = apiManager.getProvider(providerId);
                        const res = await apiManager.testConnection({ ...config, model: modelId });
                        const duration = Math.round(performance.now() - startTime);
                        return { id: fullModelId, success: res.success, time: duration, msg: res.message };
                    } catch (e) {
                        return { id: fullModelId, success: false, time: 0, msg: e.message };
                    }
                }));
                
                // Render results
                resultsDiv.innerHTML = '';
                results.sort((a, b) => a.time - b.time); // Sort by speed
                
                results.forEach(res => {
                    const div = document.createElement('div');
                    div.className = `d-flex justify-between text-sm p-xs mb-xs border-b ${res.success ? 'text-success' : 'text-danger'}`;
                    div.innerHTML = `
                        <span>${res.id}</span>
                        <span>${res.success ? `${res.time}ms` : 'Error'}</span>
                    `;
                    resultsDiv.appendChild(div);
                });
                
            } catch (e) {
                console.error('Race test failed', e);
                resultsDiv.textContent = 'Lỗi khi test: ' + e.message;
            } finally {
                testBtn.disabled = false;
                testBtn.textContent = 'Test Racing';
            }
        });
    }
}

function setupContextMenuSettings() {
    const contextMenuToggle = document.getElementById('toggle-context-menu');
    if (contextMenuToggle) {
        chrome.storage.local.get('contextMenuSettings', data => {
            const settings = data.contextMenuSettings || {};
            contextMenuToggle.checked = settings.enabled !== false;
        });

        contextMenuToggle.addEventListener('change', e => {
            const enabled = e.target.checked;
            chrome.storage.local.get('contextMenuSettings', data => {
                const settings = data.contextMenuSettings || {};
                settings.enabled = enabled;
                chrome.storage.local.set({ contextMenuSettings: settings }, () => {
                    showToast('Đã lưu cài đặt', 'success');
                });
            });
        });
    }
}

function setupTranslateSettings() {
    // Populate target language dropdown with 8 languages
    const targetLangSelect = document.getElementById('select-target-lang');
    if (targetLangSelect) {
        // Clear existing options
        targetLangSelect.innerHTML = '';
        
        // Add 8 languages from constants
        TRANSLATION_LANGUAGES.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang.value;
            option.textContent = lang.label;
            targetLangSelect.appendChild(option);
        });
        
        // Load saved default target language
        chrome.storage.local.get('translateSettings', data => {
            const settings = data.translateSettings || {};
            const savedLang = settings.defaultTargetLanguage || settings.targetLang || 'vi';
            
            // Validate saved language is in our list
            if (TRANSLATION_LANGUAGES.some(l => l.value === savedLang)) {
                targetLangSelect.value = savedLang;
            } else {
                targetLangSelect.value = 'vi'; // Fallback
            }
        });

        targetLangSelect.addEventListener('change', e => {
            const lang = e.target.value;
            chrome.storage.local.get('translateSettings', data => {
                const settings = data.translateSettings || {};
                // Update to use defaultTargetLanguage
                settings.defaultTargetLanguage = lang;
                // Keep backward compatibility
                settings.targetLang = lang;
                chrome.storage.local.set({ translateSettings: settings }, () => {
                    showToast('Đã lưu cài đặt', 'success');
                });
            });
        });
    }

    const quickTranslateToggle = document.getElementById('toggle-quick-translate-popup');
    if (quickTranslateToggle) {
        chrome.storage.local.get('translateSettings', data => {
            const settings = data.translateSettings || {};
            quickTranslateToggle.checked = settings.quickPopupEnabled !== false; 
        });

        quickTranslateToggle.addEventListener('change', e => {
            const enabled = e.target.checked;
            chrome.storage.local.get('translateSettings', data => {
                const settings = data.translateSettings || {};
                settings.quickPopupEnabled = enabled;
                chrome.storage.local.set({ translateSettings: settings }, () => {
                    showToast('Đã lưu cài đặt', 'success');
                });
            });
        });
    }
}

function setupWebAssistantSettings() {
    const gmailSettings = [
        { id: 'toggle-gmail-quick-actions-bar', key: 'quickActionsBarEnabled' },
        { id: 'toggle-gmail-summarizer', key: 'summarizerEnabled' },
        { id: 'toggle-gmail-event-parser', key: 'eventParserEnabled' }
    ];

    gmailSettings.forEach(setting => {
        const toggle = document.getElementById(setting.id);
        if (toggle) {
            chrome.storage.local.get('gmailSettings', data => {
                const settings = data.gmailSettings || {};
                toggle.checked = settings[setting.key] !== false;
            });

            toggle.addEventListener('change', e => {
                const enabled = e.target.checked;
                chrome.storage.local.get('gmailSettings', data => {
                    const settings = data.gmailSettings || {};
                    settings[setting.key] = enabled;
                    chrome.storage.local.set({ gmailSettings: settings }, () => {
                        showToast('Đã lưu cài đặt', 'success');
                    });
                });
            });
        }
    });
    
    const meetingSettings = [
        { id: 'toggle-meeting-enable-meet', key: 'meetEnabled' },
        { id: 'toggle-meeting-enable-teams', key: 'teamsEnabled' },
    ];

    meetingSettings.forEach(setting => {
        const toggle = document.getElementById(setting.id);
        if (toggle) {
            chrome.storage.local.get('meetingSettings', data => {
                const settings = data.meetingSettings || {};
                toggle.checked = settings[setting.key] !== false;
            });

            toggle.addEventListener('change', e => {
                const enabled = e.target.checked;
                chrome.storage.local.get('meetingSettings', data => {
                    const settings = data.meetingSettings || {};
                    settings[setting.key] = enabled;
                    chrome.storage.local.set({ meetingSettings: settings }, () => {
                        showToast('Đã lưu cài đặt', 'success');
                    });
                });
            });
        }
    });

    const styleSelect = document.getElementById('select-meeting-translation-style');
    if (styleSelect) {
        chrome.storage.local.get('meetingSettings', data => {
            const settings = data.meetingSettings || {};
            styleSelect.value = settings.translationStyle || 'standard';
        });

        styleSelect.addEventListener('change', e => {
            const style = e.target.value;
            chrome.storage.local.get('meetingSettings', data => {
                const settings = data.meetingSettings || {};
                settings.translationStyle = style;
                chrome.storage.local.set({ meetingSettings: settings }, () => {
                    showToast('Đã lưu cài đặt', 'success');
                });
            });
        });
    }

    const screenshotFormatSelect = document.getElementById('select-screenshot-format');
    if (screenshotFormatSelect) {
        chrome.storage.local.get('mediaSettings', data => {
            screenshotFormatSelect.value = data.mediaSettings?.screenshotFormat || 'png';
        });
        screenshotFormatSelect.addEventListener('change', e => {
            chrome.storage.local.get('mediaSettings', data => {
                const settings = data.mediaSettings || {};
                settings.screenshotFormat = e.target.value;
                chrome.storage.local.set({ mediaSettings: settings }, () => {
                    showToast('Đã lưu cài đặt', 'success');
                });
            });
        });
    }

    const videoQualitySelect = document.getElementById('select-video-quality');
    if (videoQualitySelect) {
        chrome.storage.local.get('recorderSettings', data => { 
            videoQualitySelect.value = data.recorderSettings?.videoQuality || '1080p';
        });
        videoQualitySelect.addEventListener('change', e => {
            chrome.storage.local.get('recorderSettings', data => {
                const settings = data.recorderSettings || {};
                settings.videoQuality = e.target.value;
                chrome.storage.local.set({ recorderSettings: settings }, () => {
                    showToast('Đã lưu cài đặt', 'success');
                });
            });
        });
    }
}

function setupSearch() {
    const searchInput = document.getElementById('settings-search-input');
    if (!searchInput) return;

    // Set placeholder using i18n
    if (window.Lang) {
        searchInput.placeholder = window.Lang.get('searchPlaceholder');
    }

    // Get all searchable elements
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    const sections = document.querySelectorAll('.setting-section');

    // Map of search terms to their corresponding nav items and sections
    const searchIndex = new Map();
    
    navItems.forEach(item => {
        const targetId = item.getAttribute('data-target');
        const text = item.textContent.trim().toLowerCase();
        const i18nKey = item.querySelector('[data-i18n]')?.getAttribute('data-i18n');
        const translatedText = window.Lang && i18nKey ? window.Lang.get(i18nKey).toLowerCase() : text;
        
        searchIndex.set(item, {
            targetId: targetId,
            keywords: [text, translatedText, i18nKey].filter(Boolean)
        });
    });

    // Search handler
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim().toLowerCase();
        
        searchTimeout = setTimeout(() => {
            performSearch(query, navItems, sections, searchIndex);
        }, 200); // Debounce 200ms
    });

    // Clear search on Escape
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            performSearch('', navItems, sections, searchIndex);
            searchInput.blur();
        }
    });
}

function performSearch(query, navItems, sections, searchIndex) {
    const hasQuery = query.length > 0;

    if (!hasQuery) {
        // Show all items
        navItems.forEach(item => {
            item.style.display = '';
        });
        // Restore active section visibility
        const activeNav = document.querySelector('.sidebar-nav .nav-item.active');
        if (activeNav) {
            const targetId = activeNav.getAttribute('data-target');
            sections.forEach(section => {
                section.classList.add('d-none');
                section.classList.remove('active');
                if (section.id === `section-${targetId}`) {
                    section.classList.remove('d-none');
                    section.classList.add('active');
                }
            });
        }
        return;
    }

    // Search through nav items and sections
    const matchingSectionIds = new Set();

    // Search in nav items and sections
    navItems.forEach(item => {
        const indexData = searchIndex.get(item);
        if (!indexData) return;

        let matches = indexData.keywords.some(keyword => 
            keyword && keyword.includes(query)
        );

        // Also search in section content
        const targetSection = document.getElementById(`section-${indexData.targetId}`);
        if (targetSection && !matches) {
            const sectionText = targetSection.textContent.toLowerCase();
            if (sectionText.includes(query)) {
                matches = true;
            }
        }

        // Show/hide nav item
        item.style.display = matches ? '' : 'none';
        
        if (matches) {
            matchingSectionIds.add(indexData.targetId);
        }
    });

    // Show matching sections, hide others
    let hasVisibleSection = false;
    sections.forEach(section => {
        const sectionId = section.id.replace('section-', '');
        if (matchingSectionIds.has(sectionId)) {
            section.classList.remove('d-none');
            section.classList.add('active');
            hasVisibleSection = true;
        } else {
            section.classList.add('d-none');
            section.classList.remove('active');
        }
    });

    // If search has results, activate first matching nav item
    if (hasQuery && matchingSectionIds.size > 0) {
        const firstMatchId = Array.from(matchingSectionIds)[0];
        
        // Update active nav item
        navItems.forEach(item => item.classList.remove('active'));
        const correspondingNav = document.querySelector(`[data-target="${firstMatchId}"]`);
        if (correspondingNav) {
            correspondingNav.classList.add('active');
        }
    }
}
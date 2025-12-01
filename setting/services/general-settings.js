// setting/services/general-settings.js - General settings service

import { showToast } from '../modules/core/toast.js';

let currentTheme = 'light';

export function getCurrentTheme() {
  return currentTheme;
}

export function setCurrentTheme(theme) {
  currentTheme = theme;
}

export async function loadGeneralSettings() {
  try {
    const data = await chrome.storage.local.get([
      'theme', 'showFloatingIcon', 'allowedFileFormats'
    ]);
    
    console.log("[Setting] Loaded general settings:", data);
    
    // Apply theme
    currentTheme = data.theme === 'dark' ? 'dark' : 'light';
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) darkModeToggle.checked = (currentTheme === 'dark');
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    // Apply floating icon setting
    if (data.showFloatingIcon !== undefined) {
      const floatingIconToggle = document.getElementById('showFloatingIcon');
      if (floatingIconToggle) floatingIconToggle.checked = data.showFloatingIcon;
    }
    
    // Load allowed file formats
    const allowedFormats = data.allowedFileFormats || ['image/*'];
    const formatCheckboxes = document.querySelectorAll('#fileFormatCheckboxes input[name="allowedFileFormat"]');
    formatCheckboxes.forEach(checkbox => {
      checkbox.checked = allowedFormats.includes(checkbox.value);
    });
  } catch (error) {
    console.error('[GeneralSettings] Failed to load:', error);
  }
}

export async function saveGeneralSettings() {
  const allowedFileFormats = Array.from(
    document.querySelectorAll('#fileFormatCheckboxes input[name="allowedFileFormat"]:checked')
  ).map(cb => cb.value);
  
  const settings = {
    showFloatingIcon: document.getElementById('showFloatingIcon')?.checked ?? true,
    allowedFileFormats: allowedFileFormats.length > 0 ? allowedFileFormats : ['image/*']
  };
  
  try {
    // We only set the relevant settings, theme is handled separately.
    await chrome.storage.local.set(settings);
    // No toast for automatic saves. A subtle indicator could be added later if needed.
  } catch (error) {
    console.error('[GeneralSettings] Failed to save:', error);
    showToast(window.Lang?.get('errorSaveGeneral') || 'Failed to save settings', 'error');
  }
}

export async function applyAndSaveTheme(themeValue) {
  document.documentElement.setAttribute('data-theme', themeValue);
  currentTheme = themeValue;
  try {
    // This function should only be responsible for saving the theme.
    await chrome.storage.local.set({ theme: themeValue });
  } catch (error) {
    console.error('[GeneralSettings] Failed to save theme:', error);
    showToast(window.Lang?.get('errorSaveTheme') || 'Failed to save theme', 'error');
  }
}


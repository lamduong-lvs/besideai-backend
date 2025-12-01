// setting/services/settings-loader.js - Load all settings from storage

import { loadGeneralSettings } from './general-settings.js';
import { loadModelSettings } from './model-settings.js';
import { loadServerSettings } from './server-settings.js';
import { initLanguageSelector } from '../modules/components/language-selector.js';

export async function loadAllSettings() {
  try {
    console.log("[Setting] Loading all settings...");
    await Promise.all([
      loadGeneralSettings(),
      loadModelSettings(),
      loadServerSettings()
    ]);
    
    // Initialize language selector after settings are loaded
    initLanguageSelector();
    
    console.log("[Setting] All settings loaded successfully");
  } catch (error) {
    console.error('[SettingsLoader] Failed to load settings:', error);
  }
}

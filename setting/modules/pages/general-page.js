// setting/modules/pages/general-page.js - General settings page

import { saveGeneralSettings, applyAndSaveTheme } from '../../services/general-settings.js';

export function initGeneralPage() {
  setupDarkModeToggle();
  setupAutoSaveListeners();
}

function setupDarkModeToggle() {
  const darkModeToggle = document.getElementById('darkModeToggle');
  darkModeToggle?.addEventListener('change', (e) => {
    applyAndSaveTheme(e.target.checked ? 'dark' : 'light');
  });
}

function setupAutoSaveListeners() {
  document.getElementById('showFloatingIcon')?.addEventListener('change', saveGeneralSettings);

  const fileFormatCheckboxes = document.querySelectorAll('#fileFormatCheckboxes input[name="allowedFileFormat"]');
  fileFormatCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', saveGeneralSettings);
  });
}


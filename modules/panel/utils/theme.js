// theme.js
// Theme management utilities

export function updatePanelThemeUI(theme) {
  const toggle = document.getElementById('darkModeTogglePanel');
  if (toggle) {
    // If theme is not provided, get current theme from themeManager
    if (!theme && window.themeManager) {
      theme = window.themeManager.currentTheme;
    }
    toggle.checked = (theme === 'dark');
  }
}


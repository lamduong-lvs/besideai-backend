// setting/modules/core/extension-info.js - Extension name and version

export function initExtensionInfo() {
  try {
    const manifest = chrome.runtime.getManifest();
    const extensionName = manifest.name || 'Extension';
    const extensionVersion = manifest.version || '1.0.0';
    
    const nameElement = document.getElementById('extension-name');
    const versionElement = document.getElementById('extension-version');
    
    if (nameElement) {
      nameElement.textContent = extensionName;
    }
    if (versionElement) {
      versionElement.textContent = `v${extensionVersion}`;
    }
  } catch (error) {
    console.error('[ExtensionInfo] Failed to load extension info:', error);
  }
}


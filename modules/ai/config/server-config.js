/**
 * Server Configuration
 * Manages server-side execution settings
 */

const DEFAULT_SERVER_CONFIG = {
  enabled: false,
  serverUrl: '',
  timeout: 60000, // 60 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  fallbackToLocal: true // Fallback to local if server fails
};

/**
 * Load server configuration from storage
 */
export async function loadServerConfig() {
  try {
    const data = await chrome.storage.local.get(['aiServerConfig']);
    return {
      ...DEFAULT_SERVER_CONFIG,
      ...(data.aiServerConfig || {})
    };
  } catch (error) {
    console.error('[ServerConfig] Failed to load config:', error);
    return DEFAULT_SERVER_CONFIG;
  }
}

/**
 * Save server configuration to storage
 */
export async function saveServerConfig(config) {
  try {
    await chrome.storage.local.set({
      aiServerConfig: {
        ...DEFAULT_SERVER_CONFIG,
        ...config
      }
    });
    return true;
  } catch (error) {
    console.error('[ServerConfig] Failed to save config:', error);
    return false;
  }
}

/**
 * Validate server URL
 */
export function validateServerUrl(url) {
  if (!url) return { valid: false, error: 'Server URL is required' };
  
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: 'Server URL must use http or https protocol' };
    }
    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid server URL format' };
  }
}

/**
 * Test server connection
 */
export async function testServerConnection(serverUrl, timeout = 5000) {
  if (!serverUrl) {
    return { success: false, error: 'Server URL is required' };
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(`${serverUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      return { success: true, message: 'Server connection successful' };
    } else {
      return { 
        success: false, 
        error: `Server returned status ${response.status}` 
      };
    }
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      return { success: false, error: 'Connection timeout' };
    }
    
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      return { success: false, error: 'Cannot connect to server. Check URL and network connection.' };
    }
    
    return { success: false, error: error.message || 'Connection failed' };
  }
}

export { DEFAULT_SERVER_CONFIG };


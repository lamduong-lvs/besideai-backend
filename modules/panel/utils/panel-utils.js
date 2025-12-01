// panel-utils.js
// Wrapper to re-export utils for panel modules
// This helps ensure consistent imports across panel modules

// Import and re-export to ensure proper module resolution
import { apiManager } from '../../../utils/api.js';
import { themeManager } from '../../../utils/theme.js';
import { storageManager } from '../../../utils/storage.js';
import { enhancedStorageManager } from '../../../utils/storage-enhanced.js';

// Re-export
export { apiManager, themeManager, storageManager, enhancedStorageManager };


/**
 * Google Meet Utilities
 * Các helper functions dùng chung
 */

/**
 * DOM Utilities
 */
const DOMUtils = {
    /**
     * Wait for element to appear
     */
    waitForElement(selector, timeout = 5000) {
        return new Promise((resolve, reject) => {
            // Check if element already exists
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            // Setup observer
            const observer = new MutationObserver((mutations, obs) => {
                const element = document.querySelector(selector);
                if (element) {
                    obs.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            // Timeout
            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Element ${selector} not found within ${timeout}ms`));
            }, timeout);
        });
    },

    /**
     * Wait for multiple elements
     */
    async waitForElements(selectors, timeout = 5000) {
        const promises = selectors.map(selector => 
            this.waitForElement(selector, timeout).catch(() => null)
        );
        return await Promise.all(promises);
    },

    /**
     * Check if element exists
     */
    exists(selector) {
        return document.querySelector(selector) !== null;
    },

    /**
     * Get element or wait for it
     */
    async getElement(selector, timeout = 5000) {
        const element = document.querySelector(selector);
        if (element) return element;
        return await this.waitForElement(selector, timeout);
    },

    /**
     * Remove element if exists
     */
    remove(selector) {
        const element = document.querySelector(selector);
        if (element) {
            element.remove();
            return true;
        }
        return false;
    },

    /**
     * Create element with attributes
     */
    createElement(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else if (key === 'class' || key === 'className') {
                element.className = value;
            } else {
                element.setAttribute(key, value);
            }
        });

        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else {
                element.appendChild(child);
            }
        });

        return element;
    },

    /**
     * Inject HTML
     */
    injectHTML(html, parent = document.body) {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        const element = wrapper.firstElementChild;
        parent.appendChild(element);
        return element;
    }
};

/**
 * String Utilities
 */
const StringUtils = {
    /**
     * Truncate string
     */
    truncate(str, maxLength, ellipsis = '...') {
        if (str.length <= maxLength) return str;
        return str.substring(0, maxLength - ellipsis.length) + ellipsis;
    },

    /**
     * Sanitize string for filename
     */
    sanitizeFilename(filename) {
        return filename.replace(/[^a-z0-9_\-\.]/gi, '_');
    },

    /**
     * Generate timestamp string
     */
    timestamp(format = 'datetime') {
        const now = new Date();
        
        if (format === 'datetime') {
            return now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
        } else if (format === 'date') {
            return now.toISOString().split('T')[0];
        } else if (format === 'time') {
            return now.toTimeString().split(' ')[0].replace(/:/g, '-');
        } else if (format === 'unix') {
            return now.getTime().toString();
        }
        
        return now.toISOString();
    },

    /**
     * Format duration
     */
    formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
        } else {
            return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
        }
    },

    /**
     * Hash string (simple)
     */
    hash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    },

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

/**
 * Async Utilities
 */
const AsyncUtils = {
    /**
     * Sleep/delay
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Debounce function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Throttle function
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Retry function
     */
    async retry(fn, options = {}) {
        const {
            maxRetries = 3,
            delay = 1000,
            onRetry = null
        } = options;

        let lastError;

        for (let i = 0; i < maxRetries; i++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                
                if (onRetry) {
                    onRetry(i + 1, error);
                }

                if (i < maxRetries - 1) {
                    await this.sleep(delay * (i + 1));
                }
            }
        }

        throw lastError;
    },

    /**
     * Timeout promise
     */
    timeout(promise, ms, timeoutError = 'Operation timed out') {
        return Promise.race([
            promise,
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error(timeoutError)), ms)
            )
        ]);
    }
};

/**
 * Object Utilities
 */
const ObjectUtils = {
    /**
     * Deep clone
     */
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    /**
     * Deep merge
     */
    deepMerge(target, source) {
        const output = { ...target };
        
        if (this.isObject(target) && this.isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this.isObject(source[key])) {
                    if (!(key in target)) {
                        output[key] = source[key];
                    } else {
                        output[key] = this.deepMerge(target[key], source[key]);
                    }
                } else {
                    output[key] = source[key];
                }
            });
        }
        
        return output;
    },

    /**
     * Check if object
     */
    isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    },

    /**
     * Get nested property
     */
    get(obj, path, defaultValue = undefined) {
        const keys = path.split('.');
        let result = obj;

        for (const key of keys) {
            if (result === null || result === undefined) {
                return defaultValue;
            }
            result = result[key];
        }

        return result !== undefined ? result : defaultValue;
    },

    /**
     * Set nested property
     */
    set(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        let target = obj;

        for (const key of keys) {
            if (!(key in target) || !this.isObject(target[key])) {
                target[key] = {};
            }
            target = target[key];
        }

        target[lastKey] = value;
        return obj;
    }
};

/**
 * Array Utilities
 */
const ArrayUtils = {
    /**
     * Chunk array
     */
    chunk(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    },

    /**
     * Unique array
     */
    unique(array) {
        return [...new Set(array)];
    },

    /**
     * Group by
     */
    groupBy(array, key) {
        return array.reduce((result, item) => {
            const group = typeof key === 'function' ? key(item) : item[key];
            (result[group] = result[group] || []).push(item);
            return result;
        }, {});
    },

    /**
     * Sort by
     */
    sortBy(array, key, order = 'asc') {
        return [...array].sort((a, b) => {
            const aVal = typeof key === 'function' ? key(a) : a[key];
            const bVal = typeof key === 'function' ? key(b) : b[key];
            
            if (aVal < bVal) return order === 'asc' ? -1 : 1;
            if (aVal > bVal) return order === 'asc' ? 1 : -1;
            return 0;
        });
    }
};

/**
 * URL Utilities
 */
const URLUtils = {
    /**
     * Parse query string
     */
    parseQuery(queryString = window.location.search) {
        const params = {};
        const query = queryString.startsWith('?') ? queryString.slice(1) : queryString;
        
        query.split('&').forEach(param => {
            const [key, value] = param.split('=');
            if (key) {
                params[decodeURIComponent(key)] = decodeURIComponent(value || '');
            }
        });
        
        return params;
    },

    /**
     * Build query string
     */
    buildQuery(params) {
        return Object.entries(params)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');
    },

    /**
     * Get domain from URL
     */
    getDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch {
            return '';
        }
    }
};

/**
 * File Utilities
 */
const FileUtils = {
    /**
     * Format file size
     */
    formatSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    },

    /**
     * Get file extension
     */
    getExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    },

    /**
     * Download blob
     */
    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    },

    /**
     * Read file as text
     */
    readAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
};

/**
 * Color Utilities
 */
const ColorUtils = {
    /**
     * Check if color is dark
     */
    isDark(color) {
        const rgb = this.hexToRgb(color);
        if (!rgb) return false;
        
        const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
        return brightness < 128;
    },

    /**
     * Hex to RGB
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    },

    /**
     * RGB to Hex
     */
    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
};

/**
 * Validation Utilities
 */
const ValidationUtils = {
    /**
     * Validate email
     */
    isEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

    /**
     * Validate URL
     */
    isUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Validate meeting ID
     */
    isMeetingId(id) {
        return /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(id);
    }
};

// Export all utilities
const MeetUtils = {
    DOM: DOMUtils,
    String: StringUtils,
    Async: AsyncUtils,
    Object: ObjectUtils,
    Array: ArrayUtils,
    URL: URLUtils,
    File: FileUtils,
    Color: ColorUtils,
    Validation: ValidationUtils
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MeetUtils;
}

// Make available globally
window.MeetUtils = MeetUtils;
/**
 * Shadow DOM Helper
 * Utility để tạo Shadow DOM containers với CSS isolation
 * Đảm bảo CSS của Extension không bị ảnh hưởng bởi CSS của trang web và ngược lại
 */

/**
 * Lấy tất cả CSS variables từ parent document
 * @returns {Object} Object chứa tất cả CSS variables
 */
function getAllCSSVariables() {
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    const variables = {};
    
    // Danh sách các CSS variables cần inject
    const variableNames = [
        // Colors
        '--color-primary', '--color-primary-dark', '--color-primary-hover', '--color-primary-alpha', '--color-primary-light',
        '--color-success', '--color-error', '--color-warning', '--color-info',
        '--bg-success', '--bg-error', '--bg-warning', '--bg-info',
        '--color-delete', '--color-delete-hover', '--color-link',
        
        // Spacing
        '--spacing-xxs', '--spacing-xs', '--spacing-sm', '--spacing-sm-md', '--spacing-md-sm',
        '--spacing-md', '--spacing-md-lg', '--spacing-lg', '--spacing-lg-xl', '--spacing-xl', '--spacing-2xl',
        
        // Border Radius
        '--radius-xs', '--radius-sm', '--radius-md', '--radius-lg', '--radius-xl', '--radius-2xl', '--radius-3xl', '--radius-full',
        
        // Shadows
        '--shadow-xs', '--shadow-sm', '--shadow-sm-light', '--shadow-md', '--shadow-md-light', '--shadow-md-dark',
        '--shadow-lg', '--shadow-lg-light', '--shadow-xl', '--shadow-xl-dark',
        
        // Transitions
        '--transition-fast', '--transition-normal', '--transition-base', '--transition-slow', '--transition-slower',
        
        // Typography
        '--font-family', '--font-family-google', '--font-family-mono',
        '--font-xxs', '--font-xs', '--font-sm', '--font-sm-md', '--font-base', '--font-base-md',
        '--font-lg', '--font-xl-md', '--font-xl', '--font-2xl', '--font-2xl-lg', '--font-3xl', '--font-4xl', '--font-5xl',
        '--line-height-tight', '--line-height-normal', '--line-height-relaxed',
        
        // Border Width
        '--border-width-thin', '--border-width-base', '--border-width-thick',
        
        // Z-index
        '--z-dropdown', '--z-sticky', '--z-fixed', '--z-modal-backdrop', '--z-modal', '--z-popover', '--z-tooltip'
    ];
    
    variableNames.forEach(name => {
        const value = computedStyle.getPropertyValue(name).trim();
        if (value) {
            variables[name] = value;
        }
    });
    
    return variables;
}

/**
 * Tạo CSS variables style cho Shadow DOM
 * @param {Object} variables - Object chứa CSS variables
 * @returns {string} CSS string
 */
function generateCSSVariablesStyle(variables) {
    let css = ':host {\n';
    Object.entries(variables).forEach(([name, value]) => {
        css += `  ${name}: ${value};\n`;
    });
    css += '}\n';
    return css;
}

/**
 * Tạo Shadow DOM container với CSS isolation
 * @param {Object} options - Configuration options
 * @param {string} options.id - ID cho host element
 * @param {string} options.className - Class name cho host element
 * @param {string} options.mode - Shadow DOM mode ('open' hoặc 'closed'), default: 'closed'
 * @param {string[]} options.stylesheets - Array of CSS file paths (relative to extension root)
 * @param {boolean} options.injectCSSVariables - Có inject CSS variables từ parent không, default: true
 * @param {Object} options.position - Position options { top, left, right, bottom, transform }
 * @returns {Object} { host, shadowRoot, container }
 */
function createShadowContainer(options = {}) {
    const {
        id,
        className = 'extension-shadow-container',
        mode = 'closed', // 'open' hoặc 'closed'
        stylesheets = [],
        injectCSSVariables = true,
        position = {}
    } = options;

    // Kiểm tra nếu container đã tồn tại
    if (id && document.getElementById(id)) {
        const existingHost = document.getElementById(id);
        if (existingHost.shadowRoot) {
            return {
                host: existingHost,
                shadowRoot: existingHost.shadowRoot,
                container: existingHost.shadowRoot.querySelector('.shadow-content-container')
            };
        }
    }

    // Tạo host element
    const host = document.createElement('div');
    if (id) host.id = id;
    host.className = className;
    
    // Set position styles
    const positionStyles = {
        all: 'initial',
        position: 'fixed',
        zIndex: '2147483647',
        pointerEvents: 'none',
        ...position
    };
    
    let cssText = Object.entries(positionStyles)
        .map(([key, value]) => {
            const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
            return `${cssKey}: ${value};`;
        })
        .join(' ');
    
    host.style.cssText = cssText;

    // Tạo Shadow DOM
    const shadowRoot = host.attachShadow({ mode });
    
    // Inject CSS variables từ parent document (nếu cần)
    if (injectCSSVariables) {
        try {
            const variables = getAllCSSVariables();
            const style = document.createElement('style');
            style.textContent = generateCSSVariablesStyle(variables);
            shadowRoot.appendChild(style);
        } catch (error) {
            console.warn('[ShadowDOM] Failed to inject CSS variables:', error);
        }
    }
    
    // Inject stylesheets vào Shadow DOM
    stylesheets.forEach(sheet => {
        try {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = chrome.runtime.getURL(sheet);
            shadowRoot.appendChild(link);
        } catch (error) {
            console.warn(`[ShadowDOM] Failed to load stylesheet ${sheet}:`, error);
        }
    });

    // Tạo container cho content
    const container = document.createElement('div');
    container.className = 'shadow-content-container';
    container.style.cssText = 'pointer-events: auto;';
    shadowRoot.appendChild(container);

    // Append host vào body
    document.body.appendChild(host);

    return {
        host,
        shadowRoot,
        container
    };
}

/**
 * Sync theme từ parent document vào Shadow DOM
 * @param {ShadowRoot} shadowRoot - Shadow root cần sync theme
 */
function syncThemeToShadow(shadowRoot) {
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    shadowRoot.host.setAttribute('data-theme', theme);
}

/**
 * Setup theme observer cho Shadow DOM
 * @param {ShadowRoot} shadowRoot - Shadow root cần observe theme changes
 */
function setupThemeObserver(shadowRoot) {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
                syncThemeToShadow(shadowRoot);
            }
        });
    });
    
    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
    });
    
    // Sync theme ngay lập tức
    syncThemeToShadow(shadowRoot);
}

// Export functions (nếu dùng ES6 modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createShadowContainer,
        getAllCSSVariables,
        generateCSSVariablesStyle,
        syncThemeToShadow,
        setupThemeObserver
    };
}

// Global functions (cho content scripts)
if (typeof window !== 'undefined') {
    window.createShadowContainer = createShadowContainer;
    window.getAllCSSVariables = getAllCSSVariables;
    window.generateCSSVariablesStyle = generateCSSVariablesStyle;
    window.syncThemeToShadow = syncThemeToShadow;
    window.setupThemeObserver = setupThemeObserver;
}


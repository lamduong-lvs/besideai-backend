/**
 * Unified Tooltip Manager
 * Smart tooltip system with auto-positioning, collision detection, and i18n support
 * 
 * @version 2.0.0
 * @author AI Gmail Assistant Team
 */

class TooltipManager {
  constructor(options = {}) {
    this.options = {
      offset: 8,
      delay: 500,
      maxWidth: 320,
      minWidth: 60,
      arrow: false,
      theme: 'dark',
      position: 'auto', // auto, top, bottom, left, right
      animation: 'fade', // fade, scale, slide
      smartPosition: true,
      collisionDetection: true,
      i18n: true,
      ...options
    };
    
    this.tooltips = new Map();
    this.activeTooltip = null;
    this.hoverTimeout = null;
    this.i18nData = null;
    
    // Bind methods
    this.handleMouseEnter = this.handleMouseEnter.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
    this.handleFocus = this.handleFocus.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
    this.handleScroll = this.handleScroll.bind(this);
    
    this.init();
  }
  
  /**
   * Initialize tooltip manager
   */
  async init() {
    // Load i18n data if enabled
    if (this.options.i18n) {
      await this.loadI18n();
    }
    
    // Auto-discover and attach tooltips
    this.attachAll();
    
    // Setup mutation observer for dynamic elements
    this.observeDOM();
    
    // Handle scroll to hide tooltips
    window.addEventListener('scroll', this.handleScroll, { passive: true });
  }
  
  /**
   * Load i18n translations
   */
  async loadI18n() {
    try {
      // Check if chrome.i18n is available
      if (typeof chrome !== 'undefined' && chrome.i18n) {
        // Extension environment
        const lang = chrome.i18n.getUILanguage().split('-')[0];
        const response = await fetch(chrome.runtime.getURL(`/lang/${lang}.json`));
        this.i18nData = await response.json();
      } else {
        // Web environment - try to load from relative path
        const lang = navigator.language.split('-')[0];
        try {
          const response = await fetch(`/lang/${lang}.json`);
          this.i18nData = await response.json();
        } catch (e) {
          // Fallback to English
          const response = await fetch('/lang/en.json');
          this.i18nData = await response.json();
        }
      }
    } catch (error) {
      console.warn('[TooltipManager] Could not load i18n data:', error);
    }
  }
  
  /**
   * Get translated text
   */
  t(key) {
    if (!this.i18nData) return key;
    
    // Support nested keys like "tooltips.common.save"
    const keys = key.split('.');
    let value = this.i18nData;
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key;
      }
    }
    
    return value || key;
  }
  
  /**
   * Attach tooltip to element
   */
  attach(element, config = {}) {
    if (!element || this.tooltips.has(element)) return;
    
    const tooltipConfig = {
      ...this.options,
      ...config
    };
    
    // Get tooltip content
    let content = config.content || 
                  element.getAttribute('data-tooltip') ||
                  element.getAttribute('data-tooltip-text') ||
                  element.getAttribute('data-i18n-title') ||
                  element.getAttribute('title');
    
    if (!content) return;
    
    // Translate if it's an i18n key
    if (tooltipConfig.i18n && !config.html) {
      content = this.t(content);
    }
    
    // Remove title attribute to prevent native tooltip
    if (element.hasAttribute('title')) {
      element.setAttribute('data-original-title', element.getAttribute('title'));
      element.removeAttribute('title');
    }
    
    // Create tooltip element
    const tooltip = this.createTooltipElement(content, tooltipConfig);
    
    // Store config
    this.tooltips.set(element, {
      element: tooltip,
      config: tooltipConfig,
      content: content
    });
    
    // Attach event listeners
    element.addEventListener('mouseenter', this.handleMouseEnter);
    element.addEventListener('mouseleave', this.handleMouseLeave);
    element.addEventListener('focus', this.handleFocus);
    element.addEventListener('blur', this.handleBlur);
    
    // Mark as initialized
    element.setAttribute('data-tooltip-initialized', 'true');
  }
  
  /**
   * Create tooltip DOM element
   */
  createTooltipElement(content, config) {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    
    if (config.arrow) {
      tooltip.classList.add('with-arrow');
    }
    
    if (config.animation) {
      tooltip.classList.add(`tooltip-${config.animation}`);
    }
    
    if (config.size) {
      tooltip.classList.add(`tooltip-${config.size}`);
    }
    
    if (config.variant) {
      tooltip.classList.add(`tooltip-${config.variant}`);
    }
    
    if (config.html) {
      tooltip.innerHTML = content;
    } else {
      tooltip.textContent = content;
    }
    
    tooltip.style.maxWidth = `${config.maxWidth}px`;
    tooltip.style.minWidth = `${config.minWidth}px`;
    
    return tooltip;
  }
  
  /**
   * Handle mouse enter
   */
  handleMouseEnter(event) {
    const element = event.currentTarget;
    const data = this.tooltips.get(element);
    
    if (!data) return;
    
    clearTimeout(this.hoverTimeout);
    
    this.hoverTimeout = setTimeout(() => {
      this.show(element);
    }, data.config.delay);
  }
  
  /**
   * Handle mouse leave
   */
  handleMouseLeave(event) {
    const element = event.currentTarget;
    
    clearTimeout(this.hoverTimeout);
    this.hide(element);
  }
  
  /**
   * Handle focus (keyboard navigation)
   */
  handleFocus(event) {
    const element = event.currentTarget;
    this.show(element);
  }
  
  /**
   * Handle blur
   */
  handleBlur(event) {
    const element = event.currentTarget;
    this.hide(element);
  }
  
  /**
   * Handle scroll
   */
  handleScroll() {
    if (this.activeTooltip) {
      this.hide(this.activeTooltip);
    }
  }
  
  /**
   * Show tooltip
   */
  show(element) {
    const data = this.tooltips.get(element);
    if (!data) return;
    
    // Hide any active tooltip
    if (this.activeTooltip && this.activeTooltip !== element) {
      this.hide(this.activeTooltip);
    }
    
    const { element: tooltip, config } = data;
    
    // Add tooltip to DOM if not already there
    if (!tooltip.parentElement) {
      document.body.appendChild(tooltip);
    }
    
    // Calculate position
    const position = this.calculatePosition(element, tooltip, config);
    
    // Apply position
    tooltip.style.top = `${position.top}px`;
    tooltip.style.left = `${position.left}px`;
    tooltip.style.right = position.right ? `${position.right}px` : 'auto';
    tooltip.style.bottom = position.bottom ? `${position.bottom}px` : 'auto';
    
    // Add position class
    tooltip.className = tooltip.className.replace(/tooltip-(top|bottom|left|right)/g, '');
    tooltip.classList.add(`tooltip-${position.placement}`);
    
    // Show tooltip
    requestAnimationFrame(() => {
      tooltip.classList.add('show', 'tooltip-show');
    });
    
    this.activeTooltip = element;
  }
  
  /**
   * Hide tooltip
   */
  hide(element) {
    const data = this.tooltips.get(element);
    if (!data) return;
    
    const { element: tooltip } = data;
    
    tooltip.classList.remove('show', 'tooltip-show');
    
    // Remove from DOM after animation
    setTimeout(() => {
      if (tooltip.parentElement && !tooltip.classList.contains('show')) {
        tooltip.parentElement.removeChild(tooltip);
      }
    }, 200);
    
    if (this.activeTooltip === element) {
      this.activeTooltip = null;
    }
  }
  
  /**
   * Calculate optimal tooltip position
   */
  calculatePosition(element, tooltip, config) {
    const elementRect = element.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    
    const offset = config.offset;
    
    // Calculate available space in each direction
    const spaces = {
      top: elementRect.top,
      right: viewportWidth - elementRect.right,
      bottom: viewportHeight - elementRect.bottom,
      left: elementRect.left
    };
    
    // Determine placement
    let placement = config.position;
    
    if (config.smartPosition && placement === 'auto') {
      // Auto-detect best position
      const tooltipHeight = tooltipRect.height || 40; // estimate
      const tooltipWidth = tooltipRect.width || config.maxWidth;
      
      // Priority: top → right → bottom → left
      if (spaces.top >= tooltipHeight + offset) {
        placement = 'top';
      } else if (spaces.right >= tooltipWidth + offset) {
        placement = 'right';
      } else if (spaces.bottom >= tooltipHeight + offset) {
        placement = 'bottom';
      } else if (spaces.left >= tooltipWidth + offset) {
        placement = 'left';
      } else {
        // Fallback: use position with most space
        placement = Object.keys(spaces).reduce((a, b) => 
          spaces[a] > spaces[b] ? a : b
        );
      }
    }
    
    // Calculate position based on placement
    let position = {};
    
    switch (placement) {
      case 'top':
        position = {
          top: elementRect.top + scrollY - tooltipRect.height - offset,
          left: elementRect.left + scrollX + (elementRect.width / 2) - (tooltipRect.width / 2),
          placement: 'top'
        };
        break;
        
      case 'bottom':
        position = {
          top: elementRect.bottom + scrollY + offset,
          left: elementRect.left + scrollX + (elementRect.width / 2) - (tooltipRect.width / 2),
          placement: 'bottom'
        };
        break;
        
      case 'left':
        position = {
          top: elementRect.top + scrollY + (elementRect.height / 2) - (tooltipRect.height / 2),
          left: elementRect.left + scrollX - tooltipRect.width - offset,
          placement: 'left'
        };
        break;
        
      case 'right':
        position = {
          top: elementRect.top + scrollY + (elementRect.height / 2) - (tooltipRect.height / 2),
          left: elementRect.right + scrollX + offset,
          placement: 'right'
        };
        break;
    }
    
    // Collision detection and adjustment
    if (config.collisionDetection) {
      // Keep tooltip within viewport horizontally
      if (position.left < scrollX) {
        position.left = scrollX + 10;
      } else if (position.left + tooltipRect.width > scrollX + viewportWidth) {
        position.left = scrollX + viewportWidth - tooltipRect.width - 10;
      }
      
      // Keep tooltip within viewport vertically
      if (position.top < scrollY) {
        position.top = scrollY + 10;
      } else if (position.top + tooltipRect.height > scrollY + viewportHeight) {
        position.top = scrollY + viewportHeight - tooltipRect.height - 10;
      }
    }
    
    return position;
  }
  
  /**
   * Attach tooltips to all eligible elements
   */
  attachAll(root = document) {
    const selectors = [
      '[data-tooltip]',
      '[data-tooltip-text]',
      '[data-i18n-title]',
      'button[title]:not([data-tooltip-initialized])',
      '.toolbar-action-btn',
      '.menu-icon',
      '.settings-btn',
      '.mic-btn',
      '.send-btn'
    ];
    
    const elements = root.querySelectorAll(selectors.join(','));
    
    elements.forEach(element => {
      // Skip user button to prevent flickering
      if (element.id === 'userBtn' || element.classList.contains('user-btn')) {
        return;
      }
      if (!element.hasAttribute('data-tooltip-initialized')) {
        this.attach(element);
      }
    });
  }
  
  /**
   * Observe DOM for dynamic elements
   */
  observeDOM() {
    if (!window.MutationObserver) return;
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // Check added nodes
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            // Check if node itself needs tooltip
            if (this.shouldHaveTooltip(node)) {
              this.attach(node);
            }
            
            // Check children
            this.attachAll(node);
          }
        });
        
        // Check removed nodes
        mutation.removedNodes.forEach((node) => {
          if (node.nodeType === 1 && this.tooltips.has(node)) {
            this.detach(node);
          }
        });
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    this.observer = observer;
  }
  
  /**
   * Check if element should have tooltip
   */
  shouldHaveTooltip(element) {
    // Skip user button to prevent flickering
    if (element.id === 'userBtn' || element.classList.contains('user-btn')) {
      return false;
    }
    return element.hasAttribute('data-tooltip') ||
           element.hasAttribute('data-tooltip-text') ||
           element.hasAttribute('data-i18n-title') ||
           (element.hasAttribute('title') && element.tagName === 'BUTTON');
  }
  
  /**
   * Detach tooltip from element
   */
  detach(element) {
    const data = this.tooltips.get(element);
    if (!data) return;
    
    // Remove event listeners
    element.removeEventListener('mouseenter', this.handleMouseEnter);
    element.removeEventListener('mouseleave', this.handleMouseLeave);
    element.removeEventListener('focus', this.handleFocus);
    element.removeEventListener('blur', this.handleBlur);
    
    // Remove tooltip element
    if (data.element.parentElement) {
      data.element.parentElement.removeChild(data.element);
    }
    
    // Remove from map
    this.tooltips.delete(element);
    
    // Restore original title if exists
    if (element.hasAttribute('data-original-title')) {
      element.setAttribute('title', element.getAttribute('data-original-title'));
      element.removeAttribute('data-original-title');
    }
    
    element.removeAttribute('data-tooltip-initialized');
  }
  
  /**
   * Update tooltip content
   */
  update(element, content) {
    const data = this.tooltips.get(element);
    if (!data) return;
    
    // Translate if i18n enabled
    if (data.config.i18n && !data.config.html) {
      content = this.t(content);
    }
    
    // Update content
    if (data.config.html) {
      data.element.innerHTML = content;
    } else {
      data.element.textContent = content;
    }
    
    data.content = content;
  }
  
  /**
   * Destroy tooltip manager
   */
  destroy() {
    // Detach all tooltips
    this.tooltips.forEach((data, element) => {
      this.detach(element);
    });
    
    // Remove event listeners
    window.removeEventListener('scroll', this.handleScroll);
    
    // Disconnect observer
    if (this.observer) {
      this.observer.disconnect();
    }
    
    // Clear data
    this.tooltips.clear();
    this.activeTooltip = null;
    this.i18nData = null;
  }
}

// Create global instance
const tooltipManager = new TooltipManager({
  smartPosition: true,
  collisionDetection: true,
  i18n: true,
  arrow: false,
  delay: 500
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TooltipManager, tooltipManager };
}

// Export for ES6 modules
if (typeof exports !== 'undefined') {
  exports.TooltipManager = TooltipManager;
  exports.tooltipManager = tooltipManager;
}

// Make available globally
if (typeof window !== 'undefined') {
  window.TooltipManager = TooltipManager;
  window.tooltipManager = tooltipManager;
}


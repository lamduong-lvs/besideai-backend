/**
 * Input Instance
 * Một instance của input - đơn giản, không phức tạp
 */

import { loadTemplate } from './templates/input-template.js';
import { Toolbar } from './components/toolbar.js';
import { Textarea } from './components/textarea.js';
import { Actions } from './components/actions.js';
import { Footer } from './components/footer.js';
import { Attachments } from './components/attachments.js';
import { EventsHandler } from './handlers/events.js';
import { KeyboardHandler } from './handlers/keyboard.js';

export class InputInstance {
  constructor(config) {
    this.config = config;
    this.containerId = config.containerId;
    this.type = config.type;
    
    // Components
    this.toolbar = null;
    this.textarea = null;
    this.actions = null;
    this.footer = null;
    this.attachments = null;
    
    // Handlers
    this.events = null;
    this.keyboard = null;
    
    // State
    this.isRendered = false;
    this.isVisible = true;
  }
  
  /**
   * Render input vào DOM
   */
  async render() {
    if (this.isRendered) {
      console.warn(`[InputInstance] ${this.containerId} already rendered`);
      return;
    }
    
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error(`[InputInstance] Container ${this.containerId} not found`);
      return;
    }
    
    // Load và render template
    const html = loadTemplate(this.config);
    // Set ID cho container để đảm bảo có ID đúng
    container.innerHTML = html;
    const inputModuleContainer = container.querySelector('.input-module-container');
    if (inputModuleContainer) {
      inputModuleContainer.id = this.containerId;
    }
    
    // ✅ Apply theme to input module container
    await this._applyTheme();
    
    // Initialize components
    this._initializeComponents();
    
    // Initialize handlers
    this._initializeHandlers();
    
    this.isRendered = true;
    
    // Emit event
    this._emit('input:initialized', {
      type: this.type,
      containerId: this.containerId
    });
  }
  
  /**
   * Apply theme to input module
   * @private
   */
  async _applyTheme() {
    try {
      const data = await chrome.storage.local.get('theme');
      const savedTheme = data.theme || 'light';
      
      // Determine effective theme
      let effectiveTheme = savedTheme;
      if (savedTheme === 'auto') {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          effectiveTheme = 'dark';
        } else {
          effectiveTheme = 'light';
        }
      }
      
      // Apply theme to document root (input module inherits from parent)
      if (document.documentElement) {
        document.documentElement.setAttribute('data-theme', effectiveTheme);
      }
      
      // Also apply to body for compatibility
      document.body.classList.remove('theme-light', 'theme-dark', 'theme-auto');
      document.body.classList.add(`theme-${effectiveTheme}`);
      
      // ✅ Listen for theme changes
      if (!this._themeListenerSetup) {
        chrome.storage.onChanged.addListener((changes, namespace) => {
          if (namespace === 'local' && changes.theme) {
            const newTheme = changes.theme.newValue || 'light';
            let effectiveNewTheme = newTheme;
            if (newTheme === 'auto') {
              if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                effectiveNewTheme = 'dark';
              } else {
                effectiveNewTheme = 'light';
              }
            }
            
            if (document.documentElement) {
              document.documentElement.setAttribute('data-theme', effectiveNewTheme);
            }
            
            document.body.classList.remove('theme-light', 'theme-dark', 'theme-auto');
            document.body.classList.add(`theme-${effectiveNewTheme}`);
          }
        });
        this._themeListenerSetup = true;
      }
    } catch (error) {
      console.warn('[InputInstance] Error applying theme:', error);
      // Fallback to light theme
      if (document.documentElement) {
        document.documentElement.setAttribute('data-theme', 'light');
      }
    }
  }
  
  /**
   * Lấy giá trị input
   * @returns {string} Giá trị của textarea
   */
  getValue() {
    return this.textarea ? this.textarea.getValue() : '';
  }
  
  /**
   * Đặt giá trị input
   * @param {string} value - Giá trị mới
   */
  setValue(value) {
    if (this.textarea) {
      this.textarea.setValue(value);
    }
  }
  
  /**
   * Focus vào input
   */
  focus() {
    if (this.textarea) {
      this.textarea.focus();
    }
  }
  
  /**
   * Xóa nội dung input
   */
  clear() {
    if (this.textarea) {
      this.textarea.clear();
    }
  }
  
  /**
   * Hiển thị input
   */
  show() {
    const container = document.getElementById(this.containerId);
    console.log(`[InputInstance] show() called for ${this.containerId}, container found:`, !!container);
    if (container) {
      container.classList.remove('d-none');
      container.style.display = 'block';
      this.isVisible = true;
      console.log(`[InputInstance] ${this.containerId} shown, classes:`, container.className, 'display:', container.style.display);
    } else {
      console.error(`[InputInstance] Container ${this.containerId} not found!`);
    }
  }
  
  /**
   * Ẩn input
   */
  hide() {
    const container = document.getElementById(this.containerId);
    if (container) {
      container.classList.add('d-none');
      container.style.display = 'none';
      this.isVisible = false;
    }
  }
  
  /**
   * Cập nhật tên model
   * @param {string} modelName - Tên model
   */
  updateModelName(modelName) {
    if (this.toolbar) {
      this.toolbar.updateModelName(modelName);
    }
  }
  
  /**
   * Cập nhật token usage
   * @param {number} used - Số token đã dùng
   * @param {number} total - Tổng số token
   */
  updateTokenUsage(used, total) {
    if (this.footer) {
      this.footer.updateTokenUsage(used, total);
    }
  }
  
  /**
   * Cập nhật gift count
   * @param {number} count - Số gift
   */
  updateGiftCount(count) {
    if (this.footer) {
      this.footer.updateGiftCount(count);
    }
  }
  
  /**
   * Cập nhật options
   * @param {Object} options - Options mới
   */
  updateOptions(options) {
    this.config = { ...this.config, ...options };
    
    // Update components nếu cần
    if (this.textarea && options.placeholder !== undefined) {
      this.textarea.setPlaceholder(options.placeholder);
    }
  }
  
  /**
   * Hủy instance
   */
  destroy() {
    // Destroy handlers
    if (this.events) {
      this.events.destroy();
    }
    if (this.keyboard) {
      this.keyboard.destroy();
    }
    
    // Destroy components
    if (this.toolbar) this.toolbar.destroy();
    if (this.textarea) this.textarea.destroy();
    if (this.actions) this.actions.destroy();
    if (this.footer) this.footer.destroy();
    if (this.attachments) this.attachments.destroy();
    
    // Clear container
    const container = document.getElementById(this.containerId);
    if (container) {
      container.innerHTML = '';
    }
    
    this.isRendered = false;
  }
  
  /**
   * Initialize components
   * @private
   */
  _initializeComponents() {
    // Toolbar
    if (this.config.showToolbar) {
      this.toolbar = new Toolbar(this.config);
      this.toolbar.initialize();
    }
    
    // Textarea
    this.textarea = new Textarea(this.config);
    this.textarea.initialize();
    
    // Actions
    if (this.config.showActions) {
      this.actions = new Actions(this.config);
      this.actions.initialize();
    }
    
    // Footer
    if (this.config.showFooter) {
      this.footer = new Footer(this.config);
      this.footer.initialize();
    }
    
    // Attachments
    if (this.config.showAttachments) {
      this.attachments = new Attachments(this.config);
      this.attachments.initialize();
    }
  }
  
  /**
   * Initialize handlers
   * @private
   */
  _initializeHandlers() {
    // Events handler (phải khởi tạo trước để có thể access textarea)
    this.events = new EventsHandler({
      instance: this,
      config: this.config
    });
    this.events.initialize();
    
    // Keyboard handler
    if (this.textarea && this.textarea.getElement()) {
      this.keyboard = new KeyboardHandler({
        textarea: this.textarea.getElement(),
        config: this.config,
        instance: this
      });
      this.keyboard.initialize();
    }
  }
  
  /**
   * Emit event
   * @private
   */
  _emit(eventName, detail) {
    const event = new CustomEvent(eventName, { detail });
    document.dispatchEvent(event);
  }
}


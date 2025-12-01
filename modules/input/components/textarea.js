/**
 * Textarea Component
 * Component quản lý textarea chính
 */

export class Textarea {
  constructor(config) {
    this.config = config;
    this.containerId = config.containerId;
    this.textarea = null;
    this.maxHeight = config.maxTextareaHeight || 120;
  }
  
  /**
   * Initialize textarea
   */
  initialize() {
    this.textarea = document.getElementById(`${this.containerId}-chatInput`);
    if (!this.textarea) {
      console.error(`[Textarea] Textarea ${this.containerId}-chatInput not found`);
      return;
    }
    
    // Setup auto-resize
    this._setupAutoResize();
    
    // Setup event listeners
    this._setupEventListeners();
  }
  
  /**
   * Get value
   * @returns {string} Value của textarea
   */
  getValue() {
    return this.textarea ? this.textarea.value : '';
  }
  
  /**
   * Set value
   * @param {string} value - Giá trị mới
   */
  setValue(value) {
    if (this.textarea) {
      this.textarea.value = value || '';
      this._handleResize();
    }
  }
  
  /**
   * Focus
   */
  focus() {
    if (this.textarea) {
      this.textarea.focus();
    }
  }
  
  /**
   * Clear
   */
  clear() {
    this.setValue('');
  }
  
  /**
   * Set placeholder
   * @param {string} placeholder - Placeholder text
   */
  setPlaceholder(placeholder) {
    if (this.textarea) {
      this.textarea.placeholder = placeholder || '';
    }
  }
  
  /**
   * Get element
   * @returns {HTMLElement} Textarea element
   */
  getElement() {
    return this.textarea;
  }
  
  /**
   * Destroy textarea
   */
  destroy() {
    this._removeEventListeners();
    this.textarea = null;
  }
  
  /**
   * Setup auto-resize
   * @private
   */
  _setupAutoResize() {
    if (!this.textarea) return;
    
    // Set initial height
    this.textarea.style.height = 'auto';
    this.textarea.style.overflowY = 'hidden';
    
    // Listen for input to resize
    this.textarea.addEventListener('input', this._handleResize.bind(this));
  }
  
  /**
   * Handle resize
   * @private
   */
  _handleResize() {
    if (!this.textarea) return;
    
    // Reset height to auto to get correct scrollHeight
    this.textarea.style.height = 'auto';
    
    // Set height based on content, but max to maxHeight
    const newHeight = Math.min(this.textarea.scrollHeight, this.maxHeight);
    this.textarea.style.height = `${newHeight}px`;
    
    // Show scrollbar if content exceeds maxHeight
    if (this.textarea.scrollHeight > this.maxHeight) {
      this.textarea.style.overflowY = 'auto';
    } else {
      this.textarea.style.overflowY = 'hidden';
    }
  }
  
  /**
   * Setup event listeners
   * @private
   */
  _setupEventListeners() {
    if (!this.textarea) return;
    
    // Input event
    this.textarea.addEventListener('input', this._handleInput.bind(this));
    
    // Focus/blur events
    this.textarea.addEventListener('focus', this._handleFocus.bind(this));
    this.textarea.addEventListener('blur', this._handleBlur.bind(this));
  }
  
  /**
   * Remove event listeners
   * @private
   */
  _removeEventListeners() {
    // Event listeners sẽ tự động bị remove khi element bị destroy
  }
  
  /**
   * Handle input
   * @private
   */
  _handleInput() {
    this._emit('input:textarea-input', {
      type: this.config.type,
      containerId: this.containerId,
      value: this.textarea.value
    });
  }
  
  /**
   * Handle focus
   * @private
   */
  _handleFocus() {
    this._emit('input:textarea-focus', {
      type: this.config.type,
      containerId: this.containerId
    });
  }
  
  /**
   * Handle blur
   * @private
   */
  _handleBlur() {
    this._emit('input:textarea-blur', {
      type: this.config.type,
      containerId: this.containerId
    });
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


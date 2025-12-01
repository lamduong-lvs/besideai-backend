/**
 * Keyboard Handler
 * Xử lý keyboard shortcuts và @ mentions, / commands
 */

export class KeyboardHandler {
  constructor(options) {
    this.textarea = options.textarea;
    this.config = options.config;
    this.instance = options.instance;
    
    // Bind methods để có thể remove event listeners
    this._boundHandleKeydown = this._handleKeydown.bind(this);
    this._boundHandleInput = this._handleInput.bind(this);
  }
  
  /**
   * Initialize keyboard handler
   */
  initialize() {
    if (!this.textarea) {
      console.error('[KeyboardHandler] Textarea not found');
      return;
    }
    
    // Listen for keydown
    this.textarea.addEventListener('keydown', this._boundHandleKeydown);
    
    // Listen for input (for @ and / detection)
    this.textarea.addEventListener('input', this._boundHandleInput);
  }
  
  /**
   * Destroy keyboard handler
   */
  destroy() {
    if (this.textarea) {
      this.textarea.removeEventListener('keydown', this._boundHandleKeydown);
      this.textarea.removeEventListener('input', this._boundHandleInput);
    }
  }
  
  /**
   * Handle keydown
   * @private
   */
  _handleKeydown(event) {
    // Handle Enter key (submit) - trực tiếp ở đây để đơn giản
    if (event.key === 'Enter' && !event.shiftKey) {
      const value = this.textarea.value;
      if (value && value.trim()) {
        event.preventDefault();
        // Emit submit event
        this._emit('input:submitted', {
          type: this.config.type,
          containerId: this.config.containerId,
          value: value.trim()
        });
        
        // Call onSubmit callback nếu có
        if (this.config.onSubmit && typeof this.config.onSubmit === 'function') {
          this.config.onSubmit(value.trim());
        }
        
        // Clear input
        if (this.instance) {
          this.instance.clear();
        }
      }
      return;
    }
    
    // Emit keydown event cho các handlers khác
    this._emit('input:textarea-keydown', {
      type: this.config.type,
      containerId: this.config.containerId,
      keyEvent: event,
      value: this.textarea.value
    });
  }
  
  /**
   * Handle input (for @ and / detection)
   * @private
   */
  _handleInput(event) {
    const value = this.textarea.value;
    const cursorPos = this.textarea.selectionStart;
    
    // Check for @ mention
    if (this._checkMention(value, cursorPos)) {
      this._handleMention(value, cursorPos);
      return;
    }
    
    // Check for / command
    if (this._checkCommand(value, cursorPos)) {
      this._handleCommand(value, cursorPos);
      return;
    }
  }
  
  /**
   * Check if @ mention is being typed
   * @private
   */
  _checkMention(value, cursorPos) {
    // Tìm @ gần nhất trước cursor
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex === -1) return false;
    
    // Kiểm tra xem có khoảng trắng sau @ không
    const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
    if (textAfterAt.includes(' ') || textAfterAt.includes('\n')) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Handle @ mention
   * @private
   */
  _handleMention(value, cursorPos) {
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    const query = textBeforeCursor.substring(lastAtIndex + 1);
    
    // Emit mention event
    this._emit('input:mention', {
      type: this.config.type,
      containerId: this.config.containerId,
      query,
      position: lastAtIndex
    });
  }
  
  /**
   * Check if / command is being typed
   * @private
   */
  _checkCommand(value, cursorPos) {
    // Tìm / gần nhất trước cursor
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastSlashIndex = textBeforeCursor.lastIndexOf('/');
    
    if (lastSlashIndex === -1) return false;
    
    // Kiểm tra xem có khoảng trắng sau / không
    const textAfterSlash = textBeforeCursor.substring(lastSlashIndex + 1);
    if (textAfterSlash.includes(' ') || textAfterSlash.includes('\n')) {
      return false;
    }
    
    // Kiểm tra xem / có ở đầu dòng hoặc sau khoảng trắng không
    const charBeforeSlash = textBeforeCursor[lastSlashIndex - 1];
    if (charBeforeSlash && charBeforeSlash !== ' ' && charBeforeSlash !== '\n') {
      return false;
    }
    
    return true;
  }
  
  /**
   * Handle / command
   * @private
   */
  _handleCommand(value, cursorPos) {
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastSlashIndex = textBeforeCursor.lastIndexOf('/');
    const query = textBeforeCursor.substring(lastSlashIndex + 1);
    
    // Emit command event
    this._emit('input:command', {
      type: this.config.type,
      containerId: this.config.containerId,
      query,
      position: lastSlashIndex
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


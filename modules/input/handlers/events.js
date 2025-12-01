/**
 * Events Handler
 * Xử lý các sự kiện từ components
 */

export class EventsHandler {
  constructor(options) {
    this.instance = options.instance;
    this.config = options.config;
    
    // Bind methods để có thể remove event listeners
    this._boundHandleActionClick = this._handleActionClick.bind(this);
  }
  
  /**
   * Initialize events handler
   */
  initialize() {
    // Listen for submit events
    document.addEventListener('input:action-clicked', this._boundHandleActionClick);
    // Note: Enter key submit được xử lý bởi KeyboardHandler, không cần listen ở đây
  }
  
  /**
   * Destroy events handler
   */
  destroy() {
    // Remove event listeners
    document.removeEventListener('input:action-clicked', this._boundHandleActionClick);
  }
  
  /**
   * Handle action click
   * @private
   */
  _handleActionClick(event) {
    const { type, containerId, actionId } = event.detail;
    
    // Chỉ xử lý nếu đúng container
    if (containerId !== this.config.containerId) {
      return;
    }
    
    // Handle send button
    if (actionId === 'send') {
      this._handleSubmit();
      return;
    }
    
    // Emit action event
    this._emit('input:action', {
      type,
      containerId,
      actionId
    });
  }
  
  /**
   * Handle keydown
   * @private
   */
  _handleKeydown(event) {
    const { type, containerId, keyEvent } = event.detail;
    
    // Chỉ xử lý nếu đúng container
    if (containerId !== this.config.containerId) {
      return;
    }
    
    // Handle Enter key (submit)
    if (keyEvent && keyEvent.key === 'Enter' && !keyEvent.shiftKey) {
      const value = this.instance.getValue();
      if (value && value.trim()) {
        this._handleSubmit();
      }
    }
  }
  
  /**
   * Handle submit
   * @private
   */
  _handleSubmit() {
    const value = this.instance.getValue().trim();
    
    if (!value) {
      return;
    }
    
    // Emit submit event
    this._emit('input:submitted', {
      type: this.config.type,
      containerId: this.config.containerId,
      value
    });
    
    // Call onSubmit callback nếu có
    if (this.config.onSubmit && typeof this.config.onSubmit === 'function') {
      this.config.onSubmit(value);
    }
    
    // Clear input
    this.instance.clear();
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


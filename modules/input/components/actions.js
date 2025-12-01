/**
 * Actions Component
 * Component quản lý các action buttons
 */

export class Actions {
  constructor(config) {
    this.config = config;
    this.containerId = config.containerId;
    this.container = null;
  }
  
  /**
   * Initialize actions
   */
  initialize() {
    this.container = document.getElementById(`${this.containerId}-actions`);
    if (!this.container) {
      console.error(`[Actions] Container ${this.containerId}-actions not found`);
      return;
    }
    
    // Setup event listeners
    this._setupEventListeners();
  }
  
  /**
   * Destroy actions
   */
  destroy() {
    this._removeEventListeners();
    this.container = null;
  }
  
  /**
   * Setup event listeners
   * @private
   */
  _setupEventListeners() {
    if (!this.container) return;
    
    this.config.actions?.forEach(actionId => {
      const btnId = this._getButtonId(actionId);
      const btn = document.getElementById(`${this.containerId}-${btnId}`);
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this._handleActionClick(actionId);
        });
      }
    });
  }
  
  /**
   * Remove event listeners
   * @private
   */
  _removeEventListeners() {
    // Event listeners sẽ tự động bị remove khi element bị destroy
  }
  
  /**
   * Handle action click
   * @private
   */
  _handleActionClick(actionId) {
    this._emit('input:action-clicked', {
      type: this.config.type,
      containerId: this.containerId,
      actionId
    });
  }
  
  /**
   * Get button ID from action type
   * @private
   */
  _getButtonId(actionId) {
    const mapping = {
      think: 'thinkBtn',
      deepResearch: 'deepResearchBtn',
      mic: 'micBtn',
      send: 'sendBtn'
    };
    return mapping[actionId] || actionId;
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


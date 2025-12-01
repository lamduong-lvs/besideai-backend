/**
 * Toolbar Component
 * Component quản lý toolbar phía trên input
 */

export class Toolbar {
  constructor(config) {
    this.config = config;
    this.containerId = config.containerId;
    this.container = null;
    this.modelNameEl = null;
  }
  
  /**
   * Initialize toolbar
   */
  initialize() {
    this.container = document.getElementById(`${this.containerId}-toolbar`);
    if (!this.container) {
      console.error(`[Toolbar] Container ${this.containerId}-toolbar not found`);
      return;
    }
    
    this.modelNameEl = document.getElementById(`${this.containerId}-modelName`);
    
    // Setup event listeners
    this._setupEventListeners();
  }
  
  /**
   * Update model name
   * @param {string} modelName - Tên model
   */
  updateModelName(modelName) {
    if (this.modelNameEl && modelName) {
      this.modelNameEl.textContent = modelName;
    }
  }
  
  /**
   * Destroy toolbar
   */
  destroy() {
    this._removeEventListeners();
    this.container = null;
    this.modelNameEl = null;
  }
  
  /**
   * Setup event listeners
   * @private
   */
  _setupEventListeners() {
    if (!this.container) return;
    
    // Model selector click
    const modelSelector = document.getElementById(`${this.containerId}-modelSelector`);
    if (modelSelector) {
      modelSelector.addEventListener('click', this._handleModelSelectorClick.bind(this));
    }
    
    // Toolbar buttons
    this.config.toolbar?.forEach(btnId => {
      if (btnId === 'model') return; // Đã handle ở trên
      
      const btn = document.getElementById(`${this.containerId}-${this._getButtonId(btnId)}`);
      if (btn) {
        btn.addEventListener('click', () => this._handleButtonClick(btnId));
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
   * Handle model selector click
   * @private
   */
  _handleModelSelectorClick() {
    this._emit('input:toolbar-action', {
      type: this.config.type,
      containerId: this.containerId,
      action: 'model-selector'
    });
  }
  
  /**
   * Handle button click
   * @private
   */
  _handleButtonClick(btnId) {
    this._emit('input:toolbar-action', {
      type: this.config.type,
      containerId: this.containerId,
      action: btnId
    });
  }
  
  /**
   * Get button ID from button type
   * @private
   */
  _getButtonId(btnId) {
    const mapping = {
      crop: 'cropImageBtn',
      attach: 'attachBtn',
      book: 'bookBtn',
      settings: 'settingsBtn',
      history: 'historyBtn',
      newChat: 'newChatBtn',
      regenerate: 'regenerateBtn'
    };
    return mapping[btnId] || btnId;
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


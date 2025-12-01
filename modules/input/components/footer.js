/**
 * Footer Component
 * Component quản lý footer (token, gift, upgrade, etc.)
 */

export class Footer {
  constructor(config) {
    this.config = config;
    this.containerId = config.containerId;
    this.container = null;
    this.tokenDisplay = null;
    this.giftDisplay = null;
  }
  
  /**
   * Initialize footer
   */
  initialize() {
    this.container = document.getElementById(`${this.containerId}-footer`);
    if (!this.container) {
      console.error(`[Footer] Container ${this.containerId}-footer not found`);
      return;
    }
    
    this.tokenDisplay = document.getElementById(`${this.containerId}-tokenDisplay`);
    this.giftDisplay = document.getElementById(`${this.containerId}-giftDisplay`);
    
    // Setup event listeners
    this._setupEventListeners();
    
    // Setup token display click handler
    this._setupTokenDisplayClick();
  }
  
  /**
   * Update token usage
   * @param {number} used - Số token đã dùng
   * @param {number} total - Tổng số token
   */
  updateTokenUsage(used, total) {
    if (this.tokenDisplay) {
      const tokenValue = this.tokenDisplay.querySelector('.token-value');
      if (tokenValue) {
        // Hiển thị số token còn lại (đếm ngược từ limit về 0)
        const remaining = Math.max(0, (total || 1000) - (used || 0));
        tokenValue.textContent = remaining.toLocaleString();
      }
    }
  }
  
  /**
   * Update gift count
   * @param {number} count - Số gift
   */
  updateGiftCount(count) {
    if (this.giftDisplay) {
      const giftValue = this.giftDisplay.querySelector('.gift-value');
      if (giftValue) {
        giftValue.textContent = count || 0;
      }
    }
  }
  
  /**
   * Destroy footer
   */
  destroy() {
    this._removeEventListeners();
    this.container = null;
    this.tokenDisplay = null;
    this.giftDisplay = null;
  }
  
  /**
   * Setup event listeners
   * @private
   */
  _setupEventListeners() {
    if (!this.container) return;
    
    // Footer buttons
    const heartBtn = document.getElementById(`${this.containerId}-heartBtn`);
    if (heartBtn) {
      heartBtn.addEventListener('click', () => this._handleFooterButtonClick('heart'));
    }
    
    const helpBtn = document.getElementById(`${this.containerId}-helpBtn`);
    if (helpBtn) {
      helpBtn.addEventListener('click', () => this._handleFooterButtonClick('help'));
    }
    
    const messagesBtn = document.getElementById(`${this.containerId}-messagesBtn`);
    if (messagesBtn) {
      messagesBtn.addEventListener('click', () => this._handleFooterButtonClick('messages'));
    }
    
    // Send và Mic buttons trong footer (nếu có)
    const sendBtn = document.getElementById(`${this.containerId}-sendBtn`);
    if (sendBtn) {
      sendBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._handleActionClick('send');
      });
    }
    
    const micBtn = document.getElementById(`${this.containerId}-micBtn`);
    if (micBtn) {
      micBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._handleActionClick('mic');
      });
    }
  }

  /**
   * Setup token display click handler
   * @private
   */
  _setupTokenDisplayClick() {
    if (!this.tokenDisplay) return;
    
    this.tokenDisplay.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleTokenDisplayClick();
    });
  }

  /**
   * Handle token display click
   * @private
   */
  _handleTokenDisplayClick() {
    // Emit event to show token usage menu
    this._emit('input:token-display-clicked', {
      type: this.config.type,
      containerId: this.containerId,
      tokenDisplay: this.tokenDisplay
    });
  }
  
  /**
   * Handle action click (send, mic)
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
   * Remove event listeners
   * @private
   */
  _removeEventListeners() {
    // Event listeners sẽ tự động bị remove khi element bị destroy
  }
  
  /**
   * Handle footer button click
   * @private
   */
  _handleFooterButtonClick(buttonId) {
    this._emit('input:footer-action', {
      type: this.config.type,
      containerId: this.containerId,
      action: buttonId
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


/**
 * Attachments Component
 * Component quản lý file đính kèm
 */

export class Attachments {
  constructor(config) {
    this.config = config;
    this.containerId = config.containerId;
    this.container = null;
    this.fileInput = null;
    this.attachments = [];
  }
  
  /**
   * Initialize attachments
   */
  initialize() {
    this.container = document.getElementById(`${this.containerId}-attachments`);
    this.fileInput = document.getElementById(`${this.containerId}-fileInput`);
    
    if (!this.fileInput) {
      console.error(`[Attachments] File input ${this.containerId}-fileInput not found`);
      return;
    }
    
    // Setup event listeners
    this._setupEventListeners();
  }
  
  /**
   * Get attachments
   * @returns {Array} Danh sách attachments
   */
  getAttachments() {
    return [...this.attachments];
  }
  
  /**
   * Clear attachments
   */
  clearAttachments() {
    this.attachments = [];
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
  
  /**
   * Destroy attachments
   */
  destroy() {
    this._removeEventListeners();
    this.container = null;
    this.fileInput = null;
    this.attachments = [];
  }
  
  /**
   * Setup event listeners
   * @private
   */
  _setupEventListeners() {
    if (!this.fileInput) return;
    
    // File input change
    this.fileInput.addEventListener('change', this._handleFileSelect.bind(this));
    
    // Attach button click (nếu có)
    const attachBtn = document.getElementById(`${this.containerId}-attachBtn`);
    if (attachBtn) {
      attachBtn.addEventListener('click', () => {
        this.fileInput.click();
      });
    }
    
    // Drag and drop
    if (this.container) {
      this.container.addEventListener('dragover', this._handleDragOver.bind(this));
      this.container.addEventListener('drop', this._handleDrop.bind(this));
    }
  }
  
  /**
   * Remove event listeners
   * @private
   */
  _removeEventListeners() {
    // Event listeners sẽ tự động bị remove khi element bị destroy
  }
  
  /**
   * Handle file select
   * @private
   */
  _handleFileSelect(event) {
    const files = Array.from(event.target.files || []);
    this._processFiles(files);
    
    // Reset file input
    if (event.target) {
      event.target.value = '';
    }
  }
  
  /**
   * Handle drag over
   * @private
   */
  _handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
  }
  
  /**
   * Handle drop
   * @private
   */
  _handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const files = Array.from(event.dataTransfer.files || []);
    this._processFiles(files);
  }
  
  /**
   * Process files
   * @private
   */
  _processFiles(files) {
    if (!files.length) return;
    
    // For Main Chat, accept all file types; for others, only images
    let validFiles = files;
    if (this.config.type !== 'chat') {
      validFiles = files.filter(file => file.type.startsWith('image/'));
      if (!validFiles.length) {
        this._emit('input:attachment-error', {
          type: this.config.type,
          containerId: this.containerId,
          error: 'No valid image files found'
        });
        return;
      }
    }
    
    // Add to attachments
    validFiles.forEach(file => {
      const attachment = {
        id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        url: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
      };
      
      this.attachments.push(attachment);
    });
    
    // Emit event
    this._emit('input:attachments-added', {
      type: this.config.type,
      containerId: this.containerId,
      attachments: this.attachments
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


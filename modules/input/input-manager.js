/**
 * Input Manager
 * Singleton quản lý tất cả các input instances
 * Đơn giản, dễ bảo trì, không phức tạp
 */

import { InputInstance } from './input-instance.js';
import { InputConfig } from './config/input-config.js';

class InputManager {
  constructor() {
    if (InputManager.instance) {
      return InputManager.instance;
    }
    
    this.instances = new Map(); // containerId -> InputInstance
    this.currentActive = null; // InputInstance hiện tại đang active
    
    InputManager.instance = this;
  }
  
  /**
   * Tạo input mới
   * @param {string} type - Loại input (chat, translate, pdfChat, gmail)
   * @param {string} containerId - ID của container
   * @param {Object} options - Tùy chọn (onSubmit, placeholder, etc.)
   * @returns {InputInstance} Instance của input
   */
  create(type, containerId, options = {}) {
    // Kiểm tra type hợp lệ
    if (!InputConfig[type]) {
      console.error(`[InputManager] Invalid input type: ${type}`);
      return null;
    }
    
    // Kiểm tra containerId đã tồn tại chưa
    if (this.instances.has(containerId)) {
      console.warn(`[InputManager] Container ${containerId} already has an input, returning existing`);
      return this.instances.get(containerId);
    }
    
    // Merge config
    const config = {
      ...InputConfig[type],
      type,
      containerId,
      ...options
    };
    
    // Tạo instance mới
    const instance = new InputInstance(config);
    this.instances.set(containerId, instance);
    
    // Render vào DOM
    instance.render();
    
    // Show input sau khi render
    instance.show();
    
    // Set làm current nếu chưa có current
    if (!this.currentActive) {
      this.currentActive = instance;
    }
    
    return instance;
  }
  
  /**
   * Chuyển sang input khác
   * @param {string} type - Loại input
   * @param {string} containerId - ID của container
   * @param {Object} options - Tùy chọn
   * @returns {InputInstance} Instance của input
   */
  switchTo(type, containerId, options = {}) {
    console.log(`[InputManager] switchTo called: type=${type}, containerId=${containerId}`);
    
    // Ẩn input hiện tại
    if (this.currentActive && this.currentActive.containerId !== containerId) {
      console.log(`[InputManager] Hiding current active input: ${this.currentActive.containerId}`);
      this.currentActive.hide();
    }
    
    // Lấy hoặc tạo input mới
    let instance = this.instances.get(containerId);
    if (!instance) {
      console.log(`[InputManager] Creating new input instance for ${containerId}`);
      instance = this.create(type, containerId, options);
    } else {
      console.log(`[InputManager] Using existing input instance for ${containerId}`);
      // Update options nếu có
      if (Object.keys(options).length > 0) {
        instance.updateOptions(options);
      }
      instance.show();
    }
    
    // Set làm current
    this.currentActive = instance;
    console.log(`[InputManager] Current active input: ${this.currentActive.containerId}, visible: ${this.currentActive.isVisible}`);
    
    return instance;
  }
  
  /**
   * Lấy input theo containerId
   * @param {string} containerId - ID của container
   * @returns {InputInstance|null} Instance của input
   */
  get(containerId) {
    return this.instances.get(containerId) || null;
  }
  
  /**
   * Lấy input hiện tại đang active
   * @returns {InputInstance|null} Instance của input
   */
  getCurrent() {
    return this.currentActive;
  }
  
  /**
   * Lấy tất cả input instances
   * @returns {Map<string, InputInstance>} Map of containerId -> InputInstance
   */
  getAllInstances() {
    return this.instances;
  }
  
  /**
   * Lấy input instance theo containerId (alias for get)
   * @param {string} containerId - ID của container
   * @returns {InputInstance|null} Instance của input
   */
  getInstance(containerId) {
    return this.get(containerId);
  }
  
  /**
   * Hủy input
   * @param {string} containerId - ID của container
   */
  destroy(containerId) {
    const instance = this.instances.get(containerId);
    if (instance) {
      instance.destroy();
      this.instances.delete(containerId);
      
      // Nếu là current, clear current
      if (this.currentActive === instance) {
        this.currentActive = null;
      }
    }
  }
}

// Export singleton instance
export const inputManager = new InputManager();
export { InputManager };


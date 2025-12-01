/**
 * Translate Input Integration
 * Tích hợp input module với Translate
 */

import { inputManager } from '../input/index.js';

/**
 * Khởi tạo input cho Translate
 * @param {Object} options - Tùy chọn khởi tạo
 */
export function initializeTranslateInput(options = {}) {
  return inputManager.create('translate', 'translate-input-container', {
    onSubmit: options.onSubmit,
    placeholder: options.placeholder,
    ...options
  });
}

/**
 * Chuyển sang input Translate
 * @param {Object} options - Tùy chọn
 */
export function switchToTranslateInput(options = {}) {
  return inputManager.switchTo('translate', 'translate-input-container', options);
}

/**
 * Lấy input Translate hiện tại
 * @returns {InputInstance|null} Instance của input Translate
 */
export function getTranslateInput() {
  return inputManager.get('translate-input-container');
}


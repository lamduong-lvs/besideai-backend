/**
 * Gmail Input Integration
 * Tích hợp input module với Gmail
 */

import { inputManager } from '../input/index.js';

/**
 * Khởi tạo input cho Gmail
 * @param {Object} options - Tùy chọn khởi tạo
 */
export function initializeGmailInput(options = {}) {
  return inputManager.create('gmail', 'gmail-input-container', {
    onSubmit: options.onSubmit,
    placeholder: options.placeholder,
    ...options
  });
}

/**
 * Chuyển sang input Gmail
 * @param {Object} options - Tùy chọn
 */
export function switchToGmailInput(options = {}) {
  return inputManager.switchTo('gmail', 'gmail-input-container', options);
}

/**
 * Lấy input Gmail hiện tại
 * @returns {InputInstance|null} Instance của input Gmail
 */
export function getGmailInput() {
  return inputManager.get('gmail-input-container');
}


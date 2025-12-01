/**
 * PDF Chat Input Integration
 * Tích hợp input module với PDF Chat
 */

import { inputManager } from '../input/index.js';

/**
 * Khởi tạo input cho PDF Chat
 * @param {Object} options - Tùy chọn khởi tạo
 */
export function initializePdfChatInput(options = {}) {
  return inputManager.create('pdfChat', 'pdf-chat-input-container', {
    onSubmit: options.onSubmit,
    placeholder: options.placeholder,
    ...options
  });
}

/**
 * Chuyển sang input PDF Chat
 * @param {Object} options - Tùy chọn
 */
export function switchToPdfChatInput(options = {}) {
  return inputManager.switchTo('pdfChat', 'pdf-chat-input-container', options);
}

/**
 * Lấy input PDF Chat hiện tại
 * @returns {InputInstance|null} Instance của input PDF Chat
 */
export function getPdfChatInput() {
  return inputManager.get('pdf-chat-input-container');
}


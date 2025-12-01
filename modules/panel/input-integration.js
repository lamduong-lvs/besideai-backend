/**
 * Panel Input Integration
 * Tích hợp module input mới với panel chat
 */

import { inputManager } from '../input/index.js';

// Expose globally để các module khác có thể sử dụng
window.inputManager = inputManager;

/**
 * Chuyển sang input main chat
 * @param {Object} options - Tùy chọn
 * @returns {InputInstance} Instance của input main chat
 */
export function switchToChatInput(options = {}) {
  return inputManager.switchTo('chat', 'chat-input-container', options);
}

/**
 * Chuyển sang input pdf chat
 * @param {Object} options - Tùy chọn
 * @returns {InputInstance} Instance của input pdf chat
 */
export function switchToPdfChatInput(options = {}) {
  return inputManager.switchTo('pdfChat', 'pdf-chat-input-container', options);
}

/**
 * Chuyển sang input gmail
 * @param {Object} options - Tùy chọn
 * @returns {InputInstance} Instance của input gmail
 */
export function switchToGmailInput(options = {}) {
  return inputManager.switchTo('gmail', 'gmail-input-container', options);
}

/**
 * Chat input removed - không còn sử dụng getChatInput()

/**
 * Lấy input hiện tại đang active
 * @returns {InputInstance|null} Instance của input
 */
export function getCurrentInput() {
  return inputManager.getCurrent();
}

/**
 * Lấy chế độ hiện tại
 * @returns {string|null} Chế độ hiện tại
 */
export function getCurrentMode() {
  const activeInput = inputManager.getCurrent();
  return activeInput ? activeInput.type : null;
}

/**
 * Lấy InputManager instance (để các module khác sử dụng)
 * @returns {InputManager} Instance của InputManager
 */
export function getInputManager() {
  return inputManager;
}


/**
 * PDF Chat UI Handler
 * Manages all UI states and rendering
 */

import { setupPDFChatScroll, scrollToBottom as scrollToBottomUtil } from './scroll.js';

export class PDFChatUI {
  constructor() {
    this.container = null;
    this.messagesContainer = null;
  }
  
  /**
   * Initialize UI with container
   */
  initialize(containerId) {
    console.log('[PDF Chat UI] Initializing with container:', containerId);
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error('[PDF Chat UI] Container not found:', containerId);
    } else {
      console.log('[PDF Chat UI] Container found:', this.container);
    }
  }
  
  /**
   * Show state when Gemini is not configured
   */
  showNotConfiguredState() {
    console.log('[PDF Chat UI] showNotConfiguredState called');
    if (!this.container) {
      console.error('[PDF Chat UI] showNotConfiguredState: container is null!');
      return;
    }
    
    console.log('[PDF Chat UI] Rendering not configured state...');
    this.container.innerHTML = `
      <div class="pdf-not-configured-state" role="alert" aria-live="polite">
        <div class="config-warning-card">
          <div class="warning-icon" aria-hidden="true">
            <img src="../../icons/svg/icon/Essentional, UI/Danger.svg" alt="" style="width: 48px; height: 48px;">
          </div>
          <h3 data-i18n="pdfChatNotConfiguredTitle">Gemini AI chưa được cấu hình</h3>
          <p data-i18n="pdfChatNotConfiguredDesc">
            Để sử dụng tính năng Chat với PDF, bạn cần cấu hình Gemini API Key trong phần Cài đặt.
          </p>
          <div class="config-steps">
            <h4 style="display: flex; align-items: center; gap: 0.5rem;">
              <img src="../../icons/svg/icon/List/List Check.svg" alt="" style="width: 20px; height: 20px;">
              Các bước cấu hình:
            </h4>
            <ol>
              <li>Mở <strong>Cài đặt</strong> Extension (click nút bên dưới)</li>
              <li>Trong mục <strong>"Cấu hình chung"</strong>, tìm <strong>"Google Gemini"</strong></li>
              <li>Click nút <strong>"Thiết lập"</strong> bên cạnh Google Gemini</li>
              <li>Nhập <strong>Gemini API Key</strong> và <strong>Base URL</strong></li>
              <li><strong>Thêm ít nhất 1 Model</strong> (vd: gemini-1.5-flash, gemini-2.0-flash-exp)</li>
              <li>Click <strong>"Lưu"</strong></li>
              <li>Quay lại đây và reload trang</li>
            </ol>
            <p class="text-sm text-muted" style="margin-top: var(--spacing-sm); display: flex; align-items: center; gap: 0.5rem;">
              <img src="../../icons/svg/icon/Essentional, UI/Info Circle.svg" alt="" class="icon-inline" style="width: 16px; height: 16px;">
              <em>Model phổ biến: gemini-1.5-flash, gemini-1.5-pro, gemini-2.0-flash-exp</em>
            </p>
          </div>
          <button class="btn btn-primary" id="pdfChatGoToSettingsBtn" aria-label="Open Settings">
            <img src="../../icons/svg/icon/Settings, Fine Tuning/Settings.svg" alt="" class="icon" style="width: 18px; height: 18px;">
            <span data-i18n="pdfChatGoToSettings">Mở Cài đặt</span>
          </button>
          <div class="config-help">
            <p style="display: flex; align-items: center; gap: 0.5rem;">
              <img src="../../icons/svg/icon/Essentional, UI/Info Circle.svg" alt="" class="icon-inline" style="width: 16px; height: 16px;">
              Cần hướng dẫn? Xem 
              <a href="https://aistudio.google.com/app/apikey" target="_blank">
                cách lấy Gemini API Key
              </a>
            </p>
          </div>
        </div>
      </div>
    `;
    
    // Add event listener for Settings button
    const settingsBtn = document.getElementById('pdfChatGoToSettingsBtn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
      });
    }
  }
  
  /**
   * Show empty state (ready to upload)
   */
  showEmptyState() {
    console.log('[PDF Chat UI] showEmptyState called');
    if (!this.container) {
      console.error('[PDF Chat UI] showEmptyState: container is null!');
      return;
    }
    
    console.log('[PDF Chat UI] Rendering empty state...');
    this.container.innerHTML = `
      <div class="pdf-empty-state">
        <div class="pdf-upload-zone" id="pdfUploadZone" role="button" tabindex="0" aria-label="Upload PDF file">
          <div class="upload-icon" aria-hidden="true">
            <img src="../../icons/svg/icon/Files/File Text.svg" alt="" style="width: 64px; height: 64px; opacity: 0.6;">
          </div>
          <h3 data-i18n="pdfChatEmptyTitle">Chưa có file nào</h3>
          <button class="btn-upload-icon" id="pdfUploadBtn" aria-label="Upload PDF file">
            <img src="../../icons/svg/icon/Arrows Action/Upload Square.svg" alt="Upload" style="width: 32px; height: 32px;">
          </button>
          <p class="upload-hint" data-i18n="pdfChatUploadHint" role="note">
            Hỗ trợ: PDF (tối đa 50MB, 200 trang)
          </p>
        </div>
        <div>
          <!-- File input will be handled by input module -->
        </div>
      </div>
    `;
    
    // Setup drag and drop
    this.setupDragAndDrop();
    
    // Setup upload button click handler
    const uploadBtn = document.getElementById('pdfUploadBtn');
    if (uploadBtn) {
      uploadBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent zone click handler
        this.triggerFileInput();
      });
    }
    
    // Hide input container when showing empty state (with delay to ensure it's rendered)
    setTimeout(() => {
      this.hideInputContainer();
      // Ensure file input listener is setup after showing empty state
      if (window.pdfChatController) {
        window.pdfChatController.setupEventListeners();
      }
    }, 100);
    
    console.log('[PDF Chat UI] Empty state rendered successfully');
  }
  
  /**
   * Show error state with retry button
   */
  showErrorState(error, fileName, onRetry, onCancel) {
    console.log('[PDF Chat UI] showErrorState called');
    if (!this.container) {
      console.error('[PDF Chat UI] showErrorState: container is null!');
      return;
    }
    
    // Parse error message to determine error type
    let errorTitle = window.Lang?.get('pdfChatUploadError') || 'Lỗi khi tải lên PDF';
    let errorMessage = error.message || error.toString() || 'Đã xảy ra lỗi không xác định';
    
    // Check for specific error types
    if (errorMessage.includes('quota') || errorMessage.includes('429') || errorMessage.includes('exceeded')) {
      errorMessage = window.Lang?.get('pdfChatQuotaError') || 'Đã vượt quá giới hạn API. Vui lòng thử lại sau vài phút.';
    } else if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
      errorMessage = window.Lang?.get('pdfChatTimeoutError') || 'Quá trình tải lên bị hết thời gian. Vui lòng thử lại.';
    } else if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
      errorMessage = window.Lang?.get('pdfChatNetworkError') || 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối và thử lại.';
    }
    
    console.log('[PDF Chat UI] Rendering error state...');
    this.container.innerHTML = `
      <div class="pdf-error-state">
        <div class="error-icon" aria-hidden="true">
          <img src="../../icons/svg/icon/Essentional, UI/Close Circle.svg" alt="" style="width: 64px; height: 64px; opacity: 0.6;">
        </div>
        <h3>${this.escapeHtml(errorTitle)}</h3>
        <p class="error-message">${this.escapeHtml(errorMessage)}</p>
        ${fileName ? `<p class="error-file-name"><strong>File:</strong> ${this.escapeHtml(fileName)}</p>` : ''}
        <div class="error-actions">
          <button class="btn-primary" id="pdfRetryBtn" aria-label="${window.Lang?.get('pdfChatRetryBtn') || 'Thử lại'}">
            ${window.Lang?.get('pdfChatRetryBtn') || 'Thử lại'}
          </button>
          <button class="btn-secondary" id="pdfCancelBtn" aria-label="${window.Lang?.get('pdfChatCancelBtn') || 'Hủy'}">
            ${window.Lang?.get('pdfChatCancelBtn') || 'Hủy'}
          </button>
        </div>
      </div>
    `;
    
    // Setup retry button
    const retryBtn = document.getElementById('pdfRetryBtn');
    if (retryBtn && onRetry) {
      retryBtn.addEventListener('click', () => {
        console.log('[PDF Chat UI] Retry button clicked');
        onRetry();
      });
    }
    
    // Setup cancel button
    const cancelBtn = document.getElementById('pdfCancelBtn');
    if (cancelBtn && onCancel) {
      cancelBtn.addEventListener('click', () => {
        console.log('[PDF Chat UI] Cancel button clicked');
        onCancel();
      });
    }
    
    console.log('[PDF Chat UI] Error state rendered successfully');
  }
  
  /**
   * Show processing state
   */
  showProcessingState(progress = 0) {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="pdf-processing-state">
        <div class="loading-spinner"></div>
        <p data-i18n="pdfChatProcessing">Đang phân tích tài liệu...</p>
        <div class="progress-container">
          <div class="progress-bar">
            <div class="progress-fill" id="pdfProgressFill" style="width: ${progress}%"></div>
          </div>
          <span class="progress-percentage" id="pdfProgressPercentage">${progress}%</span>
        </div>
      </div>
    `;
  }
  
  /**
   * Update progress
   */
  updateProgress(progress) {
    const progressFill = document.getElementById('pdfProgressFill');
    const progressPercentage = document.getElementById('pdfProgressPercentage');
    
    if (progressFill) {
      progressFill.style.width = `${progress}%`;
    }
    
    if (progressPercentage) {
      progressPercentage.textContent = `${progress}%`;
    }
  }
  
  /**
   * Show ready state (PDF loaded, ready to chat)
   */
  showReadyState(pdfInfo) {
    if (!this.container) return;
    
    const fileSize = (pdfInfo.fileSize / (1024 * 1024)).toFixed(2);

    this.container.innerHTML = `
      <div class="pdf-chat-container">
        <div class="pdf-info-card">
          <div class="pdf-icon" aria-hidden="true">
            <img src="../../icons/svg/icon/Files/File Text.svg" alt="PDF Document" class="icon">
          </div>
          <div class="pdf-details">
            <h4>${this.escapeHtml(pdfInfo.fileName)}</h4>
            <p><img src="../../icons/svg/icon/Business, Statistic/Chart.svg" alt="Pages" class="icon-sm"> ${pdfInfo.numPages !== null && pdfInfo.numPages !== undefined ? pdfInfo.numPages : '?'} trang • ${fileSize} MB • <img src="../../icons/svg/icon/Essentional, UI/Bolt.svg" alt="AI" class="icon-sm"> <span data-i18n="pdfChatReady">Đã phân tích bởi AI</span></p>
          </div>
          <button class="btn-icon-only" id="pdfDeleteBtn" title="${window.Lang?.get('pdfChatDeleteBtnTitle') || 'Delete PDF'}" aria-label="${window.Lang?.get('pdfChatDeleteBtnTitle') || 'Delete PDF and clear chat history'}">
            <img src="../../icons/svg/icon/Essentional, UI/Trash Bin Minimalistic.svg" alt="Delete" class="icon">
          </button>
        </div>

        <div class="pdf-messages-container-wrapper">
          <div class="pdf-messages-container" id="pdfChatMessages" role="log" aria-live="polite" aria-label="Chat messages">
            <!-- Welcome message from AI will be added here -->
          </div>
          <!-- Scroll to Bottom Button -->
          <button class="scroll-to-bottom-btn" id="pdfScrollToBottomBtn" data-tooltip="tooltips.panel.scrollToBottom">
            <img src="../../icons/svg/icon/Arrows/Arrow Down.svg" alt="Scroll to bottom" class="icon">
          </button>
        </div>

        <!-- Note: Input container đã được định nghĩa trong panel.html, không cần render lại ở đây -->
      </div>
    `;
    
    this.messagesContainer = document.getElementById('pdfChatMessages');
    // Chat input will be initialized by input module
    this.chatInput = null;
    this.sendBtn = null;
    this.micBtn = null;
    
    // Show input container when PDF is ready
    this.showInputContainer();
    
    // Setup scroll to bottom button with improved functionality
    if (this.messagesContainer) {
      setupPDFChatScroll(this.messagesContainer, 'pdfScrollToBottomBtn');
    }
    
    // Setup input resize
    this.setupInputResize();
    
    // Welcome message will be added by controller after PDF initialization
  }
  
  /**
   * Add user message to chat
   */
  addUserMessage(message, messageId = null) {
    if (!this.messagesContainer) return null;
    
    const messageEl = document.createElement('div');
    messageEl.className = 'message user-message';
    const finalMessageId = messageId || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    messageEl.dataset.messageId = finalMessageId;
    
    // Get user avatar from Gmail
    const userAvatar = (typeof window !== 'undefined' && window.__AISidePanelUserAvatar) 
      ? window.__AISidePanelUserAvatar 
      : '../../icons/svg/icon/Users/User.svg';
    
    const timestamp = this.formatTimestamp(new Date().toISOString());
    
    messageEl.innerHTML = `
      <div class="message-avatar">
        <img src="${userAvatar}" alt="User" class="${userAvatar.startsWith('http') ? 'user-avatar-img' : ''}">
      </div>
      <div class="message-body">
        <div class="message-content markdown-content" data-raw-content="${this.escapeHtml(message)}">
          ${this.escapeHtml(message)}
        </div>
        <div class="message-footer">
          <span class="timestamp">${timestamp}</span>
          <div class="action-buttons">
            <button class="action-btn copy-btn">
              <img src="../../icons/svg/icon/Essentional, UI/Copy.svg" alt="Copy" class="icon">
            </button>
            <button class="action-btn edit-btn">
              <img src="../../icons/svg/icon/Messages, Conversation/Pen.svg" alt="Edit" class="icon">
            </button>
          </div>
        </div>
      </div>
    `;
    
    this.messagesContainer.appendChild(messageEl);
    this.scrollToBottom();
    
    // Setup action handlers
    this.setupMessageActions(messageEl, message, 'user');
    
    return finalMessageId;
  }
  
  /**
   * Add AI message to chat
   * @param {string} content - Message content (can be empty for streaming)
   * @param {boolean} isStreaming - If true, message is being streamed
   * @param {string} messageId - Optional message ID (for streaming updates)
   */
  addAIMessage(content = '', isStreaming = false, messageId = null) {
    if (!this.messagesContainer) return null;
    
    const messageEl = document.createElement('div');
    messageEl.className = 'message assistant-message';
    messageEl.dataset.messageId = messageId || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // AI avatar from extension
    const aiAvatar = '../../icons/icon-16.png';
    
    const timestamp = this.formatTimestamp(new Date().toISOString());
    
    // Extract thinking content if present (only if content is not empty)
    const { thinking, mainContent } = content ? this.extractThinking(content) : { thinking: null, mainContent: '' };
    
    // Determine initial classes for message-content
    const hasMainContent = mainContent && mainContent.trim().length > 0;
    const hasThinking = thinking && thinking.trim().length > 0;
    let contentClasses = 'message-content markdown-content';
    
    // If streaming with no content, add class to hide background
    if (isStreaming && !hasMainContent && !hasThinking) {
      contentClasses += ' has-cursor-only';
    } else if (hasMainContent) {
      contentClasses += ' has-content';
    }
    
    messageEl.innerHTML = `
      <div class="message-avatar">
        <img src="${aiAvatar}" alt="AI" class="ai-avatar">
      </div>
      <div class="message-body">
        <div class="${contentClasses}" data-raw-content="${this.escapeHtml(mainContent || '')}">
          ${isStreaming ? '<span class="streaming-cursor"></span>' : ''}
        </div>
        <div class="message-footer">
          <span class="timestamp">${timestamp}</span>
          <div class="action-buttons">
            <button class="action-btn copy-btn">
              <img src="../../icons/svg/icon/Essentional, UI/Copy.svg" alt="Copy" class="icon">
            </button>
            <button class="action-btn regenerate-btn">
              <img src="../../icons/svg/icon/Arrows/Refresh Circle.svg" alt="Regenerate" class="icon">
            </button>
          </div>
        </div>
      </div>
    `;
    
    this.messagesContainer.appendChild(messageEl);
    
    // If content is provided and not streaming, render it immediately
    if (content && !isStreaming) {
      const { thinking: finalThinking, mainContent: finalMainContent } = this.extractThinking(content);
      
      // Render markdown content
      const contentDiv = messageEl.querySelector('.message-content');
      if (contentDiv) {
        let renderedContent = finalMainContent;
        if (typeof marked !== 'undefined') {
          try {
            renderedContent = marked.parse(finalMainContent || '');
          } catch (error) {
            console.error('[PDF Chat UI] Markdown parse error:', error);
            renderedContent = this.escapeHtml(finalMainContent || '');
          }
        } else {
          renderedContent = this.escapeHtml(finalMainContent || '');
        }
        contentDiv.innerHTML = renderedContent;
        contentDiv.dataset.rawContent = finalMainContent || '';
      }
      
      // Setup thinking if present
      if (finalThinking) {
        const thinkingStartTime = Date.now();
        const thinkingContainer = document.createElement('div');
        thinkingContainer.className = 'thinking-container';
        thinkingContainer.dataset.startTime = thinkingStartTime.toString();
        thinkingContainer.dataset.isCompleted = 'true';
        thinkingContainer.innerHTML = `
          <div class="thinking-header">
            <img src="../../icons/svg/icon/Messages, Conversation/Chat Round Dots.svg" alt="Suy nghĩ" class="thinking-icon">
            <span class="thinking-label clickable">Đã suy nghĩ trong 2 giây</span>
          </div>
          <div class="thinking-content" style="display: none;"></div>
        `;
        
        const messageBody = messageEl.querySelector('.message-body');
        const contentDiv = messageEl.querySelector('.message-content');
        if (messageBody && contentDiv) {
          messageBody.insertBefore(thinkingContainer, contentDiv);
          this.setupThinkingToggle(messageEl);
        }
      }
      
      // Setup action handlers
      this.setupMessageActions(messageEl, { content: finalMainContent, thinking: finalThinking }, 'assistant');
    }
    
    this.scrollToBottom();
    
    return messageEl;
  }
  
  /**
   * Extract thinking content from message
   */
  extractThinking(content) {
    if (!content || typeof content !== 'string') {
      return {
        thinking: null,
        mainContent: content || '',
        isThinkingOpen: false
      };
    }
    
    const openTag = '<thinking>';
    const closeTag = '</thinking>';
    const openIndex = content.indexOf(openTag);
    
    if (openIndex === -1) {
      return {
        thinking: null,
        mainContent: content,
        isThinkingOpen: false
      };
    }
    
    const closeIndex = content.indexOf(closeTag, openIndex + openTag.length);
    
    if (closeIndex === -1) {
      // Thinking is still streaming (tag opened but not closed)
      const thinkingContent = content.slice(openIndex + openTag.length);
      const mainPart = content.slice(0, openIndex).trim();
      return {
        thinking: thinkingContent,
        mainContent: mainPart,
        isThinkingOpen: true
      };
    }
    
    // Thinking tag is complete
    const thinkingContent = content.slice(openIndex + openTag.length, closeIndex);
    const before = content.slice(0, openIndex);
    const after = content.slice(closeIndex + closeTag.length);
    
    // Combine before and after
    const combined = before + after;
    const trimmed = combined.trim();
    
    // Nếu trimmed empty nhưng có thinking, đó là bình thường (chỉ có thinking, chưa có response)
    // Trả về empty string thay vì whitespace để tránh hiển thị không cần thiết
    const mainContent = trimmed;
    
    return {
      thinking: thinkingContent.trim(), // Trim thinking content để loại bỏ whitespace thừa
      mainContent: mainContent,
      isThinkingOpen: false
    };
  }
  
  /**
   * Setup thinking toggle functionality
   */
  setupThinkingToggle(messageEl) {
    const thinkingContainer = messageEl.querySelector('.thinking-container');
    const labelEl = thinkingContainer?.querySelector('.thinking-label');
    
    if (labelEl) {
      labelEl.addEventListener('click', () => {
        const contentDiv = thinkingContainer.querySelector('.thinking-content');
        if (contentDiv) {
          const isHidden = contentDiv.style.display === 'none';
          contentDiv.style.display = isHidden ? 'block' : 'none';
          
          // Toggle collapsed class
          if (isHidden) {
            thinkingContainer.classList.remove('collapsed');
          } else {
            thinkingContainer.classList.add('collapsed');
          }
        }
      });
    }
  }
  
  /**
   * Setup message action handlers (copy, edit, regenerate)
   */
  setupMessageActions(messageEl, message, role) {
    // Helper function to setup action button
    const setupActionButton = (button, handler) => {
      if (!button) return null;
      
      // Remove any existing event listeners by cloning the node
      const newButton = button.cloneNode(true);
      
      // Xóa title attribute để tránh browser tooltip mặc định
      newButton.removeAttribute('title');
      
      // Thay thế button cũ
      button.parentNode.replaceChild(newButton, button);
      
      // Attach click handler
      if (handler) {
        newButton.addEventListener('click', handler);
      }
      
      return newButton;
    };
    
    // Copy button
    const copyBtn = messageEl.querySelector('.copy-btn');
    if (copyBtn) {
      const newCopyBtn = setupActionButton(copyBtn, async (event) => {
        try {
          // Use the button from event.currentTarget (the new button after clone)
          const button = event.currentTarget || newCopyBtn;
          event.preventDefault();
          event.stopPropagation();
          
          // Try to get text from DOM first (for rendered markdown), fallback to message.content
          let textToCopy = '';
          
          const contentDiv = messageEl.querySelector('.message-content');
          if (contentDiv) {
            // Get text content from rendered HTML (strips markdown formatting)
            textToCopy = contentDiv.innerText || contentDiv.textContent || '';
            
            // If empty, try to get from dataset
            if (!textToCopy && contentDiv.dataset.rawContent) {
              textToCopy = contentDiv.dataset.rawContent;
            }
          }
          
          // Fallback to message.content if still empty
          if (!textToCopy) {
            textToCopy = message.content || message.mainContent || '';
          }
          
          if (!textToCopy || textToCopy.trim().length === 0) {
            console.warn('[PDFChatUI] No content to copy');
            // Không hiển thị toast notification cho PDF Chat
            return;
          }
          
          await navigator.clipboard.writeText(textToCopy.trim());
          
          // Visual feedback on copy button (đồng bộ với Main Chat)
          const iconImg = button.querySelector('img');
          if (iconImg) {
            const originalSrc = iconImg.src;
            const originalAlt = iconImg.alt;
            
            // Get success icon path
            let successIconPath = '../../icons/svg/icon/Essentional, UI/Check Circle.svg';
            try {
              if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
                successIconPath = chrome.runtime.getURL('icons/svg/icon/Essentional, UI/Check Circle.svg');
              }
            } catch (e) {
              console.warn('[PDFChatUI] Could not get success icon URL:', e);
            }
            
            iconImg.src = successIconPath;
            iconImg.alt = 'Copied';
            button.classList.add('copy-success');
            console.log('[PDFChatUI] Copy success - button classes:', button.className, 'icon:', iconImg.src);
            
            setTimeout(() => {
              if (iconImg && button) {
                iconImg.src = originalSrc;
                iconImg.alt = originalAlt;
                button.classList.remove('copy-success');
                console.log('[PDFChatUI] Copy success reset');
              }
            }, 2000);
          }
          
          // Không hiển thị toast notification cho PDF Chat (chỉ dùng visual feedback)
        } catch (error) {
          console.error('[PDFChatUI] Error copying message:', error);
          // Không hiển thị toast notification cho PDF Chat (chỉ log error)
        }
      });
    }
    
    // Edit button (only for user messages)
    const editBtn = messageEl.querySelector('.edit-btn');
    if (editBtn && role === 'user') {
      setupActionButton(editBtn, async () => {
        try {
          // Get message content from DOM first (for rendered markdown), fallback to message.content
          let messageContent = '';
          const contentDiv = messageEl.querySelector('.message-content');
          if (contentDiv) {
            // Get text content from rendered HTML (strips markdown formatting)
            messageContent = contentDiv.innerText || contentDiv.textContent || '';
            
            // If empty, try to get from dataset
            if (!messageContent && contentDiv.dataset.rawContent) {
              messageContent = contentDiv.dataset.rawContent;
            }
          }
          
          // Fallback to message.content if still empty
          if (!messageContent) {
            messageContent = message.content || '';
          }
          
          if (!messageContent || messageContent.trim().length === 0) {
            console.warn('[PDFChatUI] No content to edit');
            return;
          }
          
          // Find current index BEFORE removing element
          const allMessages = document.querySelectorAll('.message');
          const currentIndex = Array.from(allMessages).indexOf(messageEl);
          
          // Remove message element from DOM
          messageEl.remove();
          
          // Remove all messages after this one from DOM
          if (currentIndex !== -1) {
            const remainingMessages = document.querySelectorAll('.message');
            for (let i = currentIndex; i < remainingMessages.length; i++) {
              remainingMessages[i].remove();
            }
          }
          
          // Dispatch event to controller to remove from chat history
          const event = new CustomEvent('pdfEditMessage', {
            detail: { messageId: messageEl.dataset.messageId }
          });
          document.dispatchEvent(event);
          
          // Lấy từ module input mới
          const inputManager = window.inputManager;
          if (!inputManager) {
            console.error('[PDF Chat UI] InputManager not available');
            return;
          }
          
          const pdfChatInput = inputManager.get('pdf-chat-input-container');
          if (pdfChatInput) {
            pdfChatInput.setValue(messageContent.trim());
            pdfChatInput.focus();
          }
          
          // Show success toast (đồng bộ với Main Chat)
          const { showSuccess } = await import('../../panel/utils/toast.js');
          const Lang = window.Lang || { get: (key) => `[${key}]` };
          showSuccess(Lang.get('successMessageEdited') || 'Tin nhắn đã được chỉnh sửa');
        } catch (error) {
          console.error('[PDFChatUI] Error editing message:', error);
          // Show error toast (đồng bộ với Main Chat)
          const { showError } = await import('../../panel/utils/toast.js');
          const Lang = window.Lang || { get: (key) => `[${key}]` };
          showError(Lang.get('errorEditFailed', { error: error.message }) || `Lỗi chỉnh sửa: ${error.message}`);
        }
      });
    }
    
    // Regenerate button (only for AI messages)
    const regenerateBtn = messageEl.querySelector('.regenerate-btn');
    if (regenerateBtn && role === 'assistant') {
      // Use a flag to prevent duplicate event dispatch
      let isRegenerating = false;
      
      setupActionButton(regenerateBtn, (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        if (isRegenerating) {
          console.log('[PDFChatUI] Regenerate already in progress, ignoring click');
          return;
        }
        
        const msgId = messageEl.dataset.messageId;
        console.log('[PDFChatUI] Regenerate button clicked for messageId:', msgId);
        
        if (!msgId) {
          console.error('[PDFChatUI] Cannot regenerate: messageId is missing');
          return;
        }
        
        isRegenerating = true;
        
        // Dispatch event to controller
        const event = new CustomEvent('pdfRegenerateMessage', {
          detail: { 
            messageId: msgId
          },
          bubbles: false, // Don't bubble to prevent duplicate handlers
          cancelable: true
        });
        
        console.log('[PDFChatUI] Dispatching pdfRegenerateMessage event:', event.detail);
        const dispatched = document.dispatchEvent(event);
        console.log('[PDFChatUI] Event dispatched successfully:', dispatched);
        
        // Reset flag after a delay
        setTimeout(() => {
          isRegenerating = false;
        }, 1000);
      });
      
      console.log('[PDFChatUI] Regenerate button handler attached for messageId:', messageEl.dataset.messageId);
    } else if (regenerateBtn && role !== 'assistant') {
      console.warn('[PDFChatUI] Regenerate button found but role is not assistant:', role);
    } else if (!regenerateBtn && role === 'assistant') {
      console.warn('[PDFChatUI] Regenerate button not found for assistant message');
    }
  }
  
  /**
   * Format timestamp
   */
  formatTimestamp(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    
    const time = date.toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    const dateStr = date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    return `${time} | ${dateStr}`;
  }
  
  /**
   * Show typing indicator
   */
  showTyping() {
    if (!this.messagesContainer) return;
    
    // Remove existing typing indicators
    const existingTyping = this.messagesContainer.querySelectorAll('.typing-indicator');
    existingTyping.forEach(el => el.remove());
    
    const typingEl = document.createElement('div');
    typingEl.className = 'message assistant-message typing-indicator';
    typingEl.innerHTML = `
      <div class="message-avatar">
        <img src="../../icons/icon-16.png" alt="AI" class="ai-avatar">
      </div>
      <div class="message-body">
        <div class="typing-text">Đang chuẩn bị câu trả lời...</div>
      </div>
    `;
    
    this.messagesContainer.appendChild(typingEl);
    this.scrollToBottom();
  }
  
  /**
   * Hide typing indicator
   */
  hideTyping() {
    const typingIndicators = this.messagesContainer.querySelectorAll('.typing-indicator');
    typingIndicators.forEach(el => el.remove());
  }
  
  /**
   * Finalize thinking container - ẩn content và đổi label thành "Đã suy nghĩ trong xx giây"
   */
  finalizeThinking(thinkingContainer) {
    if (!thinkingContainer || thinkingContainer.dataset.isCompleted === 'true') {
      return;
    }
    
    const startTime = parseInt(thinkingContainer.dataset.startTime || '0');
    const endTime = Date.now();
    const durationSeconds = Math.round((endTime - startTime) / 1000);
    
    const labelEl = thinkingContainer.querySelector('.thinking-label');
    const contentDiv = thinkingContainer.querySelector('.thinking-content');
    
    if (labelEl) {
      labelEl.textContent = `Đã suy nghĩ trong ${durationSeconds} giây`;
      labelEl.classList.add('clickable');
    }
    
    if (contentDiv) {
      contentDiv.style.display = 'none';
    }
    
    // Dừng animation của icon
    const iconEl = thinkingContainer.querySelector('.thinking-icon');
    if (iconEl) {
      iconEl.style.animation = 'none';
    }
    
    // Thêm class collapsed để bỏ nền và border
    thinkingContainer.classList.add('collapsed');
    
    thinkingContainer.dataset.isCompleted = 'true';
  }
  
  /**
   * Update message content during streaming
   * @param {string} messageId - ID of the message to update
   * @param {string} newContent - New content to append or replace
   * @param {boolean} append - If true, append to existing content; if false, replace
   * @param {boolean} showCursor - If true, show streaming cursor
   * @param {boolean} isComplete - If true, finalize thinking
   */
  updateStreamingMessage(messageId, newContent, append = true, showCursor = false, isComplete = false) {
    const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageEl) {
      console.warn('[PDFChatUI] Message element not found:', messageId);
      return;
    }
    
    const contentDiv = messageEl.querySelector('.message-content');
    if (!contentDiv) {
      console.warn('[PDFChatUI] Message content div not found:', messageId);
      return;
    }
    
    // Get current content from dataset (always use dataset as source of truth)
    const currentContent = append ? (contentDiv.dataset.rawContent || '') : '';
    const updatedContent = currentContent + newContent;
    
    // Update dataset immediately to avoid race conditions
    // Store FULL content (including thinking tags) in dataset
    contentDiv.dataset.rawContent = updatedContent;
    
    // Tách thinking và main content
    const { thinking, mainContent, isThinkingOpen } = this.extractThinking(updatedContent);
    
    // Không log warning nếu chỉ có thinking (đó là bình thường)
    
    // Tạo hoặc cập nhật thinking container
    let thinkingContainer = messageEl.querySelector('.thinking-container');
    
    // Check if we should create thinking container (if thinking tag is opening or exists)
    const shouldCreateThinking = isThinkingOpen || (thinking && thinking.trim().length > 0);
    
    // Track if we just created thinking container (to move cursor)
    let justCreatedThinking = false;
    
    if (shouldCreateThinking && !thinkingContainer) {
      // Tạo thinking container mới
      const thinkingStartTime = Date.now();
      thinkingContainer = document.createElement('div');
      thinkingContainer.className = 'thinking-container';
      thinkingContainer.dataset.startTime = thinkingStartTime.toString();
      thinkingContainer.dataset.isCompleted = 'false';
      thinkingContainer.style.display = 'block'; // Ensure it's visible
      thinkingContainer.innerHTML = `
        <div class="thinking-header">
          <img src="../../icons/svg/icon/Messages, Conversation/Chat Round Dots.svg" alt="Suy nghĩ" class="thinking-icon">
          <span class="thinking-label clickable">Đang suy nghĩ...</span>
        </div>
        <div class="thinking-content"></div>
      `;
      // Chèn thinking container vào message body, trước message-content
      const messageBody = messageEl.querySelector('.message-body');
      if (messageBody) {
        messageBody.insertBefore(thinkingContainer, contentDiv);
      }
      
      // Move cursor from main content to thinking if it exists
      const existingCursor = contentDiv.querySelector('.streaming-cursor');
      if (existingCursor && showCursor) {
        const thinkingContentDiv = thinkingContainer.querySelector('.thinking-content');
        if (thinkingContentDiv) {
          existingCursor.remove();
          thinkingContentDiv.appendChild(existingCursor);
        }
      }
      
      justCreatedThinking = true;
      
      // Thêm click handler để toggle show/hide
      const labelEl = thinkingContainer.querySelector('.thinking-label');
      if (labelEl) {
        labelEl.addEventListener('click', () => {
          const contentDiv = thinkingContainer.querySelector('.thinking-content');
          if (contentDiv) {
            const isHidden = contentDiv.style.display === 'none';
            contentDiv.style.display = isHidden ? 'block' : 'none';
            
            // Toggle class collapsed để hiển thị/ẩn nền và border
            if (isHidden) {
              thinkingContainer.classList.remove('collapsed');
            } else {
              thinkingContainer.classList.add('collapsed');
            }
          }
        });
      }
    }
    
    // Cập nhật thinking content nếu có
    if (thinking && thinkingContainer) {
      const thinkingContentDiv = thinkingContainer.querySelector('.thinking-content');
      if (thinkingContentDiv) {
        // Render thinking với markdown
        let thinkingHtml = '';
        if (typeof marked !== 'undefined') {
          try {
            thinkingHtml = marked.parse(thinking);
          } catch (error) {
            thinkingHtml = this.escapeHtml(thinking);
          }
        } else {
          thinkingHtml = this.escapeHtml(thinking);
        }
        thinkingContentDiv.innerHTML = thinkingHtml;
        // Lưu thinking content vào dataset để dùng sau
        thinkingContainer.dataset.thinkingContent = thinking;
      }
      thinkingContainer.style.display = 'block';
      thinkingContainer.classList.remove('collapsed');
      thinkingContainer.dataset.isCompleted = 'false';
      
      const labelEl = thinkingContainer.querySelector('.thinking-label');
      if (labelEl) {
        labelEl.textContent = 'Đang suy nghĩ...';
      }
      
      if (thinkingContentDiv) {
        thinkingContentDiv.style.display = 'block';
      }
    } else if (thinkingContainer && (isThinkingOpen || shouldCreateThinking)) {
      // Khi chưa có toàn bộ thinking nhưng container tồn tại, giữ border/nền
      thinkingContainer.style.display = 'block';
      thinkingContainer.classList.remove('collapsed');
      thinkingContainer.dataset.isCompleted = 'false';
      
      // Ensure thinking content is visible if thinking is open
      const thinkingContentDiv = thinkingContainer.querySelector('.thinking-content');
      if (thinkingContentDiv && isThinkingOpen) {
        thinkingContentDiv.style.display = 'block';
      }
    } else if (thinkingContainer && !thinking && !isThinkingOpen) {
      // Ẩn thinking container nếu không còn thinking và không đang mở
      thinkingContainer.style.display = 'none';
    }
    
    // Render main content (markdown)
    // IMPORTANT: Always render something, even if mainContent is empty
    // This prevents the message from disappearing
    let renderedHtml = '';
    if (messageEl.classList.contains('assistant-message') && typeof marked !== 'undefined') {
      try {
        // Only parse if mainContent exists, otherwise use empty string
        renderedHtml = mainContent ? marked.parse(mainContent) : '';
      } catch (error) {
        console.warn('[PDFChatUI] Error parsing markdown during stream:', error);
        renderedHtml = this.escapeHtml(mainContent || '');
      }
    } else {
      renderedHtml = this.escapeHtml(mainContent || '');
    }
    
    // If streaming is complete, setup message actions
    if (isComplete) {
      const { thinking: finalThinking, mainContent: finalMainContent } = this.extractThinking(updatedContent);
      this.setupMessageActions(messageEl, { content: finalMainContent, thinking: finalThinking, mainContent: finalMainContent }, 'assistant');
    }
    
    // Nếu không có renderedHtml, hiển thị placeholder để message không biến mất
    if (!renderedHtml) {
      if (thinking) {
        // Có thinking nhưng chưa có mainContent - bình thường
        renderedHtml = '&nbsp;';
      } else if (updatedContent) {
        // Có content nhưng không parse được - fallback
        renderedHtml = this.escapeHtml(updatedContent);
      } else {
        // Hoàn toàn empty - placeholder
        renderedHtml = '&nbsp;';
      }
    }
    
    // Update content first
    contentDiv.innerHTML = renderedHtml || '&nbsp;'; // Use non-breaking space if completely empty
    
    // If streaming is complete, setup message actions (including regenerate button)
    if (isComplete) {
      const { thinking: finalThinking, mainContent: finalMainContent } = this.extractThinking(updatedContent);
      console.log('[PDFChatUI] Streaming complete, setting up message actions for messageId:', messageEl.dataset.messageId);
      this.setupMessageActions(messageEl, { content: finalMainContent, thinking: finalThinking, mainContent: finalMainContent }, 'assistant');
    }
    
    // Determine if we should show background
    const hasMainContent = mainContent && mainContent.trim().length > 0;
    const hasThinking = thinking && thinking.trim().length > 0;
    
    // Check if thinking container exists (even if empty)
    const thinkingContainerExists = messageEl.querySelector('.thinking-container') !== null;
    
    // Check if thinking is complete (tag closed) - if so, cursor should move to main content
    const thinkingComplete = thinkingContainer && !isThinkingOpen && hasThinking;
    
    // If thinking just completed (tag closed), finalize it immediately
    if (thinkingComplete && thinkingContainer && thinkingContainer.dataset.isCompleted !== 'true') {
      this.finalizeThinking(thinkingContainer);
    }
    
    // Remove ALL existing cursors first (before adding new one)
    // But preserve cursor in thinking container ONLY if thinking is still open
    const existingCursors = messageEl.querySelectorAll('.streaming-cursor');
    let cursorToMove = null;
    
    existingCursors.forEach(cursor => {
      // If cursor is in thinking container
      if (thinkingContainer && thinkingContainer.contains(cursor)) {
        // If thinking is still open, keep cursor in thinking
        if (isThinkingOpen) {
          return; // Keep this cursor in thinking
        } else {
          // Thinking is complete, move cursor to main content
          cursorToMove = cursor;
          return;
        }
      }
      // Remove cursor from other places
      cursor.remove();
    });
    
    // If thinking just completed and we have a cursor to move, remove it (will be re-added to main content)
    if (cursorToMove && thinkingComplete) {
      cursorToMove.remove();
      cursorToMove = null;
    }
    
    // Update classes for background visibility
    contentDiv.classList.remove('has-cursor-only', 'has-content');
    if (!hasMainContent && !hasThinking && showCursor && !thinkingContainerExists) {
      // Only cursor, no content yet, and no thinking container
      contentDiv.classList.add('has-cursor-only');
    } else if (hasMainContent) {
      // Has actual content
      contentDiv.classList.add('has-content');
    } else if (thinkingContainerExists && !hasMainContent) {
      // Has thinking container but no main content yet - hide background
      contentDiv.classList.add('has-cursor-only');
    }
    
    // Add cursor if streaming
    // Priority: 
    // 1. Thinking container (if thinking is still open - isThinkingOpen = true)
    // 2. Main content (if thinking is complete OR no thinking OR main content exists)
    if (showCursor) {
      // Check if cursor already exists in thinking container
      const existingCursorInThinking = thinkingContainer ? 
        thinkingContainer.querySelector('.streaming-cursor') : null;
      
      // Determine where cursor should be:
      // - In thinking if: thinking exists AND is still open (isThinkingOpen = true) AND no main content yet
      // - In main content if: thinking is complete OR no thinking OR main content exists
      const shouldPutCursorInThinking = thinkingContainer && isThinkingOpen && !hasMainContent;
      const shouldPutCursorInMain = !shouldPutCursorInThinking;
      
      if (!existingCursorInThinking && shouldPutCursorInThinking) {
        // Create cursor in thinking container (thinking is still streaming)
        const cursorEl = document.createElement('span');
        cursorEl.className = 'streaming-cursor';
        
        if (thinkingContainer) {
          // Add cursor to thinking content
          const thinkingContentDiv = thinkingContainer.querySelector('.thinking-content');
          if (thinkingContentDiv) {
            // Find the deepest text container in thinking content
            const findLastTextContainer = (element) => {
              const children = Array.from(element.children);
              if (children.length === 0) {
                // If no children, check if element has text
                const text = element.textContent || '';
                // Remove cursor text if exists
                const textWithoutCursor = text.replace(/\u200B/g, '').trim();
                return textWithoutCursor ? element : element; // Always return element for thinking
              }
              const lastChild = children[children.length - 1];
              const lastTextContainer = findLastTextContainer(lastChild);
              if (lastTextContainer) {
                return lastTextContainer;
              }
              // If no text container found in children, return this element
              return element;
            };
            
            const lastContainer = findLastTextContainer(thinkingContentDiv);
            if (lastContainer && lastContainer !== thinkingContentDiv) {
              lastContainer.appendChild(cursorEl);
            } else {
              // If thinking content is empty, just append to thinkingContentDiv
              thinkingContentDiv.appendChild(cursorEl);
            }
          }
        }
      } else if (shouldPutCursorInMain) {
        // Create cursor in main content (thinking is complete or no thinking)
        const cursorEl = document.createElement('span');
        cursorEl.className = 'streaming-cursor';
        
        if (!contentDiv.querySelector('.streaming-cursor')) {
          // Strategy: Find the deepest last element that contains text
          // This works well with markdown-rendered content (p, li, etc.)
          const findLastTextContainer = (element) => {
            const children = Array.from(element.children);
            if (children.length === 0) {
              // Leaf element - check if it has text
              return element.textContent.trim() ? element : null;
            }
            
            // Check last child recursively
            const lastChild = children[children.length - 1];
            const lastTextContainer = findLastTextContainer(lastChild);
            if (lastTextContainer) {
              return lastTextContainer;
            }
            
            // If last child has no text, check this element itself
            return element.textContent.trim() ? element : null;
          };
          
          const lastContainer = findLastTextContainer(contentDiv);
          
          if (lastContainer && lastContainer !== contentDiv) {
            // Append cursor to the last text container
            lastContainer.appendChild(cursorEl);
          } else {
            // Fallback: append to contentDiv
            contentDiv.appendChild(cursorEl);
          }
        }
      }
    }
    
    // Finalize thinking nếu streaming đã xong
    if (isComplete && thinkingContainer && thinkingContainer.dataset.isCompleted !== 'true') {
      this.finalizeThinking(thinkingContainer);
    }
    
    // Auto-scroll to bottom
    this.scrollToBottom();
  }
  
  /**
   * Show error message
   */
  showError(message) {
    if (!this.messagesContainer) return;
    
    const errorEl = document.createElement('div');
    errorEl.className = 'pdf-error-message';
    errorEl.innerHTML = `
      <img src="../../icons/svg/icon/Essentional, UI/Close Circle.svg" alt="" style="width: 16px; height: 16px; flex-shrink: 0;">
      <span>${this.escapeHtml(message)}</span>
    `;
    this.messagesContainer.appendChild(errorEl);
    this.scrollToBottom();
    
    setTimeout(() => errorEl.remove(), 5000);
  }
  
  /**
   * Show info message (for processing status)
   */
  showInfo(message) {
    if (!this.messagesContainer) return;
    
    const infoEl = document.createElement('div');
    infoEl.className = 'pdf-info-message';
    infoEl.innerHTML = `
      <div class="loading-spinner-sm"></div>
      <span>${this.escapeHtml(message)}</span>
    `;
    this.messagesContainer.appendChild(infoEl);
    this.scrollToBottom();
    
    // Return element so it can be removed manually
    return infoEl;
  }
  
  /**
   * Show export success notification with link to open file
   */
  showExportSuccess(serviceName, url) {
    if (!this.messagesContainer) return;
    
    const successEl = document.createElement('div');
    successEl.className = 'pdf-export-success';
    successEl.innerHTML = `
      <div class="export-success-content">
        <span class="export-success-icon">
          <img src="../../icons/svg/icon/Essentional, UI/Check Circle.svg" alt="Success" style="width: 20px; height: 20px; flex-shrink: 0;">
        </span>
        <span class="export-success-text">
          ${this.escapeHtml(window.Lang?.get('pdfChatExportSuccess') || 'File created successfully!')}
        </span>
        <a href="${url}" target="_blank" rel="noopener noreferrer" class="export-success-link">
          <img src="../../icons/svg/icon/Arrows/Arrow Right Up.svg" alt="Open" style="width: 14px; height: 14px;">
          <span>${this.escapeHtml(window.Lang?.get('pdfChatExportOpenFile') || 'Open file')}</span>
        </a>
        <button class="export-success-close" aria-label="Close" title="Close">
          <img src="../../icons/svg/icon/Essentional, UI/Close Circle.svg" alt="Close" style="width: 18px; height: 18px;">
        </button>
      </div>
    `;
    
    // Add close button functionality
    const closeBtn = successEl.querySelector('.export-success-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (successEl && successEl.parentNode) {
          successEl.remove();
        }
      });
    }
    
    this.messagesContainer.appendChild(successEl);
    this.scrollToBottom();
    
    // Link will remain visible until user manually closes it
  }
  
  /**
   * Trigger file input click
   */
  triggerFileInput() {
    // Try to find file input, wait a bit if not found (might be still rendering)
    const fileInput = document.getElementById('pdf-chat-input-container-fileInput');
    if (fileInput) {
      fileInput.click();
    } else {
      console.warn('[PDF Chat UI] File input not found, waiting and retrying...');
      // Retry after a short delay in case input is still being rendered
      setTimeout(() => {
        const retryInput = document.getElementById('pdf-chat-input-container-fileInput');
        if (retryInput) {
          retryInput.click();
        } else {
          console.error('[PDF Chat UI] File input still not found after retry');
        }
      }, 100);
    }
  }

  /**
   * Hide input container
   */
  hideInputContainer() {
    const inputContainer = document.getElementById('pdf-chat-input-container');
    if (inputContainer) {
      inputContainer.style.display = 'none';
    }
  }

  /**
   * Show input container
   */
  showInputContainer() {
    const inputContainer = document.getElementById('pdf-chat-input-container');
    if (inputContainer) {
      inputContainer.style.display = '';
    }
  }

  /**
   * Setup drag and drop
   */
  setupDragAndDrop() {
    const zone = document.getElementById('pdfUploadZone');
    if (!zone) return;
    
    // Click handler for upload zone (but not for the button inside)
    zone.addEventListener('click', (e) => {
      // Don't trigger if clicking on the upload button (it has its own handler)
      if (e.target.closest('#pdfUploadBtn')) {
        return;
      }
      
      // Trigger file input
      this.triggerFileInput();
    });
    
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('drag-over');
    });
    
    zone.addEventListener('dragleave', () => {
      zone.classList.remove('drag-over');
    });
    
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      
      const file = e.dataTransfer.files[0];
      if (file && file.type === 'application/pdf') {
        // Trigger file input change event
        const event = new Event('pdfFileSelected', { bubbles: true });
        event.file = file;
        document.dispatchEvent(event);
      }
    });
  }
  
  /**
   * Scroll to bottom (with requestAnimationFrame for performance)
   * Now uses the improved scroll utility
   */
  scrollToBottom() {
    if (this.messagesContainer) {
      scrollToBottomUtil(this.messagesContainer);
    }
  }
  
  /**
   * Escape HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * Clear container
   */
  clear() {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.messagesContainer = null;
  }

  /**
   * Clear messages only (keep container structure)
   */
  clearMessages() {
    if (this.messagesContainer) {
      // Remove all message elements but keep container structure
      const messages = this.messagesContainer.querySelectorAll('.user-message, .ai-message, .pdf-message, .message, [data-message-id]');
      messages.forEach(msg => msg.remove());
      
      // Also clear any remaining content
      this.messagesContainer.innerHTML = '';
    }
    
    // Also clear from main container if messages are directly there
    if (this.container) {
      const allMessages = this.container.querySelectorAll('.user-message, .ai-message, .pdf-message, .message, [data-message-id]');
      allMessages.forEach(msg => msg.remove());
    }
  }

  /**
   * Setup auto-hide scroll functionality
   * @deprecated - Now handled by setupPDFChatScroll in scroll.js
   * Kept for backward compatibility but scroll setup is done in showChatState()
   */
  setupAutoHideScroll() {
    // Scroll setup is now handled by setupPDFChatScroll() in showChatState()
    // This method is kept for backward compatibility
    console.log('[PDF Chat UI] Scroll setup is now handled by scroll.js module');
  }
  
  /**
   * Add scroll to bottom button
   * @deprecated - Now handled by setupPDFChatScroll in scroll.js
   * Kept for backward compatibility
   */
  addScrollToBottomButton() {
    // Scroll button setup is now handled by setupPDFChatScroll() in scroll.js
    // This method is kept for backward compatibility
    console.log('[PDF Chat UI] Scroll button setup is now handled by scroll.js module');
  }

  /**
   * Setup input resize - will be handled by input module
   */
  setupInputResize() {
    // Input resize will be handled by input module
    console.log('[PDF Chat UI] Input resize will be handled by input module');
  }
}


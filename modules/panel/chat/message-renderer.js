// message-renderer.js
// Module xử lý render messages và files

import { enhancedStorageManager } from '../utils/panel-utils.js';
import { PendingImagesDB } from '../storage/pending-images-db.js';
import { compressImage } from '../media/image-processor.js';

// Helper functions
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function formatTimestamp(isoString) {
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

export function updateTimestamp(messageEl, timestamp) {
  const timestampEl = messageEl.querySelector('.timestamp');
  if (timestampEl) {
    timestampEl.textContent = formatTimestamp(timestamp);
  }
}

export function scrollToBottom() {
  const container = document.getElementById('messagesContainer');
  if (!container) return;
  window._isProgrammaticScroll = true;
  requestAnimationFrame(() => {
    container.scrollTop = container.scrollHeight;
    window._isProgrammaticScroll = false;
  });
}

/**
 * Tách thinking và content từ raw content
 * @param {string} content - Raw content có thể chứa <thinking>...</thinking> hoặc <think>...</think> hoặc <think>...</think>
 * @returns {Object} { thinking: string, mainContent: string }
 */
function extractThinking(content) {
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
    // Thẻ mở nhưng chưa đóng - thinking đang stream
    const thinkingContent = content.slice(openIndex + openTag.length);
    const mainPart = content.slice(0, openIndex);
    return {
      thinking: thinkingContent,
      mainContent: mainPart,
      isThinkingOpen: true
    };
  }
  
  const thinkingContent = content.slice(openIndex + openTag.length, closeIndex);
  const before = content.slice(0, openIndex);
  const after = content.slice(closeIndex + closeTag.length);
  
  return {
    thinking: thinkingContent,
    mainContent: (before + after).trim(),
    isThinkingOpen: false
  };
}

/**
 * Finalize thinking container - ẩn content và đổi label thành "Đã suy nghĩ trong xx giây"
 * @param {HTMLElement} thinkingContainer - Thinking container element
 */
function finalizeThinking(thinkingContainer) {
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
export function updateMessageContent(messageId, newContent, append = true, showCursor = true, isComplete = false) {
  const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
  if (!messageEl) {
    console.warn('[MessageRenderer] Message element not found:', messageId);
    return;
  }
  
  const contentDiv = messageEl.querySelector('.message-content');
  if (!contentDiv) {
    console.warn('[MessageRenderer] Message content div not found:', messageId);
    return;
  }
  
  // Get current content from dataset (always use dataset as source of truth)
  const currentContent = append ? (contentDiv.dataset.rawContent || '') : '';
  const updatedContent = currentContent + newContent;
  
  // Update dataset immediately to avoid race conditions
  contentDiv.dataset.rawContent = updatedContent;
  
  // Tách thinking và main content
  const { thinking, mainContent, isThinkingOpen } = extractThinking(updatedContent);
  
  // Tạo hoặc cập nhật thinking container
  let thinkingContainer = messageEl.querySelector('.thinking-container');
  
  // Check if we should create thinking container (if thinking tag is opening or exists)
  const shouldCreateThinking = isThinkingOpen || (thinking && thinking.trim().length > 0);
  
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
      // Render thinking với markdown nhưng không có các thẻ HTML phức tạp
      let thinkingHtml = '';
      if (typeof marked !== 'undefined') {
        try {
          thinkingHtml = marked.parse(thinking);
        } catch (error) {
          thinkingHtml = escapeHtml(thinking);
        }
      } else {
        thinkingHtml = escapeHtml(thinking);
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
  
  // Render main content (markdown if it's an assistant message)
  let renderedHtml = '';
  if (messageEl.classList.contains('assistant') && typeof marked !== 'undefined') {
    try {
      renderedHtml = marked.parse(mainContent || '');
      // Sau khi parse markdown, loại bỏ thẻ <think> nếu có trong HTML
      const redactedReasoningRegex = /<redacted_reasoning[^>]*>([\s\S]*?)<\/redacted_reasoning>/gi;
      renderedHtml = renderedHtml.replace(redactedReasoningRegex, '').trim();
    } catch (error) {
      console.warn('[MessageRenderer] Error parsing markdown during stream:', error);
      renderedHtml = escapeHtml(mainContent || '');
    }
  } else {
    renderedHtml = escapeHtml(mainContent || '');
  }
  
  // Update content first
  contentDiv.innerHTML = renderedHtml;
  
  // Determine if we should show background
  const hasMainContent = mainContent && mainContent.trim().length > 0;
  const hasThinking = thinking && thinking.trim().length > 0;
  
  // Check if thinking container exists (even if empty)
  const thinkingContainerExists = messageEl.querySelector('.thinking-container') !== null;
  
  // Check if thinking is complete (tag closed) - if so, cursor should move to main content
  const thinkingComplete = thinkingContainer && !isThinkingOpen && hasThinking;
  
  // If thinking just completed (tag closed), finalize it immediately
  if (thinkingComplete && thinkingContainer && thinkingContainer.dataset.isCompleted !== 'true') {
    finalizeThinking(thinkingContainer);
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
  // Priority: 1. Thinking container (if thinking is still open), 2. Main content (if thinking is complete or no thinking)
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
      // Create cursor in thinking container
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
  }
  
  // Finalize thinking nếu streaming đã xong
  if (isComplete && thinkingContainer && thinkingContainer.dataset.isCompleted !== 'true') {
    finalizeThinking(thinkingContainer);
  }
  
  // Auto-scroll to bottom
  scrollToBottom();
}

export function getFileTypeIcon(fileType, fileName) {
  const ext = fileName ? fileName.split('.').pop().toLowerCase() : '';
  const type = fileType ? fileType.toLowerCase() : '';
  
  // Get icon path using chrome.runtime.getURL
  const getIconPath = (iconName) => {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
        // Map old icon names to new icon paths
        const iconMap = {
            'icon-thinking.svg': 'icons/svg/icon/Messages, Conversation/Chat Round Dots.svg',
            'icon-copy.svg': 'icons/svg/icon/Essentional, UI/Copy.svg',
            'icon-regenerate.svg': 'icons/svg/icon/Arrows/Refresh Circle.svg',
            'icon-edit.svg': 'icons/svg/icon/Messages, Conversation/Pen.svg',
            'icon-user.svg': 'icons/svg/icon/Users/User.svg'
        };
        
        if (iconMap[iconName]) {
            return chrome.runtime.getURL(iconMap[iconName]);
        }
        
        return chrome.runtime.getURL(`icons/svg/${iconName}`);
      }
    } catch (error) {
      console.warn('[MessageRenderer] Could not get icon URL:', error);
    }
    // Fallback to relative path
    // Map old icon names to new icon paths
    const iconMap = {
        'icon-thinking.svg': '../../icons/svg/icon/Messages, Conversation/Chat Round Dots.svg',
        'icon-copy.svg': '../../icons/svg/icon/Essentional, UI/Copy.svg',
        'icon-regenerate.svg': '../../icons/svg/icon/Arrows/Refresh Circle.svg',
        'icon-edit.svg': '../../icons/svg/icon/Messages, Conversation/Pen.svg',
        'icon-user.svg': '../../icons/svg/icon/Users/User.svg'
    };
    
    if (iconMap[iconName]) {
        return iconMap[iconName];
    }
    
    return `../../icons/svg/${iconName}`;
  };
  
  // Determine file category and corresponding icon
  let iconName = 'icon-holder.svg'; // default icon
  
  // PDF files
  if (type.includes('pdf') || ext === 'pdf') {
    iconName = 'icon-pdf.svg';
  }
  // Word documents
  else if (type.includes('word') || type.includes('document') || 
           ext === 'doc' || ext === 'docx' ||
           type.includes('msword') || type.includes('wordprocessingml')) {
    iconName = 'icon-word.svg';
  }
  // Excel files
  else if (type.includes('excel') || type.includes('spreadsheet') || 
           ext === 'xls' || ext === 'xlsx' ||
           type.includes('ms-excel') || type.includes('spreadsheetml')) {
    iconName = 'icon-excel.svg';
  }
  // PowerPoint files
  else if (type.includes('powerpoint') || type.includes('presentation') || 
           ext === 'ppt' || ext === 'pptx' ||
           type.includes('ms-powerpoint') || type.includes('presentationml')) {
    iconName = 'icon-ppt.svg';
  }
  // Text files
  else if (type.includes('text') || type.includes('plain') || ext === 'txt') {
    iconName = 'icon-txt.svg';
  }
  // CSV files
  else if (type.includes('csv') || ext === 'csv' || type.includes('text/csv')) {
    iconName = 'icon-csv.svg';
  }
  // CSS files
  else if (type.includes('css') || ext === 'css' || type.includes('text/css')) {
    iconName = 'icon-css.svg';
  }
  // Image files (keep existing behavior for images)
  else if (type.startsWith('image/')) {
    // For images, return empty string as they will be displayed as <img> tags
    return '';
  }
  
  const iconPath = getIconPath(iconName);
  return `<img src="${iconPath}" alt="${ext || 'file'}" class="attached-file-icon-img">`;
}

export function createFilesContainer(attachedFiles, images) {
  const allFiles = [];
  
  // Add images first (with preview)
  if (images && images.length > 0) {
    images.forEach(img => {
      allFiles.push({
        type: 'image',
        dataUrl: img.dataUrl,
        fileName: img.fileName || 'image.png',
        fileType: img.fileType || 'image/png',
        size: null
      });
    });
  }
  
  // Add non-image files
  if (attachedFiles && attachedFiles.length > 0) {
    attachedFiles.forEach(file => {
      allFiles.push({
        type: 'file',
        dataUrl: file.dataUrl,
        fileName: file.fileName || 'Unknown',
        fileType: file.fileType || 'application/octet-stream',
        size: file.size
      });
    });
  }
  
  if (allFiles.length === 0) return '';
  
  const filesHTML = allFiles.map((file, index) => {
    if (file.type === 'image') {
      // Image preview
      const fileName = escapeHtml(file.fileName);
      return `
        <div class="attached-file-item attached-image-item" data-file-index="${index}">
          <img src="${escapeHtml(file.dataUrl)}" alt="${fileName}" class="attached-image-preview">
          <div class="attached-file-name">${fileName}</div>
        </div>
      `;
    } else {
      // Non-image file with icon
      const icon = getFileTypeIcon(file.fileType, file.fileName);
      const fileName = escapeHtml(file.fileName);
      const fileSize = file.size ? `(${(file.size / 1024).toFixed(1)} KB)` : '';
      return `
        <div class="attached-file-item attached-document-item" data-file-index="${index}">
          <div class="attached-file-icon">${icon}</div>
          <div class="attached-file-info">
            <div class="attached-file-name">${fileName}</div>
            ${fileSize ? `<div class="attached-file-size">${fileSize}</div>` : ''}
          </div>
        </div>
      `;
    }
  }).join('');
  
  return `
    <div class="attached-files-container">
      <button class="attached-files-scroll-btn attached-files-scroll-left" aria-label="Scroll left">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>
      <div class="attached-files-scroll-wrapper">
        <div class="attached-files-list">${filesHTML}</div>
      </div>
      <button class="attached-files-scroll-btn attached-files-scroll-right" aria-label="Scroll right">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>
    </div>
  `;
}

const DEFAULT_AI_AVATAR = '../../icons/icon-16.png';
const DEFAULT_USER_AVATAR = '../../icons/svg/icon/Users/User.svg';

function getAvatarMetadata(role) {
  if (role === 'assistant') {
    return { src: DEFAULT_AI_AVATAR, className: '' };
  }
  const userAvatar = (typeof window !== 'undefined' && window.__AISidePanelUserAvatar) 
    ? window.__AISidePanelUserAvatar 
    : DEFAULT_USER_AVATAR;
  const className = userAvatar.startsWith('http') ? 'user-avatar-img' : '';
  return { src: userAvatar, className };
}

function getAvatarHTML(role) {
  const { src, className } = getAvatarMetadata(role);
  const label = role === 'assistant' ? 'AI' : 'User';
  const classAttr = className ? ` class="${className}"` : '';
  return `
    <div class="message-avatar">
      <img src="${src}" alt="${label}"${classAttr}>
    </div>
  `;
}

export async function renderMessage(message, Lang, showError, showSuccess, actionHandlers) {
  const container = document.getElementById('messagesContainer');
  if (!container) return;
  
  const messageEl = document.createElement('div');
  messageEl.className = `message ${message.role}`;
  if (message.role === 'user' || message.role === 'assistant') {
    messageEl.classList.add(`${message.role}-message`);
  }
  messageEl.dataset.messageId = message.id || Date.now().toString();
  
  const timestamp = formatTimestamp(message.timestamp || new Date().toISOString());
  const content = message.content || '';
  
  // Tách thinking và main content
  const { thinking, mainContent, isThinkingOpen } = extractThinking(content);
  
  // Tạo thinking HTML nếu có
  let thinkingHTML = '';
  if (thinking && message.role === 'assistant') {
    let thinkingRendered = '';
    if (typeof marked !== 'undefined') {
      try {
        thinkingRendered = marked.parse(thinking);
      } catch (error) {
        thinkingRendered = escapeHtml(thinking);
      }
    } else {
      thinkingRendered = escapeHtml(thinking);
    }
    
    // Tính thời gian thinking (giả sử 2 giây mặc định nếu không có timestamp)
    // Trong thực tế, nên lưu thinkingStartTime và thinkingEndTime trong message metadata
    const thinkingDuration = 2; // Mặc định 2 giây, có thể lấy từ message metadata nếu có
    
    const collapsedClass = isThinkingOpen ? '' : ' collapsed';
    const iconClass = isThinkingOpen ? 'thinking-icon' : 'thinking-icon thinking-icon-paused';
    const contentClass = isThinkingOpen ? 'thinking-content' : 'thinking-content d-none';
    const labelText = isThinkingOpen ? 'Đang suy nghĩ...' : `Đã suy nghĩ trong 2 giây`;
    
    thinkingHTML = `
      <div class="thinking-container${collapsedClass}" data-is-completed="${isThinkingOpen ? 'false' : 'true'}">
        <div class="thinking-header">
          <img src="../../icons/svg/icon/Messages, Conversation/Chat Round Dots.svg" alt="Suy nghĩ" class="${iconClass}">
          <span class="thinking-label clickable">${labelText}</span>
        </div>
        <div class="${contentClass}">${thinkingRendered}</div>
      </div>
    `;
  }
  
  // Render markdown for assistant messages, plain text for user messages
  let renderedContent;
  if (message.role === 'assistant' && typeof marked !== 'undefined') {
    try {
      // Use marked.js to render markdown to HTML
      let markdownHtml = marked.parse(mainContent || '');
      // Sau khi parse markdown, loại bỏ thẻ <think> nếu có trong HTML
      const redactedReasoningRegex = /<redacted_reasoning[^>]*>([\s\S]*?)<\/redacted_reasoning>/gi;
      markdownHtml = markdownHtml.replace(redactedReasoningRegex, '').trim();
      renderedContent = markdownHtml;
    } catch (error) {
      console.warn('[MessageRenderer] Error parsing markdown, using plain text:', error);
      renderedContent = escapeHtml(mainContent || '');
    }
  } else {
    // User messages: plain text (escaped)
    renderedContent = escapeHtml(mainContent || '');
  }
  
  // Create files container if there are attached files or images
  const filesHTML = createFilesContainer(message.attachedFiles, message.images);
  
  const avatarHTML = getAvatarHTML(message.role);
  
  // Determine initial classes for message-content
  const hasMainContent = mainContent && mainContent.trim().length > 0;
  const hasThinking = thinking && thinking.trim().length > 0;
  let contentClasses = `message-content markdown-content${filesHTML ? ' has-attachments' : ''}`;
  
  // If assistant message with no content, add class to hide background and show cursor
  const isStreaming = message.role === 'assistant' && !hasMainContent && !hasThinking;
  if (isStreaming) {
    contentClasses += ' has-cursor-only';
  } else if (message.role === 'assistant' && hasMainContent) {
    contentClasses += ' has-content';
  }
  
  messageEl.innerHTML = `
    ${avatarHTML}
    <div class="message-body">
      ${filesHTML}
      ${thinkingHTML}
      <div class="${contentClasses}" data-raw-content="${escapeHtml(content)}">
        ${renderedContent}
        ${isStreaming ? '<span class="streaming-cursor"></span>' : ''}
      </div>
      <div class="message-footer">
        <span class="timestamp">${timestamp}</span>
        <div class="action-buttons">
          <button class="action-btn copy-btn">
            <img src="../../icons/svg/icon/Essentional, UI/Copy.svg" alt="Copy" class="icon">
          </button>
          ${message.role === 'assistant' ? `
            <button class="action-btn regenerate-btn">
              <img src="../../icons/svg/icon/Arrows/Refresh Circle.svg" alt="Regenerate" class="icon">
            </button>
          ` : `
            <button class="action-btn edit-btn">
              <img src="../../icons/svg/icon/Messages, Conversation/Pen.svg" alt="Edit" class="icon">
            </button>
          `}
        </div>
      </div>
    </div>
  `;
  
  container.appendChild(messageEl);
  scrollToBottom();
  
  // Thêm click handler cho thinking label nếu có
  if (thinkingHTML) {
    const thinkingContainer = messageEl.querySelector('.thinking-container');
    if (thinkingContainer) {
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
  }
  
  // Setup scroll buttons for attached files container
  const filesContainer = messageEl.querySelector('.attached-files-container');
  if (filesContainer) {
    const scrollWrapper = filesContainer.querySelector('.attached-files-scroll-wrapper');
    const scrollList = filesContainer.querySelector('.attached-files-list');
    const leftBtn = filesContainer.querySelector('.attached-files-scroll-left');
    const rightBtn = filesContainer.querySelector('.attached-files-scroll-right');
    
    if (scrollWrapper && scrollList && leftBtn && rightBtn) {
      const updateScrollButtons = () => {
        const scrollLeft = scrollWrapper.scrollLeft;
        const maxScroll = scrollWrapper.scrollWidth - scrollWrapper.clientWidth;
        const canScroll = maxScroll > 1;
        
        // Always show buttons, but disable when not needed
        leftBtn.disabled = scrollLeft <= 0 || !canScroll;
        rightBtn.disabled = scrollLeft >= maxScroll - 1 || !canScroll;
      };
      
      leftBtn.addEventListener('click', () => {
        if (!leftBtn.disabled) {
          scrollWrapper.scrollBy({ left: -200, behavior: 'smooth' });
        }
      });
      
      rightBtn.addEventListener('click', () => {
        if (!rightBtn.disabled) {
          scrollWrapper.scrollBy({ left: 200, behavior: 'smooth' });
        }
      });
      
      scrollWrapper.addEventListener('scroll', updateScrollButtons);
      
      // Also listen for resize to update button states
      const resizeObserver = new ResizeObserver(() => {
        updateScrollButtons();
      });
      resizeObserver.observe(scrollWrapper);
      resizeObserver.observe(scrollList);
      
      // Initial check with multiple attempts to ensure accurate measurement
      setTimeout(updateScrollButtons, 100);
      setTimeout(updateScrollButtons, 300);
      setTimeout(updateScrollButtons, 500);
    }
  }
  
  // Attach event listeners if handlers are provided
  if (actionHandlers) {
    // Helper function to setup action button
    const setupActionButton = (button, handler) => {
      if (!button) return null;
      
      // Remove any existing event listeners by cloning the node
      const newButton = button.cloneNode(true);
      
      // Xóa title attribute để tránh browser tooltip mặc định
      newButton.removeAttribute('title');
      
      // Thay thế button cũ
      button.parentNode.replaceChild(newButton, button);
      
      // Attach click handler với preventDefault và stopPropagation
      if (handler) {
        newButton.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          handler(event);
        }, { capture: false });
      }
      
      // Ensure button is clickable
      newButton.style.pointerEvents = 'auto';
      newButton.style.cursor = 'pointer';
      
      return newButton;
    };
    
    const copyBtn = messageEl.querySelector('.copy-btn');
    if (copyBtn && actionHandlers.handleCopyMessage) {
      console.log('[MessageRenderer] Setting up copy button for message:', message.id);
      const newCopyBtn = setupActionButton(copyBtn, (event) => {
        console.log('[MessageRenderer] Copy button clicked for message:', message.id);
        event.stopPropagation(); // Prevent event bubbling
        // Use the button from event.currentTarget (the new button)
        const button = event.currentTarget || newCopyBtn;
        actionHandlers.handleCopyMessage(message, Lang, showSuccess, showError, button);
      });
      console.log('[MessageRenderer] Copy button setup complete, button:', newCopyBtn);
    } else {
      console.warn('[MessageRenderer] Copy button not found or handler missing:', {
        copyBtn: !!copyBtn,
        handler: !!actionHandlers?.handleCopyMessage
      });
    }
    
    const editBtn = messageEl.querySelector('.edit-btn');
    if (editBtn && actionHandlers.handleEditMessage) {
      setupActionButton(editBtn, () => {
        actionHandlers.handleEditMessage(messageEl, message, Lang, showSuccess);
      });
    }
    
    const regenerateBtn = messageEl.querySelector('.regenerate-btn');
    if (regenerateBtn && actionHandlers.handleRegenerateMessage) {
      setupActionButton(regenerateBtn, async () => {
        console.log('[MessageRenderer] Regenerate button clicked');
        await actionHandlers.handleRegenerateMessage(messageEl, message, Lang, showError);
      });
    }
  }
  
  return messageEl;
}


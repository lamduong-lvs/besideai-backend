// pdf-history-controller.js
// Module quản lý PDF Chat history panel

import { PDFStorage } from '../storage/pdf-storage.js';
import { SlideInPanel } from '../../panel/components/SlideInPanel.js';

let historyPanel = null;
let storage = null;

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function createHistoryPanelInstance(Lang) {
  if (!historyPanel) {
    historyPanel = new SlideInPanel({
      id: 'pdfHistoryPanel',
      wrapperClass: 'pdf-history-panel',
      title: 'pdfChatHistoryTitle',
      overlayClass: 'pdf-history-overlay',
      contentClass: 'pdf-history-content',
      headerClass: 'pdf-history-header',
      titleClass: 'pdf-history-title',
      closeBtnId: 'pdfHistoryClose',
      bodyId: 'pdfHistoryPanelBody',
      onClose: () => {
        historyPanel = null;
      }
    });
  }
  return historyPanel;
}

export function closePDFHistoryPanel() {
  if (historyPanel) {
    historyPanel.close();
  }
}

export async function openPDFHistoryPanel(Lang, showError, onLoadSession) {
  if (!storage) {
    storage = new PDFStorage();
  }
  
  const panel = createHistoryPanelInstance(Lang);
  panel.open(Lang);
  await loadPDFHistoryList(Lang, showError, onLoadSession);
}

async function loadPDFHistoryList(Lang, showError, onLoadSession) {
  const body = document.getElementById('pdfHistoryPanelBody');
  if (!body) return;
  
  try {
    const sessions = await storage.getAllSessions();
    
    // Get current session ID to exclude it
    const currentSession = await storage.loadSession();
    const currentSessionId = currentSession ? currentSession.id : null;
    
    // Filter out current session
    const historySessions = sessions.filter(session => {
      if (session.id === currentSessionId) return false;
      // Check if session has chat history
      const hasHistory = session.chatHistory && session.chatHistory.length > 0;
      return hasHistory;
    });
    
    if (historySessions.length === 0) {
      body.innerHTML = `
        <div class="history-empty">
          <svg class="history-empty-icon" viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2" fill="none"/>
          </svg>
          <div>${Lang.get("pdfChatHistoryEmpty") || "Chưa có lịch sử chat"}</div>
        </div>
      `;
      return;
    }
    
    body.innerHTML = '';
    
    // Sort by date (newest first)
    historySessions.sort((a, b) => {
      const dateA = a.savedAt || 0;
      const dateB = b.savedAt || 0;
      return dateB - dateA;
    });
    
    historySessions.forEach(session => {
      const item = createPDFHistoryItem(session, Lang, showError, onLoadSession);
      body.appendChild(item);
    });
  } catch (error) {
    console.error('[PDFHistoryController] loadPDFHistoryList error:', error);
    body.innerHTML = `
      <div class="history-empty">
        <div>${Lang.get("pdfChatHistoryError", { error: error.message }) || `Lỗi: ${error.message}`}</div>
      </div>
    `;
  }
}

function createPDFHistoryItem(session, Lang, showError, onLoadSession) {
  const item = document.createElement('div');
  item.className = 'history-item';
  
  const fileName = session.pdfInfo?.fileName || Lang.get("pdfChatHistoryUntitled") || "Tài liệu không tên";
  const preview = getSessionPreview(session);
  const messageCount = session.chatHistory?.length || 0;
  
  const date = new Date(session.savedAt || Date.now()).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  item.innerHTML = `
    <div class="history-item-header">
      <div class="history-item-title">
        <img src="../../icons/svg/icon/Files/File%20Text.svg" width="16" height="16" alt="PDF" class="history-type-icon">
        ${escapeHtml(fileName)}
      </div>
      <div class="history-item-date">${date}</div>
    </div>
    <div class="history-item-preview">${escapeHtml(preview)}</div>
    <div class="history-item-meta">${messageCount} tin nhắn</div>
    <div class="history-item-actions">
      <button class="history-action-btn open-btn">${Lang.get("historyOpen") || "Mở"}</button>
      <button class="history-action-btn delete-btn delete">${Lang.get("historyDelete") || "Xóa"}</button>
    </div>
  `;
  
  item.querySelector('.open-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    loadPDFHistorySession(session.id, Lang, showError, onLoadSession);
  });
  
  item.querySelector('.delete-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    deletePDFHistorySession(session.id, Lang, showError);
  });
  
  item.addEventListener('click', () => loadPDFHistorySession(session.id, Lang, showError, onLoadSession));
  
  return item;
}

function getSessionPreview(session) {
  if (!session.chatHistory || session.chatHistory.length === 0) {
    return "Không có tin nhắn";
  }
  
  // Get first user message (skip initial prompt)
  for (let i = 1; i < session.chatHistory.length; i++) {
    const msg = session.chatHistory[i];
    if (msg.role === 'user' && msg.message) {
      return msg.message.length > 100 
        ? msg.message.substring(0, 100) + '...'
        : msg.message;
    }
  }
  
  return "Không có preview";
}

async function loadPDFHistorySession(sessionId, Lang, showError, onLoadSession) {
  try {
    const session = await storage.getSession(sessionId);
    if (!session) {
      showError(Lang.get("pdfChatHistoryNotFound") || "Không tìm thấy lịch sử");
      return;
    }
    
    // Call the callback to load the session
    if (onLoadSession && typeof onLoadSession === 'function') {
      await onLoadSession(session);
    }
    
    closePDFHistoryPanel();
  } catch (error) {
    console.error('[PDFHistoryController] loadPDFHistorySession error:', error);
    showError(Lang.get("pdfChatHistoryLoadError", { error: error.message }) || `Lỗi: ${error.message}`);
  }
}

async function deletePDFHistorySession(sessionId, Lang, showError) {
  try {
    await storage.deleteSession(sessionId);
    await loadPDFHistoryList(Lang, showError, null);
  } catch (error) {
    console.error('[PDFHistoryController] deletePDFHistorySession error:', error);
    showError(Lang.get("pdfChatHistoryDeleteError", { error: error.message }) || `Lỗi: ${error.message}`);
  }
}

export function initializePDFHistoryPanel(Lang, showError, onLoadSession) {
  // History button event listener will be set up in PDF Chat UI
}


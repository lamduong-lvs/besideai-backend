/**
 * PDF Chat Module Entry Point
 * Exports the main controller for PDF Chat functionality
 */

import * as PDFChatControllerModule from './core/pdf-chat-controller.js';
const PDFChatController = PDFChatControllerModule.PDFChatController;
import { switchToPdfChatInput } from './input-integration.js';

console.log('[PDF Chat] Imported PDFChatController:', PDFChatController);


// Note: Submit được handle bởi onSubmit callback trong switchToPdfChatInput

// Khởi tạo PDF Chat khi được gọi từ panel
window.initPDFChat = async function () {
  console.log('[PDF Chat] Initializing PDF Chat module...');

  try {
    // Khởi tạo PDF Chat controller trước
    const pdfChatView = document.getElementById('pdfChatView');
    if (pdfChatView) {
      // Load config first
      const { loadPDFChatConfig } = await import('./config/pdf-chat-config.js');
      const config = await loadPDFChatConfig();

      // Pass config and containerId to controller
      const controller = new PDFChatController({ ...config, containerId: 'pdfChatView' });
      await controller.initialize();

      console.log('[PDF Chat] PDF Chat controller initialized');
      window.pdfChatController = controller;
    } else {
      console.error('[PDF Chat] PDF Chat view not found');
    }

    // Khởi tạo input pdf chat sau khi controller đã sẵn sàng
    const pdfChatInput = switchToPdfChatInput({
      onSubmit: (value) => {
        // Submit sẽ được handle bởi PDFChatController
        if (window.pdfChatController) {
          window.pdfChatController.handleSendMessage(value);
        }
      }
    });

    if (pdfChatInput) {
      console.log('[PDF Chat] PDF Chat input initialized');
      window.pdfChatInput = pdfChatInput;
      
      // Update model name for PDF Chat input (sử dụng model riêng)
      setTimeout(async () => {
        try {
          const { updateModelNameDisplay } = await import('../panel/utils/model.js');
          // Update với inputType = 'pdfChat' để load model riêng
          await updateModelNameDisplay(null, 'pdfChat');
        } catch (error) {
          console.error('[PDF Chat] Failed to update model name:', error);
        }
      }, 200);
      
      // Setup toolbar action listeners (history, newChat buttons)
      setupPDFChatToolbarListeners();
    } else {
      console.error('[PDF Chat] Failed to initialize PDF Chat input');
    }
  } catch (error) {
    console.error('[PDF Chat] Error initializing PDF Chat:', error);
  }
};

// Note: Submit được handle trực tiếp bởi onSubmit callback trong switchToPdfChatInput

/**
 * Setup event listeners for toolbar actions (history, newChat)
 */
function setupPDFChatToolbarListeners() {
  // Listen for toolbar action events from input module
  document.addEventListener('input:toolbar-action', async (event) => {
    const { type, containerId, action } = event.detail;
    
    // Only handle events from PDF Chat input
    if (type !== 'pdfChat' || containerId !== 'pdf-chat-input-container') {
      return;
    }
    
    console.log('[PDF Chat] Toolbar action:', action);
    
    // Handle history button click
    if (action === 'history') {
      if (window.pdfChatController) {
        await window.pdfChatController.openHistory();
      } else {
        console.error('[PDF Chat] PDF Chat controller not found');
      }
      return;
    }
    
    // Handle newChat button click
    if (action === 'newChat') {
      if (window.pdfChatController) {
        // Clear chat history but keep PDF (start new conversation with same PDF)
        await window.pdfChatController.handleNewChat();
      } else {
        console.error('[PDF Chat] PDF Chat controller not found');
      }
      return;
    }
  });
}

export { PDFProcessor } from './core/pdf-processor.js';
export { PDFGeminiClient } from './core/pdf-gemini-client.js';
export { PDFExportHandler } from './core/pdf-export-handler.js';
export { PDFChatUI } from './ui/pdf-chat-ui.js';
export { PDFStorage } from './storage/pdf-storage.js';
export { loadPDFChatConfig, savePDFChatModel } from './config/pdf-chat-config.js';
export { openPDFHistoryPanel, closePDFHistoryPanel, initializePDFHistoryPanel } from './controllers/pdf-history-controller.js';
export { PDFChatController } from './core/pdf-chat-controller.js';


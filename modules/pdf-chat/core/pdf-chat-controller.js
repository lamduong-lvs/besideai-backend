/**
 * PDF Chat Controller
 * Main controller managing PDF upload, processing, and chat interactions
 */

import { getPdfChatInput } from '../input-integration.js';
import { PDFProcessor } from './pdf-processor.js';
import { PDFGeminiClient } from './pdf-gemini-client.js';
import { PDFExportHandler } from './pdf-export-handler.js';
import { PDFChatUI } from '../ui/pdf-chat-ui.js';
import { PDFStorage } from '../storage/pdf-storage.js';
import { openPDFHistoryPanel } from '../controllers/pdf-history-controller.js';

export class PDFChatController {
  constructor(config) {
    this.config = config || {};
    this.ui = new PDFChatUI();
    this.processor = new PDFProcessor();
    this.storage = new PDFStorage();
    this.exportHandler = new PDFExportHandler();

    this.isReady = false;
    this.isProcessing = false;
    this.geminiClient = null;
  }

  async initialize(forceRestore = false, onProgress = null) {
    console.log('[PDFChatController] Initializing...');

    // Initialize UI with container if provided
    if (this.config.containerId) {
      this.ui.initialize(this.config.containerId);
    }

    if (!this.config.apiKey) {
      this.ui.showNotConfiguredState();
      return;
    }

    try {
      this.geminiClient = new PDFGeminiClient(this.config.apiKey, this.config.model);
    } catch (error) {
      console.error('[PDFChatController] Failed to initialize Gemini client:', error);
      this.ui.showError('Failed to initialize AI service');
      return;
    }

    if (this.processor.hasFile()) {
      // Get PDF data for Gemini API
      const pdfData = this.processor.getFileDataForAPI();
      if (!pdfData) {
        console.error('[PDFChatController] PDF file data not available');
        this.ui.showError('PDF file data not available');
        return;
      }

      // Initialize Gemini client with PDF
      console.log('[PDFChatController] Initializing Gemini client with PDF...');
      try {
        const initResult = await this.geminiClient.initializeWithPDF(pdfData, onProgress);
        
        if (initResult.success) {
          this.isReady = true;
          this.ui.showReadyState(this.processor.getCurrentFileInfo());
          
          // Show welcome message from AI
          if (initResult.welcomeMessage) {
            this.ui.addAIMessage(initResult.welcomeMessage);
          }
          
          // Save session after successful initialization
          await this.saveChatHistory();
          
          // Setup event listeners after successful initialization
          this.setupEventListeners();
        } else {
          throw new Error(initResult.error || 'Failed to initialize PDF');
        }
      } catch (error) {
        console.error('[PDFChatController] Failed to initialize PDF with Gemini:', error);
        this.ui.showError(error.message || 'Failed to initialize PDF with AI');
        this.ui.showEmptyState();
        this.setupEventListeners();
      }
    } else {
      const restored = await this.restoreSession();
      if (!restored) {
        this.ui.showEmptyState();
      }
      // Always setup event listeners after initialization
      this.setupEventListeners();
    }
  }

  setupEventListeners() {
    const containerId = 'pdf-chat-input-container';

    // Setup file upload listener with retry logic
    const setupFileInputListener = () => {
      const fileInput = document.getElementById(`${containerId}-fileInput`);
      if (fileInput) {
        // Remove existing listener if any
        fileInput.onchange = null;
        // Add new listener
        fileInput.onchange = (e) => {
          console.log('[PDFChatController] File input change event triggered');
          this.handleFileUpload(e);
        };
        console.log('[PDFChatController] File input listener setup successfully');
        return true;
      }
      return false;
    };

    // Try to setup immediately
    if (!setupFileInputListener()) {
      // Retry after a delay if file input is not ready yet
      console.log('[PDFChatController] File input not found, retrying...');
      setTimeout(() => {
        if (!setupFileInputListener()) {
          console.warn('[PDFChatController] File input still not found after retry');
        }
      }, 200);
    }

    // Remove old event listeners if they exist (to prevent duplicates)
    if (this._regenerateHandler) {
      document.removeEventListener('pdfRegenerateMessage', this._regenerateHandler);
      this._regenerateHandler = null;
    }
    if (this._editHandler) {
      document.removeEventListener('pdfEditMessage', this._editHandler);
      this._editHandler = null;
    }

    // Create bound handlers
    this._regenerateHandler = async (event) => {
      console.log('[PDFChatController] pdfRegenerateMessage event received:', event.detail);
      try {
        await this.handleRegenerateMessage(event.detail);
      } catch (error) {
        console.error('[PDFChatController] Error in regenerate handler:', error);
      }
    };
    
    this._editHandler = async (event) => {
      console.log('[PDFChatController] pdfEditMessage event received:', event.detail);
      try {
        await this.handleEditMessage(event.detail);
      } catch (error) {
        console.error('[PDFChatController] Error in edit handler:', error);
      }
    };

    // Listen for regenerate message event (use capture phase to ensure we catch it)
    document.addEventListener('pdfRegenerateMessage', this._regenerateHandler, true);
    
    // Listen for edit message event
    document.addEventListener('pdfEditMessage', this._editHandler, true);

    console.log('[PDFChatController] Event listeners setup complete for regenerate and edit');
    console.log('[PDFChatController] Regenerate handler attached:', !!this._regenerateHandler);
    console.log('[PDFChatController] Edit handler attached:', !!this._editHandler);
    
    // Test if event listener is working
    const testEvent = new CustomEvent('pdfRegenerateMessage', {
      detail: { messageId: 'test' },
      bubbles: false
    });
    console.log('[PDFChatController] Testing event listener...');
    // Don't actually dispatch, just verify handler exists

    // We now rely on InputModule's onSubmit callback which is passed in pdf-chat.js
    // The InputModule will handle Enter key and Send button clicks and call the callback.
  }

  async handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      this.isProcessing = true;
      this.ui.showProcessingState(0);
      
      // Process file with progress tracking
      const processResult = await this.processor.processFile(file, (progress) => {
        this.ui.updateProgress(progress);
      });
      
      if (!processResult.success) {
        throw new Error(processResult.error || 'Failed to process file');
      }
      
      // Initialize with Gemini (progress continues from 65%)
      await this.initialize((progress) => {
        this.ui.updateProgress(progress);
      });
    } catch (error) {
      console.error('[PDFChatController] File upload failed:', error);
      this.ui.showError(error.message || 'Failed to upload file');
      this.ui.showEmptyState();
      this.setupEventListeners();
    } finally {
      this.isProcessing = false;
      if (event.target) event.target.value = '';
    }
  }

  /**
   * Detect export request from message
   * @param {string} message - User message
   * @returns {string|null} 'docs' or 'sheets' if export request detected, null otherwise
   */
  detectExportRequest(message) {
    if (!message || typeof message !== 'string') {
      return null;
    }

    // Normalize message: lowercase, remove extra spaces, remove Vietnamese diacritics for better matching
    const normalizedMessage = message
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Remove Vietnamese diacritics

    console.log('[PDFChatController] Checking export request for message:', message);
    console.log('[PDFChatController] Normalized message:', normalizedMessage);

    // Helper function to normalize pattern (same as message normalization)
    const normalizePattern = (pattern) => {
      return pattern
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    };

    // Helper function to check if pattern matches (flexible matching)
    const matchesPattern = (text, pattern) => {
      const normalizedPattern = normalizePattern(pattern);
      // Try exact match first
      if (text.includes(normalizedPattern)) {
        return true;
      }
      // Try word boundary match for better accuracy
      try {
        const escapedPattern = normalizedPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedPattern}\\b`, 'i');
        if (regex.test(text)) {
          return true;
        }
      } catch (e) {
        // If regex fails, fall back to includes
      }
      return false;
    };

    // Export to Docs/Word patterns - Comprehensive list
    const docsPatterns = [
      // English patterns - Direct commands
      'export to docs',
      'export to word',
      'export to google docs',
      'export to google doc',
      'export as word',
      'export as docs',
      'export as google docs',
      'export as google doc',
      'export file to word',
      'export file to docs',
      'export pdf to word',
      'export pdf to docs',
      'export this to word',
      'export this to docs',
      'export document to word',
      'export document to docs',
      
      // Convert patterns
      'convert to docs',
      'convert to word',
      'convert to google docs',
      'convert to google doc',
      'convert pdf to word',
      'convert pdf to docs',
      'convert file to word',
      'convert file to docs',
      'convert this to word',
      'convert this to docs',
      'convert document to word',
      'convert document to docs',
      'convert to word document',
      'convert to word file',
      'convert to doc file',
      'convert to docx',
      'convert pdf to word document',
      'convert pdf to docx',
      'convert file pdf to word',
      'convert file pdf to docs',
      
      // Save patterns
      'save to docs',
      'save to word',
      'save as word',
      'save as docs',
      'save as google docs',
      'save as google doc',
      'save as word document',
      'save as docx',
      'save file to word',
      'save file to docs',
      'save pdf to word',
      'save pdf to docs',
      
      // Create patterns
      'create docs',
      'create word',
      'create google docs',
      'create google doc',
      'create word document',
      'create word file',
      'create doc file',
      'create docx',
      'create a word document',
      'create a doc',
      'create a google doc',
      
      // Make/Generate patterns
      'make docs',
      'make word',
      'make google docs',
      'make word document',
      'make doc file',
      'generate docs',
      'generate word',
      'generate google docs',
      'generate word document',
      
      // Vietnamese patterns - Direct commands
      'xuất ra docs',
      'xuất ra word',
      'xuất ra google docs',
      'xuất ra google doc',
      'xuất sang docs',
      'xuất sang word',
      'xuất file ra docs',
      'xuất file ra word',
      'xuất pdf ra word',
      'xuất pdf ra docs',
      'xuất file pdf ra word',
      'xuất file pdf ra docs',
      'xuất tài liệu ra word',
      'xuất tài liệu ra docs',
      
      // Convert patterns (Vietnamese)
      'chuyển sang word',
      'chuyển sang docs',
      'chuyển đổi sang word',
      'chuyển đổi sang docs',
      'chuyển đổi pdf sang word',
      'chuyển đổi pdf sang docs',
      'chuyển file sang word',
      'chuyển file sang docs',
      'chuyển pdf sang word',
      'chuyển pdf sang docs',
      'chuyển file pdf sang word',
      'chuyển file pdf sang docs',
      'chuyển tài liệu sang word',
      'chuyển tài liệu sang docs',
      'chuyển đổi file pdf sang word',
      'chuyển đổi file pdf sang docs',
      'chuyển sang google docs',
      'chuyển sang google doc',
      'chuyển đổi sang google docs',
      'chuyển đổi sang google doc',
      'chuyển sang word document',
      'chuyển sang file word',
      'chuyển sang file docs',
      'chuyển đổi sang file word',
      'chuyển đổi sang file docs',
      'đổi sang word',
      'đổi sang docs',
      'đổi pdf sang word',
      'đổi pdf sang docs',
      'đổi file sang word',
      'đổi file sang docs',
      
      // Create patterns (Vietnamese)
      'tạo docs',
      'tạo word',
      'tạo google docs',
      'tạo file word',
      'tạo file docs',
      'tạo word document',
      'tạo file word document',
      'tạo google doc',
      'tạo một file word',
      'tạo một file docs',
      'tạo một google doc',
      
      // Save patterns (Vietnamese)
      'lưu ra docs',
      'lưu ra word',
      'lưu sang docs',
      'lưu sang word',
      'lưu thành word',
      'lưu thành docs',
      'lưu file ra word',
      'lưu file ra docs',
      'lưu pdf ra word',
      'lưu pdf ra docs',
      'lưu thành file word',
      'lưu thành file docs',
      'lưu thành word document',
      'lưu thành google docs',
      
      // Other variations
      'file word',
      'file docs',
      'file google docs',
      'word document',
      'google doc',
      'google docs',
      'docx file',
      'word file',
      'doc file'
    ];

    // Check for Docs patterns
    for (const pattern of docsPatterns) {
      if (matchesPattern(normalizedMessage, pattern)) {
        console.log('[PDFChatController] Matched Docs pattern:', pattern);
        return 'docs';
      }
    }

    // Export to Sheets/Excel patterns - Comprehensive list
    const sheetsPatterns = [
      // English patterns - Direct commands
      'export to sheets',
      'export to excel',
      'export to google sheets',
      'export to google sheet',
      'export as excel',
      'export as sheets',
      'export as google sheets',
      'export as google sheet',
      'export file to excel',
      'export file to sheets',
      'export pdf to excel',
      'export pdf to sheets',
      'export this to excel',
      'export this to sheets',
      'export document to excel',
      'export document to sheets',
      
      // Convert patterns
      'convert to sheets',
      'convert to excel',
      'convert to google sheets',
      'convert to google sheet',
      'convert pdf to excel',
      'convert pdf to sheets',
      'convert file to excel',
      'convert file to sheets',
      'convert this to excel',
      'convert this to sheets',
      'convert document to excel',
      'convert document to sheets',
      'convert to excel file',
      'convert to spreadsheet',
      'convert to xlsx',
      'convert pdf to excel file',
      'convert pdf to xlsx',
      'convert file pdf to excel',
      'convert file pdf to sheets',
      
      // Save patterns
      'save to sheets',
      'save to excel',
      'save as excel',
      'save as sheets',
      'save as google sheets',
      'save as google sheet',
      'save as excel file',
      'save as xlsx',
      'save file to excel',
      'save file to sheets',
      'save pdf to excel',
      'save pdf to sheets',
      
      // Create patterns
      'create sheets',
      'create excel',
      'create google sheets',
      'create excel file',
      'create spreadsheet',
      'create xlsx',
      'create a excel file',
      'create a spreadsheet',
      'create a google sheet',
      
      // Make/Generate patterns
      'make sheets',
      'make excel',
      'make google sheets',
      'make excel file',
      'make spreadsheet',
      'generate sheets',
      'generate excel',
      'generate google sheets',
      'generate excel file',
      'generate spreadsheet',
      
      // Vietnamese patterns - Direct commands
      'xuất ra sheets',
      'xuất ra excel',
      'xuất ra google sheets',
      'xuất ra google sheet',
      'xuất sang excel',
      'xuất sang sheets',
      'xuất file ra excel',
      'xuất file ra sheets',
      'xuất pdf ra excel',
      'xuất pdf ra sheets',
      'xuất file pdf ra excel',
      'xuất file pdf ra sheets',
      'xuất tài liệu ra excel',
      'xuất tài liệu ra sheets',
      
      // Convert patterns (Vietnamese)
      'chuyển sang excel',
      'chuyển sang sheets',
      'chuyển đổi sang excel',
      'chuyển đổi sang sheets',
      'chuyển đổi pdf sang excel',
      'chuyển đổi pdf sang sheets',
      'chuyển file sang excel',
      'chuyển file sang sheets',
      'chuyển pdf sang excel',
      'chuyển pdf sang sheets',
      'chuyển file pdf sang excel',
      'chuyển file pdf sang sheets',
      'chuyển tài liệu sang excel',
      'chuyển tài liệu sang sheets',
      'chuyển đổi file pdf sang excel',
      'chuyển đổi file pdf sang sheets',
      'chuyển sang google sheets',
      'chuyển sang google sheet',
      'chuyển đổi sang google sheets',
      'chuyển đổi sang google sheet',
      'chuyển sang excel file',
      'chuyển sang file excel',
      'chuyển sang file sheets',
      'chuyển đổi sang file excel',
      'chuyển đổi sang file sheets',
      'đổi sang excel',
      'đổi sang sheets',
      'đổi pdf sang excel',
      'đổi pdf sang sheets',
      'đổi file sang excel',
      'đổi file sang sheets',
      
      // Create patterns (Vietnamese)
      'tạo sheets',
      'tạo excel',
      'tạo google sheets',
      'tạo file excel',
      'tạo file sheets',
      'tạo excel file',
      'tạo spreadsheet',
      'tạo một file excel',
      'tạo một file sheets',
      'tạo một google sheet',
      
      // Save patterns (Vietnamese)
      'lưu ra sheets',
      'lưu ra excel',
      'lưu sang excel',
      'lưu sang sheets',
      'lưu thành excel',
      'lưu thành sheets',
      'lưu file ra excel',
      'lưu file ra sheets',
      'lưu pdf ra excel',
      'lưu pdf ra sheets',
      'lưu thành file excel',
      'lưu thành file sheets',
      'lưu thành excel file',
      'lưu thành google sheets',
      
      // Other variations
      'file excel',
      'file sheets',
      'file google sheets',
      'excel file',
      'google sheet',
      'google sheets',
      'xlsx file',
      'spreadsheet file',
      'excel spreadsheet'
    ];

    // Check for Sheets patterns
    for (const pattern of sheetsPatterns) {
      if (matchesPattern(normalizedMessage, pattern)) {
        console.log('[PDFChatController] Matched Sheets pattern:', pattern);
        return 'sheets';
      }
    }

    // Additional check: if message contains both action keyword and target keyword
    // This catches cases like "convert to word" or "chuyển sang excel" that might not match exact patterns
    const actionKeywords = /(convert|chuyển|chuyển đổi|export|xuất|tạo|lưu|save|create|make|generate|đổi|transform|chuyển đổi file|chuyển file|convert file|export file|save file|tạo file|lưu file)/i;
    const wordKeywords = /\b(word|docs|google docs?|doc|document|docx|word document|word file|doc file)\b/i;
    const excelKeywords = /\b(excel|sheets|google sheets?|spreadsheet|xlsx|excel file|excel spreadsheet)\b/i;

    const hasActionKeyword = actionKeywords.test(normalizedMessage);
    const hasWordKeyword = wordKeywords.test(normalizedMessage);
    const hasExcelKeyword = excelKeywords.test(normalizedMessage);

    // Only match if there's an action keyword AND a target keyword
    // This prevents false positives from casual mentions
    if (hasActionKeyword) {
      if (hasWordKeyword && !hasExcelKeyword) {
        console.log('[PDFChatController] Detected Docs from keyword combination');
        return 'docs';
      }
      if (hasExcelKeyword && !hasWordKeyword) {
        console.log('[PDFChatController] Detected Sheets from keyword combination');
        return 'sheets';
      }
    }

    console.log('[PDFChatController] No export request detected');
    return null;
  }

  async handleSendMessage(valueFromEvent = null) {
    console.log('[PDFChatController] handleSendMessage called with valueFromEvent:', valueFromEvent ? valueFromEvent.substring(0, 50) : 'null');
    console.log('[PDFChatController] isReady:', this.isReady, 'isProcessing:', this.isProcessing);
    
    if (!this.isReady || this.isProcessing) {
      console.log('[PDFChatController] Early return: isReady =', this.isReady, ', isProcessing =', this.isProcessing);
      return;
    }

    // Ưu tiên sử dụng value từ event (tránh timing issues)
    let message = valueFromEvent ? valueFromEvent.trim() : null;
    
    // Nếu không có value từ event, lấy từ input
    if (!message) {
      const pdfChatInput = getPdfChatInput();
      console.log('[PDFChatController] pdfChatInput:', pdfChatInput ? 'found' : 'not found');
      
      if (!pdfChatInput) {
        console.log('[PDFChatController] Early return: pdfChatInput is null');
        return;
      }

      message = pdfChatInput.getValue().trim();
      console.log('[PDFChatController] Message from input:', message ? `"${message.substring(0, 50)}"` : 'empty');
    } else {
      console.log('[PDFChatController] Using message from event:', message.substring(0, 50));
    }

    if (!message) {
      console.log('[PDFChatController] Early return: message is empty');
      return;
    }
    
    // Note: Input sẽ được clear bởi keyboard handler hoặc events handler khi submit
    // Không cần clear ở đây để tránh race condition

    console.log('[PDFChatController] Sending message:', message);

    // Check for export request
    const exportType = this.detectExportRequest(message);
    if (exportType) {
      console.log(`[PDFChatController] Detected export request: ${exportType}`);

      // Note: Input đã được clear bởi keyboard handler hoặc events handler khi submit
      // Không cần clear lại ở đây

      // Add user message to UI
      this.ui.addUserMessage(message);

      // Automatically trigger export
      if (exportType === 'docs') {
        await this.handleExportToDocs();
      } else if (exportType === 'sheets') {
        await this.handleExportToSheets();
      }

      return;
    }

    try {
      this.isProcessing = true;

      // Note: Input đã được clear bởi keyboard handler hoặc events handler khi submit
      // Không cần clear lại ở đây

      // Create message IDs
      const userMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const assistantMessageId = `pdf_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Add user message to UI
      this.ui.addUserMessage(message, userMessageId);

      // Render assistant message immediately with empty content
      this.ui.addAIMessage('', true, assistantMessageId);

      // Hide typing indicator (we have message element now)
      this.ui.hideTyping();

      // Send to Gemini with streaming simulation (pass message with IDs)
      const response = await this.geminiClient.chat({
        message: message,
        userMessageId: userMessageId,
        assistantMessageId: assistantMessageId
      });

      // Simulate streaming for smooth display
      await this.simulateStreaming(assistantMessageId, response);

      this.isProcessing = false;

      // Save chat history
      await this.saveChatHistory();

    } catch (error) {
      console.error('[PDFChatController] Send message failed:', error);
      this.ui.hideTyping();
      this.ui.showError(error.message || 'Failed to send message');
      this.isProcessing = false;
    }
  }

  /**
   * Simulate streaming for AI response
   */
  async simulateStreaming(messageId, fullContent) {
    if (!fullContent) return;

    const chunkSize = 2; // Characters per chunk
    const delay = 10; // Delay between chunks in ms

    let accumulatedContent = '';
    const totalLength = fullContent.length;

    for (let i = 0; i < totalLength; i += chunkSize) {
      const chunk = fullContent.slice(i, i + chunkSize);
      accumulatedContent += chunk;

      // Update message with accumulated content (replace, not append, to avoid duplication)
      // Pass accumulatedContent as newContent and set append=false to replace
      this.ui.updateStreamingMessage(messageId, accumulatedContent, false, i + chunkSize < totalLength, false);

      // Small delay for smooth streaming effect
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Final update without cursor and finalize thinking
    // Use accumulatedContent (full content) and set isComplete=true
    this.ui.updateStreamingMessage(messageId, accumulatedContent, false, false, true);
  }

  /**
   * Save chat history to storage
   */
  async saveChatHistory() {
    try {
      if (!this.geminiClient || !this.isReady) return;

      const fileInfo = this.processor.getCurrentFileInfo();
      const chatHistory = this.geminiClient.getChatHistory();

      // Include PDF data for restoration
      const pdfInfo = {
        ...fileInfo,
        fileData: this.processor.fileData // Include base64 data for restoration
      };

      // Get current session ID to maintain it
      const currentSession = await this.storage.loadSession();
      const sessionId = currentSession?.id || null;

      await this.storage.saveSession(pdfInfo, chatHistory, sessionId);
    } catch (error) {
      console.error('[PDFChatController] Failed to save chat history:', error);
    }
  }

  /**
   * Handle export to Google Docs
   */
  async handleExportToDocs() {
    if (!this.isReady || this.isProcessing) return;

    console.log('[PDFChatController] Exporting to Google Docs...');

    try {
      this.isProcessing = true;

      // Disable export buttons and show processing state
      const docsBtn = document.getElementById('pdfExportDocsBtn');
      const sheetsBtn = document.getElementById('pdfExportSheetsBtn');
      if (docsBtn) docsBtn.disabled = true;
      if (sheetsBtn) sheetsBtn.disabled = true;

      // Show extracting message
      const infoMsg = this.ui.showInfo(window.Lang?.get('pdfChatExtracting') || 'Extracting PDF content...');

      const fileInfo = this.processor.getCurrentFileInfo();

      // Extract full PDF content using Gemini
      const extractedContent = await this.geminiClient.extractPDFContent();

      // Remove info message
      if (infoMsg && infoMsg.parentNode) {
        infoMsg.remove();
      }

      // Export with clean content only, no metadata
      const result = await this.exportHandler.exportToDocs(fileInfo, extractedContent, false);

      if (result.success) {
        // Show success message with link
        this.ui.showExportSuccess('Google Docs', result.url);
      }

      this.isProcessing = false;
      if (docsBtn) docsBtn.disabled = false;
      if (sheetsBtn) sheetsBtn.disabled = false;

    } catch (error) {
      console.error('[PDFChatController] Export to Docs failed:', error);

      let errorMessage = window.Lang?.get('pdfChatErrorExport') || 'Export failed';

      // Check if it's an authentication error
      if (error.message && error.message.includes('Authentication')) {
        errorMessage = window.Lang?.get('pdfChatErrorAuth') ||
          'Please sign in to your Google account first. Click the profile icon in the top-right corner to sign in.';
      }

      this.ui.showError(errorMessage);
      this.isProcessing = false;

      const docsBtn = document.getElementById('pdfExportDocsBtn');
      const sheetsBtn = document.getElementById('pdfExportSheetsBtn');
      if (docsBtn) docsBtn.disabled = false;
      if (sheetsBtn) sheetsBtn.disabled = false;
    }
  }

  /**
   * Handle export to Google Sheets
   */
  async handleExportToSheets() {
    if (!this.isReady || this.isProcessing) return;

    console.log('[PDFChatController] Exporting to Google Sheets...');

    try {
      this.isProcessing = true;

      // Disable export buttons
      const docsBtn = document.getElementById('pdfExportDocsBtn');
      const sheetsBtn = document.getElementById('pdfExportSheetsBtn');
      if (docsBtn) docsBtn.disabled = true;
      if (sheetsBtn) sheetsBtn.disabled = true;

      // Show extracting message
      const infoMsg = this.ui.showInfo(window.Lang?.get('pdfChatExtracting') || 'Extracting PDF content...');

      const fileInfo = this.processor.getCurrentFileInfo();

      // Extract full PDF content using Gemini
      const extractedContent = await this.geminiClient.extractPDFContent();

      // Remove info message
      if (infoMsg && infoMsg.parentNode) {
        infoMsg.remove();
      }

      // Export with clean content only, no metadata
      const result = await this.exportHandler.exportToSheets(fileInfo, extractedContent, false);

      if (result.success) {
        // Show success message with link
        this.ui.showExportSuccess('Google Sheets', result.url);
      }

      this.isProcessing = false;
      if (docsBtn) docsBtn.disabled = false;
      if (sheetsBtn) sheetsBtn.disabled = false;

    } catch (error) {
      console.error('[PDFChatController] Export to Sheets failed:', error);

      let errorMessage = window.Lang?.get('pdfChatErrorExport') || 'Export failed';

      // Check if it's an authentication error
      if (error.message && error.message.includes('Authentication')) {
        errorMessage = window.Lang?.get('pdfChatErrorAuth') ||
          'Please sign in to your Google account first. Click the profile icon in the top-right corner to sign in.';
      }

      // Check if it's Sheets API disabled error
      if (error.message && error.message.includes('Sheets API')) {
        errorMessage = error.message;
      }

      this.ui.showError(errorMessage);
      this.isProcessing = false;

      const docsBtn = document.getElementById('pdfExportDocsBtn');
      const sheetsBtn = document.getElementById('pdfExportSheetsBtn');
      if (docsBtn) docsBtn.disabled = false;
      if (sheetsBtn) sheetsBtn.disabled = false;
    }
  }

  /**
   * Open history panel
   */
  async openHistory() {
    const Lang = window.Lang || { get: (key) => key };
    const showError = (msg) => this.ui.showError(msg);

    await openPDFHistoryPanel(Lang, showError, (session) => this.loadHistorySession(session));
  }

  /**
   * Restore session from storage (if exists)
   * @returns {boolean} True if session was restored, false otherwise
   */
  async restoreSession() {
    try {
      const session = await this.storage.loadSession();
      if (!session || !session.pdfInfo) {
        return false;
      }

      console.log('[PDFChatController] Restoring session...');
      await this.loadHistorySession(session);
      return true;
    } catch (error) {
      console.error('[PDFChatController] Failed to restore session:', error);
      return false;
    }
  }

  /**
   * Load session from history
   */
  async loadHistorySession(session) {
    try {
      console.log('[PDFChatController] Loading history session:', session.id);

      // Clear current state
      this.processor.clear();
      if (this.geminiClient) {
        this.geminiClient.reset();
      }

      // Restore PDF processor data
      this.processor.fileData = session.pdfInfo.fileData || null;

      // Initialize Gemini client
      this.geminiClient = new PDFGeminiClient(
        this.config.apiKey,
        this.config.model
      );

      // Restore PDF context
      if (session.pdfInfo.fileData && session.pdfInfo.fileData.base64) {
        this.geminiClient.pdfContext = {
          inlineData: {
            mimeType: session.pdfInfo.fileData.mimeType || 'application/pdf',
            data: session.pdfInfo.fileData.base64
          }
        };
      } else {
        // Handle missing PDF content (from optimized history)
        console.warn('[PDFChatController] PDF content missing in history session');
        this.ui.showInfo(window.Lang?.get('pdfChatHistoryContentMissing') ||
          'This is an archived session. The PDF content is not available for new analysis. Please re-upload the file if you want to ask new questions.');

        // We still allow viewing history, but new questions might fail or lack context
        // You might want to disable the input or show a specific UI state
      }

      // Restore chat history
      if (session.chatHistory && Array.isArray(session.chatHistory)) {
        await this.geminiClient.restoreChatHistory(session.chatHistory);
      }

      // Set as current session
      await this.storage.saveSession(session.pdfInfo, session.chatHistory, session.id);

      // Show ready state
      this.ui.showReadyState({
        fileName: session.pdfInfo.fileName,
        fileSize: session.pdfInfo.fileSize,
        numPages: session.pdfInfo.numPages || '?',
      });

      // Clear and restore messages
      const messagesContainer = document.getElementById('pdfChatMessages');
      if (messagesContainer) {
        messagesContainer.innerHTML = '';
      }

      // Restore chat messages
      if (session.chatHistory && session.chatHistory.length > 0) {
        for (let i = 1; i < session.chatHistory.length; i++) {
          const msg = session.chatHistory[i];
          if (msg.role === 'user') {
            this.ui.addUserMessage(msg.message);
          } else if (msg.role === 'assistant' || msg.role === 'model') {
            this.ui.addAIMessage(msg.message, false);
          }
        }
      }

      this.isReady = true;
      this.isProcessing = false;

      // Setup event listeners after restoring session
      this.setupEventListeners();

      console.log('[PDFChatController] History session loaded successfully');
    } catch (error) {
      console.error('[PDFChatController] Failed to load history session:', error);
      this.ui.showError(error.message || 'Failed to load session');
    }
  }


  /**
   * Handle new chat (save current session to history and show upload screen for new file)
   */
  async handleNewChat() {
    console.log('[PDFChatController] Starting new chat...');

    // Save current session to history before clearing (if there's PDF or chat history)
    if (this.isReady) {
      const fileInfo = this.processor.getCurrentFileInfo();
      const chatHistory = this.geminiClient ? this.geminiClient.getChatHistory() : [];
      
      // Save if there's PDF or actual conversation (more than just the initial system prompt)
      if (fileInfo || (chatHistory && chatHistory.length > 1)) {
        await this.saveChatHistory();
        console.log('[PDFChatController] Current session saved to history before new chat');
      }
    }

    // Clear processor (remove PDF)
    this.processor.clear();

    // Clear Gemini client
    if (this.geminiClient) {
      this.geminiClient.reset();
      this.geminiClient = null;
    }

    // Reset state
    this.isReady = false;
    this.isProcessing = false;

    // Clear storage (current session only, history is preserved)
    await this.storage.clearSession();

    // Clear UI and show empty state (upload screen)
    this.ui.clearMessages();
    this.ui.showEmptyState();
    
    // Setup event listeners for file upload
    this.setupEventListeners();

    console.log('[PDFChatController] New chat started - upload screen shown');
  }

  /**
   * Handle delete PDF (remove PDF and start fresh)
   */
  async handleDeletePDF() {
    console.log('[PDFChatController] Deleting PDF...');

    // Save current session to history before deleting
    if (this.isReady && this.geminiClient) {
      await this.saveChatHistory();
      console.log('[PDFChatController] Current session saved to history before deletion');
    }

    // Clear processor
    this.processor.clear();

    // Clear Gemini client
    if (this.geminiClient) {
      this.geminiClient.reset();
      this.geminiClient = null;
    }

    // Reset state
    this.isReady = false;
    this.isProcessing = false;

    // Clear storage (current session only, history is preserved)
    await this.storage.clearSession();

    // Show empty state and setup event listeners
    this.ui.showEmptyState();
    this.setupEventListeners();

    console.log('[PDFChatController] PDF deleted and reset for new upload');
  }

  /**
   * Show (for panel integration)
   */
  async show() {
    // Always try to restore session when showing PDF Chat
    // This ensures that switching back to PDF Chat restores the previous session
    if (!this.isReady && !this.isProcessing) {
      // Not ready, initialize (which will restore session)
      await this.initialize(true); // Force restore
    } else if (this.isReady) {
      // If already ready, still try to restore to ensure UI is up to date
      // This handles the case where user switches away and comes back
      console.log('[PDFChatController] Already ready, but restoring session to ensure UI is correct');
      const restored = await this.restoreSession();
      if (!restored) {
        // If restore fails, reset to empty state
        console.log('[PDFChatController] Restore failed, resetting to empty state');
        this.isReady = false;
        this.ui.showEmptyState();
        this.setupEventListeners();
      }
    } else {
      // If not ready and processing, wait or try to restore
      console.log('[PDFChatController] Not ready and processing, attempting restore');
      const restored = await this.restoreSession();
      if (!restored) {
        // If restore fails, show empty state
        this.ui.showEmptyState();
        this.setupEventListeners();
      }
    }
  }

  /**
   * Handle edit message (remove message and all messages after it)
   */
  async handleEditMessage(detail) {
    try {
      const { messageId } = detail;
      
      if (!this.geminiClient) {
        console.warn('[PDFChatController] Cannot edit: Gemini client not initialized');
        return;
      }
      
      // Get chat history
      const chatHistory = this.geminiClient.getChatHistory();
      
      // Find message index in chat history
      // Note: chatHistory format is [{ role, message, timestamp }, ...]
      // We need to find by matching message content or by position
      // Since we don't have message ID in chatHistory, we'll use DOM position
      const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
      if (!messageEl) {
        console.warn('[PDFChatController] Message element not found for edit');
        return;
      }
      
      // Find all messages in DOM
      const allMessages = Array.from(document.querySelectorAll('#pdfChatMessages .message'));
      const messageIndex = allMessages.indexOf(messageEl);
      
      if (messageIndex === -1) {
        console.warn('[PDFChatController] Message index not found');
        return;
      }
      
      // Calculate how many messages to remove from chat history
      // Each user message + assistant message pair = 2 messages in chatHistory
      // But chatHistory[0] is the initial PDF context, so we need to account for that
      // Messages in DOM: [user1, assistant1, user2, assistant2, ...]
      // chatHistory: [initial, user1, assistant1, user2, assistant2, ...]
      
      // Count user messages up to and including this one
      let userMessageCount = 0;
      for (let i = 0; i <= messageIndex; i++) {
        if (allMessages[i].classList.contains('user-message')) {
          userMessageCount++;
        }
      }
      
      // Remove from chatHistory: keep initial (index 0) + remove from userMessageCount*2 onwards
      // Each user-assistant pair takes 2 slots in chatHistory (after initial)
      const keepCount = 1 + (userMessageCount - 1) * 2; // Keep initial + previous pairs
      const newHistory = chatHistory.slice(0, keepCount);
      
      // Update chat history
      this.geminiClient.chatHistory = newHistory;
      
      // Save updated history
      await this.saveChatHistory();
      
      console.log('[PDFChatController] Message edited, chat history updated');
    } catch (error) {
      console.error('[PDFChatController] Error handling edit message:', error);
    }
  }
  
  /**
   * Handle regenerate message (remove assistant message and resend user message)
   */
  async handleRegenerateMessage(detail) {
    try {
      const { messageId } = detail;
      
      // Import showError for toast notifications
      const { showError } = await import('../../panel/utils/toast.js');
      const Lang = window.Lang || { get: (key) => `[${key}]` };
      
      if (!this.isReady || this.isProcessing) {
        console.warn('[PDFChatController] Cannot regenerate: not ready or processing');
        showError(Lang.get('errorCannotRegenerate') || 'Không thể regenerate: đang xử lý');
        return;
      }
      
      if (!this.geminiClient) {
        console.warn('[PDFChatController] Cannot regenerate: Gemini client not initialized');
        showError(Lang.get('errorCannotRegenerate') || 'Không thể regenerate: Gemini client chưa khởi tạo');
        return;
      }
      
      // Find message element
      const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
      if (!messageEl) {
        console.warn('[PDFChatController] Message element not found for regenerate');
        showError(Lang.get('errorCannotRegenerate') || 'Không thể regenerate: không tìm thấy tin nhắn');
        return;
      }
      
      // Verify this is an assistant message
      if (!messageEl.classList.contains('assistant-message')) {
        console.warn('[PDFChatController] Cannot regenerate: not an assistant message');
        showError(Lang.get('errorCannotRegenerate') || 'Không thể regenerate: không phải tin nhắn AI');
        return;
      }
      
      // Get chat history - this is the source of truth
      const chatHistory = this.geminiClient.getChatHistory();
      
      if (!chatHistory || chatHistory.length < 2) {
        console.warn('[PDFChatController] Cannot regenerate: chat history is too short', chatHistory);
        showError(Lang.get('errorCannotRegenerate') || 'Không thể regenerate: lịch sử chat quá ngắn');
        return;
      }
      
      // Log full history structure for debugging
      console.log('[PDFChatController] Full chat history:', chatHistory.map((m, i) => ({
        index: i,
        role: m.role,
        hasMessage: !!(m.message || m.content),
        messagePreview: (m.message || m.content || '').substring(0, 50)
      })));
      
      // Find assistant message in chat history by messageId
      let assistantIndexInHistory = -1;
      for (let i = 0; i < chatHistory.length; i++) {
        if (chatHistory[i].role === 'assistant' && chatHistory[i].messageId === messageId) {
          assistantIndexInHistory = i;
          break;
        }
      }
      
      if (assistantIndexInHistory === -1) {
        console.warn('[PDFChatController] Cannot regenerate: assistant message not found in chat history', {
          messageId,
          history: chatHistory.map((m, i) => ({ index: i, role: m.role, messageId: m.messageId }))
        });
        showError(Lang.get('errorCannotRegenerate') || 'Không thể regenerate: không tìm thấy tin nhắn');
        return;
      }
      
      // Find the corresponding user message (should be the message before this assistant message)
      if (assistantIndexInHistory === 0) {
        console.warn('[PDFChatController] Cannot regenerate: this is the first message (initial), no user message to regenerate');
        showError(Lang.get('errorCannotRegenerate') || 'Không thể regenerate: đây là tin nhắn đầu tiên');
        return;
      }
      
      const userMessageIndexInHistory = assistantIndexInHistory - 1;
      const userMessageData = chatHistory[userMessageIndexInHistory];
      
      if (!userMessageData || userMessageData.role !== 'user') {
        console.warn('[PDFChatController] Cannot regenerate: no user message before assistant message', {
          assistantIndexInHistory,
          userMessageIndexInHistory,
          userMessageData,
          history: chatHistory.map((m, i) => ({ index: i, role: m.role, messageId: m.messageId }))
        });
        showError(Lang.get('errorCannotRegenerate') || 'Không thể regenerate: không tìm thấy tin nhắn user');
        return;
      }
      
      const userMessage = userMessageData.message || userMessageData.content || '';
      if (!userMessage || userMessage.trim().length === 0) {
        console.warn('[PDFChatController] Cannot regenerate: user message is empty');
        showError(Lang.get('errorCannotRegenerate') || 'Không thể regenerate: tin nhắn user rỗng');
        return;
      }
      
      console.log('[PDFChatController] Regenerate debug:', {
        messageId,
        assistantIndexInHistory,
        userMessageIndexInHistory,
        userMessageId: userMessageData.messageId,
        historyLength: chatHistory.length
      });
      
      // Remove this assistant message and all messages after it from chat history
      // Keep: all messages up to and including the user message
      const keepCount = userMessageIndexInHistory + 1;
      const newHistory = chatHistory.slice(0, keepCount);
      
      // Update chat history
      this.geminiClient.chatHistory = newHistory;
      
      // Remove assistant message from DOM (but keep user message)
      messageEl.remove();
      
      // Find user message element in DOM to ensure it's still there
      const userMessageId = userMessageData.messageId;
      let userMessageEl = null;
      if (userMessageId) {
        userMessageEl = document.querySelector(`[data-message-id="${userMessageId}"]`);
      }
      
      // If user message is not in DOM, add it back (shouldn't happen, but safety check)
      if (!userMessageEl) {
        console.warn('[PDFChatController] User message not found in DOM, adding it back');
        this.ui.addUserMessage(userMessage, userMessageId);
      }
      
      // Resend user message
      this.isProcessing = true;
      
      // Create new assistant message ID for streaming
      const assistantMessageId = `pdf_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create assistant message with empty content initially (for streaming)
      this.ui.addAIMessage('', true, assistantMessageId);
      
      // Hide typing indicator
      this.ui.hideTyping();
      
      // Send to Gemini with streaming simulation (pass message with IDs)
      // Use existing userMessageId and new assistantMessageId
      const response = await this.geminiClient.chat({
        message: userMessage.trim(),
        userMessageId: userMessageId,
        assistantMessageId: assistantMessageId
      });
      
      // Simulate streaming for smooth display
      await this.simulateStreaming(assistantMessageId, response);
      
      this.isProcessing = false;
      
      // Save chat history
      await this.saveChatHistory();
      
      console.log('[PDFChatController] Message regenerated successfully');
    } catch (error) {
      console.error('[PDFChatController] Error handling regenerate message:', error);
      this.ui.hideTyping();
      this.ui.showError(error.message || 'Failed to regenerate message');
      
      // Show error toast (đồng bộ với Main Chat)
      try {
        const { showError } = await import('../../panel/utils/toast.js');
        const Lang = window.Lang || { get: (key) => `[${key}]` };
        showError(Lang.get('errorRegenerateFailed', { error: error.message }) || `Lỗi regenerate: ${error.message}`);
      } catch (toastError) {
        console.error('[PDFChatController] Error showing error toast:', toastError);
      }
      
      // Show error toast (đồng bộ với Main Chat)
      try {
        const { showError } = await import('../../panel/utils/toast.js');
        const Lang = window.Lang || { get: (key) => `[${key}]` };
        showError(Lang.get('errorRegenerateFailed', { error: error.message }) || `Lỗi regenerate: ${error.message}`);
      } catch (toastError) {
        console.error('[PDFChatController] Error showing error toast:', toastError);
      }
      this.isProcessing = false;
    }
  }

  /**
   * Hide
   */
  hide() {
    // Nothing to do for now
  }

  /**
   * Destroy
   */
  destroy() {
    this.processor.clear();
    if (this.geminiClient) {
      this.geminiClient.reset();
    }
    this.ui.clear();
    this.isReady = false;
    this.isProcessing = false;
    console.log('[PDFChatController] Destroyed');
  }
}


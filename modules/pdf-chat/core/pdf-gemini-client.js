/**
 * PDF Gemini Client
 * Handles communication with Gemini API for PDF analysis and chat
 */

import { PDF_CHAT_CONFIG } from '../config/pdf-chat-config.js';

export class PDFGeminiClient {
  constructor(apiKey, modelId) {
    this.apiKey = apiKey;
    this.modelId = modelId || PDF_CHAT_CONFIG.defaultModel;
    this.pdfContext = null;
    this.chatHistory = [];
    this.maxHistoryLength = 100; // Limit chat history to prevent memory issues
  }
  
  /**
   * Initialize with PDF file
   * @param {Object} pdfFileData - PDF file data with inlineData
   * @param {Function} onProgress - Optional callback function(progress: number) to update progress (0-100)
   */
  async initializeWithPDF(pdfFileData, onProgress = null) {
    console.log('[PDFGeminiClient] Initializing with PDF...');
    
    try {
      if (onProgress) onProgress(65);
      this.pdfContext = pdfFileData;
      
      if (onProgress) onProgress(70);
      // Send initial analysis request to Gemini
      const initialPrompt = `Bạn là một trợ lý AI hữu ích phân tích tài liệu PDF. Tôi đã tải lên một tài liệu PDF. Vui lòng đọc và hiểu nội dung của nó. 

Hãy trả lời bằng tiếng Việt với:
1. Một tóm tắt thật ngắn gọn (2-3 câu) về nội dung chính của tài liệu
2. Kết thúc bằng cách hỏi người dùng muốn làm gì tiếp theo

Hãy giữ câu trả lời ngắn gọn và súc tích.`;
      
      // Store initial user message in history
      this.chatHistory.push({
        role: 'user',
        message: initialPrompt,
        timestamp: Date.now(),
        messageId: null // Initial message doesn't have a UI messageId
      });
      
      if (onProgress) onProgress(75);
      // Send message with progress tracking
      const response = await this.sendMessage(initialPrompt, true, (progress) => {
        // API call progress: 75-100% (25% range)
        if (onProgress) onProgress(75 + (progress * 0.25));
      });
      
      if (onProgress) onProgress(100);
      console.log('[PDFGeminiClient] PDF initialized successfully');
      return {
        success: true,
        welcomeMessage: response.text
      };
      
    } catch (error) {
      console.error('[PDFGeminiClient] Failed to initialize PDF:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Send message to Gemini with full conversation context
   * @param {string|Object} message - Message to send (string or object with message, userMessageId, assistantMessageId)
   * @param {boolean} isInitial - Whether this is the initial message
   * @param {Function} onProgress - Optional callback function(progress: number) to update progress (0-100)
   */
  async sendMessage(message, isInitial = false, onProgress = null) {
    // Extract message text and IDs
    let messageText = typeof message === 'string' ? message : message.message || message.text || '';
    const userMessageId = typeof message === 'object' ? message.userMessageId : null;
    const assistantMessageId = typeof message === 'object' ? message.assistantMessageId : null;
    console.log('[PDFGeminiClient] Sending message...');
    
    try {
      const url = `${PDF_CHAT_CONFIG.apiEndpoint}/models/${this.modelId}:generateContent`;
      
      // Build conversation contents (Gemini requires full history each time)
      const contents = [];
      
      // First message: PDF + initial prompt
      if (isInitial && this.pdfContext) {
        contents.push({
          role: 'user',
          parts: [
            this.pdfContext, // PDF inline data
            { text: messageText }
          ]
        });
      }
      // Subsequent messages: rebuild full conversation
      else {
        // Add initial context (PDF + first message) if exists
        if (this.pdfContext && this.chatHistory.length > 0) {
          // First user message should include PDF
          contents.push({
            role: 'user',
            parts: [
              this.pdfContext,
              { text: this.chatHistory[0].message }
            ]
          });
          
          // Add rest of conversation history
          for (let i = 1; i < this.chatHistory.length; i++) {
            const msg = this.chatHistory[i];
            contents.push({
              role: msg.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: msg.message }]
            });
          }
        }
        
        // Add current message
        contents.push({
          role: 'user',
          parts: [{ text: messageText }]
        });
      }
      
      // Build request body
      const requestBody = {
        contents: contents,
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 4096
        }
      };
      
      // Add system instruction for thinking (only for non-initial messages)
      // Use systemInstruction if supported, otherwise prepend to first user message
      if (!isInitial) {
        // Try using systemInstruction (Gemini API may support this)
        // If not supported, the instruction will be added to user message
        const thinkingInstruction = {
          parts: [{
            text: 'Khi trả lời, hãy suy nghĩ trước bằng tiếng Việt. Đặt phần suy nghĩ của bạn trong thẻ <thinking>...</thinking> trước phần trả lời chính. Ví dụ:\n\n<thinking>\nTôi cần phân tích câu hỏi này về tài liệu PDF...\n</thinking>\n\nSau đó mới đưa ra câu trả lời chính.'
          }]
        };
        
        // Try systemInstruction first (if API supports it)
        // If it fails, we'll fall back to adding instruction to user message
        requestBody.systemInstruction = thinkingInstruction;
      }
      
      // Make API request
      const response = await fetch(`${url}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
      }
      
      if (onProgress) onProgress(80); // Response received
      const data = await response.json();
      
      if (onProgress) onProgress(90); // Parsing response
      // Extract response text
      const responseText = this.extractResponseText(data);
      
      if (onProgress) onProgress(100); // Complete
      
      // Store in chat history (only if not initial - initial is already stored)
      if (!isInitial) {
        this.chatHistory.push({
          role: 'user',
          message: messageText,
          timestamp: Date.now(),
          messageId: userMessageId || null
        });
      }
      
      this.chatHistory.push({
        role: 'assistant',
        message: responseText,
        timestamp: Date.now(),
        messageId: assistantMessageId || null
      });
      
      // Trim history if too long (keep latest messages but always keep first one with PDF)
      if (this.chatHistory.length > this.maxHistoryLength) {
        const firstMessage = this.chatHistory[0];
        this.chatHistory = [firstMessage, ...this.chatHistory.slice(-(this.maxHistoryLength - 1))];
        console.log(`[PDFGeminiClient] Trimmed history, kept first message + latest ${this.maxHistoryLength - 1}`);
      }
      
      console.log('[PDFGeminiClient] Message sent successfully');
      
      return {
        success: true,
        text: responseText
      };
      
    } catch (error) {
      console.error('[PDFGeminiClient] Error sending message:', error);
      throw error;
    }
  }
  
  /**
   * Send chat message (convenience method)
   * @param {string|Object} userMessage - Message to send (string or object with message, userMessageId, assistantMessageId)
   */
  async chat(userMessage) {
    try {
      const result = await this.sendMessage(userMessage, false);
      return result.text;
    } catch (error) {
      throw new Error(`Chat failed: ${error.message}`);
    }
  }
  
  /**
   * Extract full text content from PDF using Gemini
   * Returns formatted text that preserves structure (headings, tables, lists, etc.)
   */
  async extractPDFContent() {
    console.log('[PDFGeminiClient] Extracting PDF content...');
    
    if (!this.pdfContext) {
      throw new Error('No PDF loaded');
    }
    
    try {
      const extractionPrompt = `Extract ALL text content from this PDF document. Return ONLY the raw text content exactly as it appears in the PDF, preserving structure and formatting.

CRITICAL RULES - FOLLOW EXACTLY:
1. Extract EVERY word, number, character, and symbol exactly as it appears
2. Preserve document structure EXACTLY:
   - Keep ALL headings, subheadings with their exact text and hierarchy
   - Preserve ALL line breaks (\n) and paragraph spacing
   - Maintain table structures: use pipe separators | for columns (e.g., Column1 | Column2 | Column3)
   - Keep ALL lists, bullet points (•, -, *, numbers) exactly as shown
   - Preserve spacing, indentation, and alignment
   - Keep special characters, symbols, and formatting markers
   - Preserve line breaks between sections
3. ABSOLUTELY DO NOT add:
   - NO introductions ("Here is...", "The document contains...", "Extracted content:", etc.)
   - NO summaries, conclusions, or explanations
   - NO commentary or your own words
   - NO metadata (Document:, Pages:, Size:, Exported:, etc.)
   - NO dividers (═══, ───, etc.)
   - NO headings like "Document Content" or "Content:"
   - NO text that is NOT in the original PDF
4. Output format:
   - Start IMMEDIATELY with the first line of actual PDF content
   - End with the last line of actual PDF content
   - Use pipe (|) for table columns
   - Use line breaks (\n) for paragraphs and section separation
   - Preserve ALL original formatting, spacing, and structure
   - Keep multiple line breaks where they exist in the original

Begin extraction now. Output ONLY the PDF content, nothing else:`;

      const url = `${PDF_CHAT_CONFIG.apiEndpoint}/models/${this.modelId}:generateContent`;
      
      const requestBody = {
        contents: [{
          role: 'user',
          parts: [
            this.pdfContext,
            { text: extractionPrompt }
          ]
        }],
        generationConfig: {
          temperature: 0.1, // Low temperature for accurate extraction
          topK: 20,
          topP: 0.8,
          maxOutputTokens: 8192 // Higher limit for full content
        }
      };
      
      const response = await fetch(`${url}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
      }
      
      const data = await response.json();
      const extractedText = this.extractResponseText(data);
      
      console.log('[PDFGeminiClient] PDF content extracted successfully');
      
      return extractedText;
      
    } catch (error) {
      console.error('[PDFGeminiClient] Failed to extract PDF content:', error);
      throw error;
    }
  }
  
  /**
   * Extract response text from Gemini API response
   */
  extractResponseText(data) {
    try {
      if (data.candidates && data.candidates.length > 0) {
        const candidate = data.candidates[0];
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          return candidate.content.parts[0].text || '';
        }
      }
      return 'No response generated';
    } catch (error) {
      console.error('[PDFGeminiClient] Error extracting response:', error);
      return 'Error parsing response';
    }
  }
  
  /**
   * Get chat history
   */
  getChatHistory() {
    return [...this.chatHistory];
  }
  
  /**
   * Restore chat history from saved session
   */
  async restoreChatHistory(history) {
    this.chatHistory = history || [];
    console.log('[PDFGeminiClient] Chat history restored:', this.chatHistory.length, 'messages');
  }
  
  /**
   * Clear chat history
   */
  clearHistory() {
    this.chatHistory = [];
    console.log('[PDFGeminiClient] Chat history cleared');
  }
  
  /**
   * Reset (clear PDF and history)
   */
  reset() {
    this.pdfContext = null;
    this.chatHistory = [];
    console.log('[PDFGeminiClient] Client reset');
  }
  
  /**
   * Update model
   */
  setModel(modelId) {
    this.modelId = modelId;
    console.log('[PDFGeminiClient] Model updated to:', modelId);
  }
}


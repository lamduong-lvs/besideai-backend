// chat-send.js
// Module xử lý gửi messages

import { enhancedStorageManager } from '../utils/panel-utils.js';
import { stateManager } from '../storage/state-manager.js';
import { PendingImagesDB } from '../storage/pending-images-db.js';
import { compressImage } from '../media/image-processor.js';
import { scrollToBottom } from './message-renderer.js';
import { updateConversationTitle, updateGreetingVisibility } from './chat-state.js';

export async function handleSendMessage(
  isComposeGmailMode,
  gmailContextSummary,
  Lang,
  showError,
  showSuccess,
  renderMessageFn,
  actionHandlers,
  valueFromEvent = null
) {
  try {
    // Ưu tiên sử dụng value từ event (tránh timing issues khi input đã bị clear)
    let messageText = valueFromEvent ? valueFromEvent.trim() : null;
    
    // Nếu không có value từ event, lấy từ input
    if (!messageText) {
      const inputManager = window.inputManager;
      if (!inputManager) {
        console.error('[ChatSend] InputManager not found');
        return;
      }
      
      const activeInput = inputManager.getCurrent();
      if (!activeInput) {
        console.warn('[ChatSend] No active input found');
        return;
      }
      
      messageText = activeInput.getValue().trim();
    }
    
    if (!messageText && !isComposeGmailMode) {
      showError(Lang.get('errorEmptyMessage'));
      return;
    }
    
    // Get current conversation ID
    let conversationId = await stateManager.getCurrentConversationId();
    
    // If no conversation, create a new one
    if (!conversationId) {
      const conversationType = isComposeGmailMode ? 'gmail' : 'chat';
      const newConversation = await enhancedStorageManager.createConversation(null, conversationType);
      conversationId = newConversation.id;
      await stateManager.setCurrentConversationId(conversationId, conversationType);
    }
    
    // Get conversation
    const conversation = await enhancedStorageManager.getConversation(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    
    // Get pending files (images and other files)
    const pendingFiles = await PendingImagesDB.getAll();
    let images = [];
    let attachedFiles = [];
    
    const extractMimeType = (dataUrl, fallback = 'image/png') => {
      if (typeof dataUrl !== 'string') return fallback;
      const match = dataUrl.match(/^data:([^;]+);/i);
      return match ? match[1] : fallback;
    };
    
    if (pendingFiles && pendingFiles.length > 0) {
      // Process all files (images and documents)
      for (const file of pendingFiles) {
        const isImage = file.fileType && file.fileType.startsWith('image/');
        const fileData = {
          dataUrl: file.dataUrl,
          fileName: file.fileName || (isImage ? 'image.png' : 'file'),
          fileType: extractMimeType(file.dataUrl, file.fileType || (isImage ? 'image/png' : 'application/octet-stream'))
        };
        
        if (isImage) {
          // Validate dataUrl before compression
          if (!file.dataUrl || typeof file.dataUrl !== 'string' || file.dataUrl.trim().length === 0) {
            console.warn('[ChatSend] Invalid image dataUrl, skipping:', file.fileName);
            continue;
          }
          
          // Compress images
          try {
            const compressed = await compressImage(file.dataUrl);
            // Validate compressed result
            if (compressed && typeof compressed === 'string' && compressed.trim().length > 0) {
              fileData.dataUrl = compressed;
              fileData.fileType = extractMimeType(compressed, file.fileType || 'image/png');
            } else {
              console.warn('[ChatSend] Compression returned invalid result, using original:', file.fileName);
            }
            images.push(fileData);
          } catch (error) {
            console.warn('[ChatSend] Error compressing image, using original:', file.fileName, error.message);
            // Use original if compression fails - this is not a critical error
            images.push(fileData);
          }
        } else {
          // Non-image files go to attachedFiles
          attachedFiles.push(fileData);
        }
      }
      
      // Clear pending files after processing - do this immediately
      try {
        await PendingImagesDB.clear();
      } catch (clearError) {
        console.error('[ChatSend] Error clearing PendingImagesDB:', clearError);
      }
      
      // Also clear from window.pendingImages
      if (window.pendingImages) {
        window.pendingImages = [];
      }
      
      // Clear preview display immediately
      const previewContainer = document.getElementById('imagePreviewContainer');
      if (previewContainer) {
        previewContainer.remove();
      }
      
      // Update storage metadata
      try {
        await chrome.storage.local.remove(['pendingImagesCount', 'pendingImagesTimestamp']).catch(() => {});
      } catch (metaError) {
        console.warn('[ChatSend] Error clearing metadata:', metaError);
      }
    }
    
    // Create user message
    const userMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
      images: images.length > 0 ? images : undefined,
      attachedFiles: attachedFiles.length > 0 ? attachedFiles : undefined
    };
    
    // Add message to conversation
    conversation.messages.push(userMessage);
    await enhancedStorageManager.saveConversation(conversation);
    
    // Render user message
    if (renderMessageFn) {
      await renderMessageFn(userMessage, Lang, showError, showSuccess, actionHandlers);
      updateGreetingVisibility();
    }
    
    // Update conversation title if this is the first message
    if (conversation.messages.length === 1) {
      updateConversationTitle(messageText, Lang);
    }
    
    // Note: Input đã được clear bởi keyboard handler hoặc events handler khi submit
    // Không cần clear lại ở đây để tránh race condition
    
    // Clear input text from storage to prevent it from being reloaded when panel reopens
    try {
      await chrome.storage.local.remove(['panelInputText']);
    } catch (error) {
      console.warn('[ChatSend] Error clearing panelInputText from storage:', error);
    }
    
    // Create assistant message ID first (for streaming)
    const assistantMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create assistant message with empty content initially (for streaming)
    const assistantMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString()
    };
    
    // Render assistant message immediately with empty content (will show cursor when streaming starts)
    let messageElement = null;
    if (renderMessageFn) {
      messageElement = await renderMessageFn(assistantMessage, Lang, showError, showSuccess, actionHandlers);
      updateGreetingVisibility();
    }
    
    // Import updateMessageContent for streaming
    const { updateMessageContent } = await import('./message-renderer.js');
    // Import updateModelNameDisplay for model name updates
    const { updateModelNameDisplay } = await import('../utils/model.js');
    
    // Create a port connection for streaming
    const port = chrome.runtime.connect({ name: 'streaming' });
    let accumulatedContent = '';
    let isStreamingComplete = false;
    let updateTimeout = null;
    let usedFullModelId = null; // Store model ID from response
    
    // Register port with messageId and wait for confirmation
    let portRegistered = false;
    const registrationListener = (message) => {
      if (message.type === 'registered' && message.messageId === assistantMessageId) {
        portRegistered = true;
        console.log('[ChatSend] Port registered successfully for messageId:', assistantMessageId);
      }
    };
    port.onMessage.addListener(registrationListener);
    
    port.postMessage({ type: 'register', messageId: assistantMessageId });
    
    // Wait for registration confirmation (max 500ms)
    for (let i = 0; i < 10 && !portRegistered; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    if (!portRegistered) {
      console.warn('[ChatSend] Port registration timeout, proceeding anyway');
    }
    
    // Remove registration listener and add main listener
    port.onMessage.removeListener(registrationListener);
    
    // Track chunk count for better update strategy
    let chunkCount = 0;
    
    // Hàm loại bỏ thẻ <think> và <think> khỏi content
    const removeRedactedReasoning = (content) => {
      let processed = content;
      
      // Loại bỏ thẻ <think>...</think> (case-insensitive, multiline) - trong markdown
      const thinkRegex = /<think>([\s\S]*?)<\/think>/i;
      processed = processed.replace(thinkRegex, '');
      
      // Loại bỏ thẻ <think>...</think> (case-insensitive, multiline) - trong HTML
      const redactedReasoningRegex = /<redacted_reasoning[^>]*>([\s\S]*?)<\/redacted_reasoning>/gi;
      processed = processed.replace(redactedReasoningRegex, '');
      
      return processed;
    };
    
    // Listen for streaming chunks
    port.onMessage.addListener((message) => {
      console.log('[ChatSend] Received port message:', message.type, message.chunk ? `chunk length: ${message.chunk.length}` : '');
      
      if (message.type === 'chunk') {
        chunkCount++;
        // Append chunk to accumulated content
        accumulatedContent += message.chunk;
        
        // Loại bỏ thẻ <think> và <think> ngay lập tức trước khi hiển thị
        const cleanedContent = removeRedactedReasoning(accumulatedContent);
        
        // Clear any pending debounced update
        if (updateTimeout) {
          clearTimeout(updateTimeout);
          updateTimeout = null;
        }
        
        // Update immediately for smoother streaming with cursor
        // The chunks are already small (2 chars) and delayed, so we can update immediately
        // Show cursor to indicate streaming is in progress
        // Sử dụng cleanedContent đã loại bỏ <think>
        updateMessageContent(assistantMessageId, cleanedContent, false, true);
      } else if (message.type === 'done') {
        // Clear any pending debounced updates
        if (updateTimeout) {
          clearTimeout(updateTimeout);
          updateTimeout = null;
        }
        
        isStreamingComplete = true;
        accumulatedContent = message.finalContent || accumulatedContent;
        
        // Loại bỏ thẻ <think> và <think> trước khi final update
        const cleanedContent = removeRedactedReasoning(accumulatedContent);
        
        // Final update without cursor - ensure all content is displayed, và finalize thinking
        updateMessageContent(assistantMessageId, cleanedContent, false, false, true);
        
        // Lưu cleanedContent vào assistantMessage để lưu vào storage
        accumulatedContent = cleanedContent;
        
        // Update model name if we have usedFullModelId
        if (usedFullModelId || message.usedFullModelId) {
          const modelIdToUse = message.usedFullModelId || usedFullModelId;
          // Use .then() instead of await since we're in a non-async callback
          updateModelNameDisplay(modelIdToUse).then(() => {
            console.log('[ChatSend] Updated model name after response:', modelIdToUse);
          }).catch((error) => {
            console.warn('[ChatSend] Failed to update model name:', error);
          });
        }
        
        console.log('[ChatSend] Streaming completed, total chunks:', chunkCount, 'final length:', accumulatedContent.length);
        port.disconnect();
      } else if (message.type === 'error') {
        // Clear any pending updates
        if (updateTimeout) {
          clearTimeout(updateTimeout);
          updateTimeout = null;
        }
        
        isStreamingComplete = true;
        port.disconnect();
        // Remove cursor
        const contentDiv = messageElement?.querySelector('.message-content');
        if (contentDiv) {
          const cursor = contentDiv.querySelector('.streaming-cursor');
          if (cursor) cursor.remove();
        }
        showError(message.error || Lang.get('errorSendMessage', { error: 'Lỗi khi stream response' }));
      }
    });
    
    port.onDisconnect.addListener(() => {
      if (updateTimeout) {
        clearTimeout(updateTimeout);
        updateTimeout = null;
      }
      if (!isStreamingComplete) {
        // Connection closed unexpectedly
        console.warn('[ChatSend] Streaming connection closed unexpectedly');
      }
    });
    
    // Send to background for AI processing with streaming
    try {
      let response;
      try {
        console.log('[ChatSend] Sending streaming request with messageId:', assistantMessageId);
        // Thêm system prompt yêu cầu thinking bằng tiếng Việt
        const messagesToSend = conversation.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          images: msg.images,
          attachedFiles: msg.attachedFiles
        }));
        
        // Thêm system message yêu cầu thinking nếu chưa có
        const hasSystemMessage = messagesToSend.some(msg => msg.role === 'system');
        if (!hasSystemMessage) {
          messagesToSend.unshift({
            role: 'system',
            content: 'Khi trả lời, hãy suy nghĩ trước bằng tiếng Việt. Đặt phần suy nghĩ của bạn trong thẻ <thinking>...</thinking> trước phần trả lời chính. Ví dụ:\n\n<thinking>\nTôi cần phân tích câu hỏi này...\n</thinking>\n\nSau đó mới đưa ra câu trả lời chính.'
          });
        }
        
        response = await chrome.runtime.sendMessage({
          action: 'processActionStream',
          messages: messagesToSend,
          images: images.length > 0 ? images.map(img => img.dataUrl) : undefined,
          attachedFiles: attachedFiles.length > 0 ? attachedFiles : undefined,
          config: await getAIConfig(),
          streaming: true,
          messageId: assistantMessageId,
          portName: 'streaming'
        });
        
        // Check for runtime errors
        if (chrome.runtime.lastError) {
          console.error('[ChatSend] chrome.runtime.lastError:', chrome.runtime.lastError.message);
          port.disconnect();
          throw new Error(chrome.runtime.lastError.message || 'Extension runtime error');
        }
      } catch (sendError) {
        console.error('[ChatSend] Error sending message to background:', sendError);
        port.disconnect();
        throw sendError;
      }
      
      // Store usedFullModelId from response if available
      if (response && response.usedFullModelId) {
        usedFullModelId = response.usedFullModelId;
        console.log('[ChatSend] Stored usedFullModelId from response:', usedFullModelId);
      }
      
      // If response indicates non-streaming (fallback), handle it
      if (response && response.success && !response.streaming) {
        // Non-streaming response - update content directly
        // Update model name if available
        if (response.usedFullModelId) {
          const { updateModelNameDisplay } = await import('../utils/model.js');
          await updateModelNameDisplay(response.usedFullModelId);
        }
        accumulatedContent = response.result || '';
        updateMessageContent(assistantMessageId, accumulatedContent, false);
        isStreamingComplete = true;
        port.disconnect();
      } else if (response && !response.success) {
        // Error response
        isStreamingComplete = true;
        port.disconnect();
        const contentDiv = messageElement?.querySelector('.message-content');
        if (contentDiv) {
          const cursor = contentDiv.querySelector('.streaming-cursor');
          if (cursor) cursor.remove();
        }
        
        // Extract error message
        let errorMessage = 'Lỗi không xác định';
        
        if (response.error) {
          if (typeof response.error === 'string') {
            errorMessage = response.error;
          } else if (response.error.message) {
            errorMessage = response.error.message;
          } else if (response.error.error) {
            errorMessage = response.error.error;
          }
        } else if (response.message) {
          errorMessage = response.message;
        }
        
        showError(errorMessage);
        return;
      }
      
      // Wait for streaming to complete (or timeout after 60 seconds)
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          if (!isStreamingComplete) {
            console.warn('[ChatSend] Streaming timeout, finalizing content');
            isStreamingComplete = true;
            port.disconnect();
            const contentDiv = messageElement?.querySelector('.message-content');
            if (contentDiv) {
              const cursor = contentDiv.querySelector('.streaming-cursor');
              if (cursor) cursor.remove();
            }
          }
          resolve();
        }, 60000);
        
        // Check if streaming is complete periodically
        const checkInterval = setInterval(() => {
          if (isStreamingComplete) {
            clearTimeout(timeout);
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });
      
      // Finalize message content
      assistantMessage.content = accumulatedContent;
      
      // Add to conversation
      conversation.messages.push(assistantMessage);
      await enhancedStorageManager.saveConversation(conversation);
    } catch (error) {
      // Remove cursor on error
      const contentDiv = messageElement?.querySelector('.message-content');
      if (contentDiv) {
        const cursor = contentDiv.querySelector('.streaming-cursor');
        if (cursor) cursor.remove();
      }
      if (port) {
        port.disconnect();
      }
      // Remove loading message if still present
      if (loadingEl) {
        loadingEl.remove();
      }
      console.error('[ChatSend] Error sending message:', error);
      if (error?.message?.includes('Extension context invalidated')) {
        showError(Lang.get('errorExtContext') || 'Extension vừa được tải lại. Vui lòng mở lại Panel.');
      } else {
        showError(Lang.get('errorSendMessage', { error: error.message }));
      }
    }
  } catch (error) {
    // Outer catch for any errors in the entire function
    console.error('[ChatSend] Error in handleSendMessage:', error);
    showError(Lang.get('errorSendMessage', { error: error.message }));
  }
}

async function getAIConfig() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getAIConfig' });
    if (response.success) {
      return response.config;
    }
    throw new Error(response.error?.message || response.error || 'Failed to get AI config');
  } catch (error) {
    console.error('[ChatSend] Error getting AI config:', error);
    throw error instanceof Error ? error : new Error(error?.message || 'Failed to get AI config');
  }
}


// message.js
// Message handling and panel message listeners

import { stateManager } from '../storage/state-manager.js';
import { createNewConversation } from '../storage/conversation-utils.js';
import { enhancedStorageManager } from '../utils/panel-utils.js';
import { renderMessage, updateConversationTitle, updateGreetingVisibility, createLoadingMessage, scrollToBottom } from '../chat/chat-ui.js';
import { setGmailContextSummary } from '../controllers/gmail-controller.js';
import { PendingImagesDB } from '../storage/pending-images-db.js';
import { processCropImage } from '../media/image-processor.js';
import { showImagePreview } from '../ui/preview.js';
import { showError, showSuccess } from '../utils/toast.js';

export function setupPanelMessageListener(Lang) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'SHOW_GMAIL_LOADING') {
      (async () => {
        try {
          await stateManager.setPanelMode('gmail');
          await createNewConversation('gmail');
          const messagesContainer = document.getElementById('messagesContainer');
          messagesContainer.querySelectorAll('.message').forEach(el => el.remove());
          updateConversationTitle('', Lang);
          updateGreetingVisibility();
          const userMessage = {
            id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            role: 'user',
            content: 'Tóm tắt email này',
            timestamp: new Date().toISOString()
          };
          await enhancedStorageManager.addMessage(userMessage);
          await renderMessage(userMessage, Lang, showError, showSuccess);

          // Create assistant message ID for streaming
          const assistantMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          // Create assistant message with empty content initially (for streaming)
          const assistantMessage = {
            id: assistantMessageId,
            role: 'assistant',
            content: '',
            timestamp: new Date().toISOString()
          };

          // Render assistant message immediately with empty content
          const { renderMessage: renderMsg } = await import('../chat/chat-ui.js');
          const messageElement = await renderMsg(assistantMessage, Lang, showError, showSuccess);

          // Remove loading message
          const loadingMsg = document.querySelector('.loading-message');
          if (loadingMsg) loadingMsg.remove();

          // Create streaming port
          const port = chrome.runtime.connect({ name: 'streaming' });
          let accumulatedContent = '';
          let isStreamingComplete = false;

          // Register port with messageId
          let portRegistered = false;
          const registrationListener = (message) => {
            if (message.type === 'registered' && message.messageId === assistantMessageId) {
              portRegistered = true;
              console.log('[Panel] Gmail summary port registered for messageId:', assistantMessageId);
            }
          };
          port.onMessage.addListener(registrationListener);
          port.postMessage({ type: 'register', messageId: assistantMessageId });

          // Wait for registration confirmation (max 500ms)
          for (let i = 0; i < 10 && !portRegistered; i++) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }

          if (!portRegistered) {
            console.warn('[Panel] Gmail summary port registration timeout');
          }

          // Remove registration listener and add main listener
          port.onMessage.removeListener(registrationListener);

          // Import updateMessageContent for streaming
          const { updateMessageContent } = await import('../chat/message-renderer.js');

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
            if (message.type === 'chunk') {
              accumulatedContent += message.chunk;
              // Loại bỏ thẻ <think> và <think> ngay lập tức trước khi hiển thị
              const cleanedContent = removeRedactedReasoning(accumulatedContent);
              updateMessageContent(assistantMessageId, cleanedContent, false, true);
            } else if (message.type === 'done') {
              isStreamingComplete = true;
              accumulatedContent = message.finalContent || accumulatedContent;
              // Loại bỏ thẻ <think> và <think> trước khi final update
              const cleanedContent = removeRedactedReasoning(accumulatedContent);
              updateMessageContent(assistantMessageId, cleanedContent, false, false, true);

              // Lưu cleanedContent vào assistantMessage
              accumulatedContent = cleanedContent;

              // Save final message
              assistantMessage.content = accumulatedContent;
              enhancedStorageManager.addMessage(assistantMessage).catch(console.error);

              // Update header title and context
              const headerTitle = document.querySelector('.header-title');
              if (headerTitle) {
                headerTitle.textContent = (Lang.get && Lang.get('gmailSummaryTitle')) ? Lang.get('gmailSummaryTitle') : 'Tóm tắt Email';
              }

              // Set Gmail context summary
              setGmailContextSummary(accumulatedContent);

              // Mark streaming as complete
              if (window.gmailSummaryStreaming) {
                window.gmailSummaryStreaming.isComplete = true;
              }

              port.disconnect();
            } else if (message.type === 'error') {
              isStreamingComplete = true;
              port.disconnect();
              showError(message.error || 'Lỗi khi tóm tắt email');

              // Update header title on error
              const headerTitle = document.querySelector('.header-title');
              if (headerTitle) {
                headerTitle.textContent = (Lang.get && Lang.get('newConversationTitle')) ? Lang.get('newConversationTitle') : 'Cuộc hội thoại mới';
              }

              // Mark streaming as complete
              if (window.gmailSummaryStreaming) {
                window.gmailSummaryStreaming.isComplete = true;
              }
            }
          });

          port.onDisconnect.addListener(() => {
            if (!isStreamingComplete) {
              console.warn('[Panel] Gmail summary streaming connection closed unexpectedly');
            }
          });

          // Store port and messageId for background to use
          window.gmailSummaryStreaming = {
            port: port,
            messageId: assistantMessageId
          };

          const headerTitle = document.querySelector('.header-title');
          if (headerTitle) {
            headerTitle.textContent = (Lang.get && Lang.get('summarizingText')) ? Lang.get('summarizingText') : 'Đang tóm tắt...';
          }
          sendResponse({ success: true, messageId: assistantMessageId });
        } catch (e) {
          console.error('[Panel] SHOW_GMAIL_LOADING error:', e);
          sendResponse({ success: false, error: e.message });
        }
      })();
      return true;
    }
    if (request.action === 'DISPLAY_GMAIL_SUMMARY') {
      // This action is now deprecated - streaming is handled via port in SHOW_GMAIL_LOADING
      // But we keep it for backward compatibility and error handling
      (async () => {
        try {
          // If streaming is in progress, don't override it
          if (window.gmailSummaryStreaming && !window.gmailSummaryStreaming.isComplete) {
            console.log('[Panel] Gmail summary streaming in progress, ignoring DISPLAY_GMAIL_SUMMARY');
            sendResponse({ success: true });
            return;
          }

          await stateManager.setPanelMode('gmail');
          const loadingMsg = document.querySelector('.loading-message');
          if (loadingMsg) loadingMsg.remove();
          const payload = request.payload || {};
          const aiMessage = {
            id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            role: 'assistant',
            content: (payload.summaryMarkdown || ''),
            timestamp: new Date().toISOString()
          };
          const el = await renderMessage(aiMessage, Lang, showError, showSuccess);
          const contentDiv = el.querySelector('.message-content');
          if (typeof marked !== 'undefined') {
            contentDiv.innerHTML = marked.parse(aiMessage.content);
          }
          await enhancedStorageManager.addMessage(aiMessage);
          await chrome.storage.local.set({ panelMessagesUpdated: Date.now() });
          if (enhancedStorageManager.currentConversationId) {
            await stateManager.setCurrentConversationId(enhancedStorageManager.currentConversationId, 'gmail');
          }
          setGmailContextSummary(payload.context || '');
          const headerTitle = document.querySelector('.header-title');
          if (headerTitle) {
            headerTitle.textContent = (Lang.get && Lang.get('gmailSummaryTitle')) ? Lang.get('gmailSummaryTitle') : 'Tóm tắt Email';
          }
          scrollToBottom();
          sendResponse({ success: true });
        } catch (e) {
          console.error('[Panel] DISPLAY_GMAIL_SUMMARY error:', e);
          showError('Lỗi hiển thị tóm tắt: ' + e.message);
          sendResponse({ success: false, error: e.message });
        }
      })();
      return true;
    }
    if (request.action === 'DISPLAY_GMAIL_ERROR') {
      try {
        const loadingMsg = document.querySelector('.loading-message');
        if (loadingMsg) loadingMsg.remove();
        showError(request.error || 'Không thể tóm tắt email.');
        const headerTitle = document.querySelector('.header-title');
        if (headerTitle) {
          headerTitle.textContent = (Lang.get && Lang.get('newConversationTitle')) ? Lang.get('newConversationTitle') : 'Cuộc hội thoại mới';
        }
        sendResponse({ success: true });
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
      return true;
    }
    if (request.action === 'newImagePending') {
      console.log('[Panel] Received newImagePending message, imageId:', request.imageId);
      (async () => {
        try {
          const images = await PendingImagesDB.getAll();
          const image = images.find(img => img.id === request.imageId);
          if (image && image.dataUrl) {
            console.log('[Panel] Found image in PendingImagesDB, processing...');
            await processCropImage(
              image.dataUrl,
              image.fileName || 'screenshot.png',
              image.fileType || 'image/png',
              showError,
              Lang,
              showImagePreview
            );
            console.log('[Panel] Successfully processed image from PendingImagesDB');
          } else {
            console.warn('[Panel] Image not found in PendingImagesDB:', request.imageId);
          }
        } catch (error) {
          console.error('[Panel] Error processing newImagePending:', error);
          if (showError) {
            showError(Lang.get('errorCropImageFailed') || 'Lỗi khi xử lý ảnh: ' + error.message);
          }
        }
      })();
      return true;
    }
    if (request.action === 'screenshotAreaForChat') {
      console.log('[Panel] Processing screenshotAreaForChat message, dataUrl present:', !!request.dataUrl);
      (async () => {
        try {
          const { handleScreenshotForChat } = await import('./screenshot.js');
          await handleScreenshotForChat(request.dataUrl, Lang);
          console.log('[Panel] handleScreenshotForChat completed successfully');
          sendResponse({ success: true });
        } catch (error) {
          console.error('[Panel] Error handling screenshot for chat:', error);
          sendResponse({ success: false, error: error.message });
        }
      })();
      return true;
    }
  });
}


export function applyPanelModeLayout(mode) {
  const chatView = document.getElementById('chatView');
  const recordView = document.getElementById('recordView');
  const translateView = document.getElementById('translateView');
  const pdfChatView = document.getElementById('pdfChatView');
  
  const showChat = () => {
    console.log('[ModeLayout] showChat() called');
    if (chatView) {
      chatView.style.display = 'flex';
      chatView.classList.remove('d-none');
    }
    if (recordView) {
      recordView.style.display = 'none';
      recordView.classList.add('d-none');
    }
    if (translateView) {
      translateView.style.display = 'none';
      translateView.classList.add('d-none');
    }
    if (pdfChatView) {
      pdfChatView.style.display = 'none';
      pdfChatView.classList.add('d-none');
    }
    
    // Ẩn các input containers khác
    const pdfChatInputContainer = document.getElementById('pdf-chat-input-container');
    const gmailInputContainer = document.getElementById('gmail-input-container');
    
    if (pdfChatInputContainer) {
      pdfChatInputContainer.classList.add('d-none');
      pdfChatInputContainer.style.display = 'none';
    }
    if (gmailInputContainer) {
      gmailInputContainer.classList.add('d-none');
      gmailInputContainer.style.display = 'none';
    }
    
    // Setup và show main chat input
    setTimeout(async () => {
      try {
        console.log('[ModeLayout] Setting up chat input...');
        const { setupChatInput } = await import('../init/event-listeners.js');
        if (typeof setupChatInput === 'function') {
          setupChatInput();
          console.log('[ModeLayout] Chat input setup completed');
        } else {
          console.error('[ModeLayout] setupChatInput is not a function');
        }
      } catch (error) {
        console.error('[ModeLayout] Failed to setup chat input:', error);
      }
    }, 100);
  };

  const showTranslate = () => {
    if (chatView) {
      chatView.style.display = 'none';
      chatView.classList.add('d-none');
    }
    if (recordView) {
      recordView.style.display = 'none';
      recordView.classList.add('d-none');
    }
    if (translateView) {
      translateView.style.display = 'flex';
      translateView.classList.remove('d-none');
    }
    if (pdfChatView) {
      pdfChatView.style.display = 'none';
      pdfChatView.classList.add('d-none');
    }
    
    // Ẩn tất cả các input containers ở footer
    const chatInputContainer = document.getElementById('chat-input-container');
    const pdfChatInputContainer = document.getElementById('pdf-chat-input-container');
    const gmailInputContainer = document.getElementById('gmail-input-container');
    const translateInputContainer = document.getElementById('translate-input-container');
    
    if (chatInputContainer) {
      chatInputContainer.classList.add('d-none');
      chatInputContainer.style.display = 'none';
    }
    if (pdfChatInputContainer) {
      pdfChatInputContainer.classList.add('d-none');
      pdfChatInputContainer.style.display = 'none';
    }
    if (gmailInputContainer) {
      gmailInputContainer.classList.add('d-none');
      gmailInputContainer.style.display = 'none';
    }
    if (translateInputContainer) {
      translateInputContainer.classList.add('d-none');
      translateInputContainer.style.display = 'none';
    }
    
    // Hide tất cả input instances nếu có
    if (window.inputManager) {
      try {
        // Hide chat input
        const chatInput = window.inputManager.get('chat-input-container');
        if (chatInput) {
          chatInput.hide();
        }
        // Hide PDF Chat input
        const pdfChatInput = window.inputManager.get('pdf-chat-input-container');
        if (pdfChatInput) {
          pdfChatInput.hide();
        }
        // Hide Gmail input
        const gmailInput = window.inputManager.get('gmail-input-container');
        if (gmailInput) {
          gmailInput.hide();
        }
        // Destroy translate input nếu có
        try {
          window.inputManager.destroy('translate-input-container');
        } catch (e) {
          // Ignore nếu không tồn tại
        }
      } catch (e) {
        console.warn('[ModeLayout] Error hiding input instances:', e);
      }
    }
  };

  const showRecord = () => {
    if (chatView) {
      chatView.style.display = 'none';
      chatView.classList.add('d-none');
    }
    if (recordView) {
      recordView.style.display = 'flex';
      recordView.classList.remove('d-none');
    }
    if (translateView) {
      translateView.style.display = 'none';
      translateView.classList.add('d-none');
    }
    if (pdfChatView) {
      pdfChatView.style.display = 'none';
      pdfChatView.classList.add('d-none');
    }
  };

  const showPDFChat = () => {
    console.log('[ModeLayout] Showing PDF Chat view');
    if (chatView) {
      chatView.style.display = 'none';
      chatView.classList.add('d-none');
    }
    if (recordView) {
      recordView.style.display = 'none';
      recordView.classList.add('d-none');
    }
    if (translateView) {
      translateView.style.display = 'none';
      translateView.classList.add('d-none');
    }
    if (pdfChatView) {
      pdfChatView.style.display = 'flex';
      pdfChatView.classList.remove('d-none');
      console.log('[ModeLayout] PDF Chat view display:', pdfChatView.style.display);
      console.log('[ModeLayout] PDF Chat view classes:', pdfChatView.className);
    } else {
      console.error('[ModeLayout] pdfChatView not found!');
    }
    
    // Ẩn các input containers khác (gmail) khi chuyển sang PDF chat
    const gmailInputContainer = document.getElementById('gmail-input-container');
    
    if (gmailInputContainer) {
      gmailInputContainer.classList.add('d-none');
      gmailInputContainer.style.display = 'none';
    }
    
    // PDF chat input sẽ được show bởi switchToPdfChatInput()
  };

  // Trigger event để input state manager xử lý
  const event = new CustomEvent('panel:mode-changed', {
    detail: { mode }
  });
  document.dispatchEvent(event);

  switch (mode) {
    case 'translate':
      showTranslate();
      break;
    case 'record':
      showRecord();
      break;
    case 'pdfChat':
      showPDFChat();
      break;
    case 'gmail':
    case 'chat':
    default:
      showChat();
      break;
  }
}


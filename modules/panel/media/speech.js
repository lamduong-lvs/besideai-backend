// speech.js
// Module quản lý Speech Recognition

let recognition = null;
let isListening = false;

export function setupSpeechRecognition(Lang, handleInputResize, showError, chatInput, micBtn) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  // If elements are not passed, try to find them từ module input mới
  if (!chatInput) {
    const inputManager = window.inputManager;
    if (inputManager) {
      const activeInput = inputManager.getCurrent();
      if (activeInput && activeInput.textarea) {
        chatInput = activeInput.textarea.getElement();
      }
    }
  }

  if (!micBtn) {
    // Try to find mic button từ module input mới
    const inputManager = window.inputManager;
    if (inputManager) {
      const activeInput = inputManager.getCurrent();
      if (activeInput) {
        const containerId = activeInput.containerId;
        micBtn = document.getElementById(`${containerId}-micBtn`);
      }
    }
  }

  if (!SpeechRecognition) {
    console.warn('[Speech] Web Speech API not supported');
    if (micBtn) micBtn.style.display = 'none';
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'vi-VN';

  recognition.onstart = () => {
    isListening = true;
    if (micBtn) micBtn.classList.add('is-listening');
    // Update placeholder từ module input mới
    const inputManager = window.inputManager;
    if (inputManager) {
      const activeInput = inputManager.getCurrent();
      if (activeInput && activeInput.textarea) {
        activeInput.textarea.setPlaceholder(Lang.get("placeholderListening") || 'Đang nghe...');
      }
    }
  };

  recognition.onend = () => {
    isListening = false;
    if (micBtn) micBtn.classList.remove('is-listening');
    // Update placeholder từ module input mới
    const inputManager = window.inputManager;
    if (inputManager) {
      const activeInput = inputManager.getCurrent();
      if (activeInput && activeInput.textarea) {
        activeInput.textarea.setPlaceholder(Lang.get("chatPlaceholderPanel") || 'Nhập tin nhắn...');
      }
    }
  };

  recognition.onresult = (event) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }

    // Update value từ module input mới
    const inputManager = window.inputManager;
    if (inputManager) {
      const activeInput = inputManager.getCurrent();
      if (activeInput) {
        activeInput.setValue(finalTranscript + interimTranscript);
        
        if (finalTranscript) {
          activeInput.setValue(finalTranscript.trim());
        }
      }
    }
  };

  recognition.onerror = (event) => {
    console.error('[Speech] Speech recognition error:', event.error);
    isListening = false;
    if (micBtn) micBtn.classList.remove('is-listening');
    // Update placeholder từ module input mới
    const inputManager = window.inputManager;
    if (inputManager) {
      const activeInput = inputManager.getCurrent();
      if (activeInput && activeInput.textarea) {
        activeInput.textarea.setPlaceholder(Lang.get("chatPlaceholderPanel") || 'Nhập tin nhắn...');
      }
    }

    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      console.warn('[Speech] Microphone permission denied');
    }
  };
}

export async function handleMicClick(Lang, handleInputResize, showError, chatInput, micBtn) {
  // Setup speech recognition if not already done
  if (!recognition) {
    setupSpeechRecognition(Lang, handleInputResize, showError, chatInput, micBtn);
    if (!recognition) {
      showError(Lang.get("errorWebSpeechNotSupported") || 'Trình duyệt không hỗ trợ nhận diện giọng nói');
      return;
    }
  }

  if (isListening) {
    recognition.stop();
    isListening = false;
  } else {
    try {
      // Reset placeholder before starting từ module input mới
      const inputManager = window.inputManager;
      if (inputManager) {
        const activeInput = inputManager.getCurrent();
        if (activeInput && activeInput.textarea) {
          activeInput.textarea.setPlaceholder(Lang.get("placeholderListening") || 'Đang nghe...');
        }
      }

      recognition.start();
    } catch (error) {
      console.error('[Speech] Failed to start recognition:', error);
      isListening = false;

      if (chatInput) {
        // Update placeholder từ module input mới
        const inputManager = window.inputManager;
        if (inputManager) {
          const activeInput = inputManager.getCurrent();
          if (activeInput && activeInput.textarea) {
            activeInput.textarea.setPlaceholder(Lang.get("chatPlaceholderPanel") || 'Nhập tin nhắn...');
          }
        }
      }

      showError(Lang.get("errorSpeechRecognition") || 'Lỗi nhận diện giọng nói');
    }
  }
}

export function isSpeechListening() {
  return isListening;
}


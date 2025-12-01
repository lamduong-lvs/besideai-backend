// resize.js
// Input resize handle management - Updated for new input module

export function setupResizeHandle() {
  const resizeHandle = document.getElementById('resizeHandle');
  if (!resizeHandle) return;
  
  // Lấy textarea từ module input mới
  const inputManager = window.inputManager;
  let chatInput = null;
  let inputContainer = null;
  
  if (inputManager) {
    const activeInput = inputManager.getCurrent();
    if (activeInput && activeInput.textarea) {
      chatInput = activeInput.textarea.getElement();
      const container = document.getElementById(activeInput.containerId);
      if (container) {
        inputContainer = container.querySelector('.input-wrapper');
      }
    }
  }
  
  if (!resizeHandle || !chatInput || !inputContainer) return;
  
  let isResizing = false;
  let startY = 0;
  let startHeight = 0;
  const minHeight = 80;
  const maxHeight = 300;
  
  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startY = e.clientY;
    startHeight = chatInput.offsetHeight;
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const deltaY = startY - e.clientY;
    const newHeight = Math.max(minHeight, Math.min(maxHeight, startHeight + deltaY));
    chatInput.style.height = newHeight + 'px';
  });
  
  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });
}


// scroll.js
// Scroll to bottom button management for PDF Chat
// Based on Main Chat scroll implementation for consistency

let _isProgrammaticScroll = false;
let _scrollClassTimeout = null;
let _moRafId = null;

/**
 * Setup scroll to bottom button for PDF Chat
 * @param {HTMLElement} messagesContainer - The messages container element
 * @param {string} buttonId - The ID of the scroll button (default: 'pdfScrollToBottomBtn')
 */
export function setupPDFChatScroll(messagesContainer, buttonId = 'pdfScrollToBottomBtn') {
  if (!messagesContainer) {
    console.warn('[PDF Chat Scroll] Messages container not found');
    return;
  }

  // Get scroll button (should already exist in HTML)
  const scrollToBottomBtn = document.getElementById(buttonId);
  if (!scrollToBottomBtn) {
    console.warn('[PDF Chat Scroll] Scroll button not found:', buttonId);
    return;
  }

  /**
   * Check scroll position and show/hide button
   */
  function checkScrollPosition() {
    const scrollTop = messagesContainer.scrollTop;
    const scrollHeight = messagesContainer.scrollHeight;
    const clientHeight = messagesContainer.clientHeight;
    const isAtBottom = scrollHeight - scrollTop <= clientHeight + 50;
    
    if (isAtBottom) {
      scrollToBottomBtn.classList.remove('visible');
    } else {
      scrollToBottomBtn.classList.add('visible');
    }
  }

  // Setup scroll event listener
  messagesContainer.addEventListener('scroll', () => {
    if (_isProgrammaticScroll) return;
    checkScrollPosition();
    messagesContainer.classList.add('scrolling');
    if (_scrollClassTimeout) clearTimeout(_scrollClassTimeout);
    _scrollClassTimeout = setTimeout(() => {
      messagesContainer.classList.remove('scrolling');
    }, 500);
  }, { passive: true });

  // Setup MutationObserver to detect DOM changes
  const observer = new MutationObserver(() => {
    if (_moRafId) cancelAnimationFrame(_moRafId);
    _moRafId = requestAnimationFrame(() => {
      checkScrollPosition();
      _moRafId = null;
    });
  });
  observer.observe(messagesContainer, {
    childList: true,
    subtree: true
  });

  // Setup button click handler with smooth scroll
  scrollToBottomBtn.addEventListener('click', () => {
    _isProgrammaticScroll = true;
    messagesContainer.scrollTo({
      top: messagesContainer.scrollHeight,
      behavior: 'smooth'
    });
    requestAnimationFrame(() => { _isProgrammaticScroll = false; });
  });

  // Initial check
  checkScrollPosition();

  console.log('[PDF Chat Scroll] Scroll to bottom button setup complete');
}

/**
 * Scroll to bottom programmatically
 * @param {HTMLElement} messagesContainer - The messages container element
 */
export function scrollToBottom(messagesContainer) {
  if (!messagesContainer) return;
  _isProgrammaticScroll = true;
  requestAnimationFrame(() => {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    _isProgrammaticScroll = false;
  });
}


// scroll.js
// Scroll to bottom button management

let _isProgrammaticScroll = false;
let _scrollClassTimeout = null;
let _moRafId = null;

export function setupScrollToBottomButton() {
  const messagesContainer = document.getElementById('messagesContainer');
  const scrollToBottomBtn = document.getElementById('scrollToBottomBtn');
  if (!messagesContainer || !scrollToBottomBtn) {
    console.warn('[Panel] Scroll to bottom button setup failed:', {
      messagesContainer: !!messagesContainer,
      scrollToBottomBtn: !!scrollToBottomBtn
    });
    return;
  }
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
  messagesContainer.addEventListener('scroll', () => {
    if (_isProgrammaticScroll) return;
    checkScrollPosition();
    messagesContainer.classList.add('scrolling');
    if (_scrollClassTimeout) clearTimeout(_scrollClassTimeout);
    _scrollClassTimeout = setTimeout(() => {
      messagesContainer.classList.remove('scrolling');
    }, 500);
  }, { passive: true });
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
  scrollToBottomBtn.addEventListener('click', () => {
    _isProgrammaticScroll = true;
    messagesContainer.scrollTo({
      top: messagesContainer.scrollHeight,
      behavior: 'smooth'
    });
    requestAnimationFrame(() => { _isProgrammaticScroll = false; });
  });
  checkScrollPosition();
}


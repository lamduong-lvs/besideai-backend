// toast.js
// Toast notification utilities

export function showToast(message, type = 'info') {
  let toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 12px;
      pointer-events: none;
    `;
    document.body.appendChild(toastContainer);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  
  // Get color for border based on type
  const borderColor = type === 'error' ? 'var(--color-error)' : 
                      type === 'success' ? 'var(--color-success, #22c55e)' : 
                      'var(--color-primary)';
  
  toast.style.cssText = `
    position: relative;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-left: 3px solid ${borderColor};
    border-radius: 8px;
    padding: 12px 16px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    max-width: 400px;
    min-width: 250px;
    color: var(--text-primary);
    pointer-events: auto;
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.3s ease, transform 0.3s ease;
    font-size: 14px;
    line-height: 1.5;
    word-wrap: break-word;
  `;
  
  // Force reflow and then animate in
  toast.offsetHeight;
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });
  if (toastContainer.firstChild) {
    toastContainer.insertBefore(toast, toastContainer.firstChild);
  } else {
    toastContainer.appendChild(toast);
  }
  setTimeout(() => {
    // Animate out
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    setTimeout(() => {
      toast.remove();
      if (toastContainer.querySelectorAll('.toast').length === 0) {
        toastContainer.remove();
      }
    }, 300);
  }, 5000); // Show for 5 seconds instead of 3
}

export function showSuccess(message) { 
  console.log(`[SUCCESS] ${message}`);
  showToast(message, 'success');
}

export function showError(message) { 
  console.error(`[ERROR] ${message}`);
  showToast(message, 'error');
}

export function showInfo(message) { 
  console.info(`[INFO] ${message}`);
  showToast(message, 'info');
}


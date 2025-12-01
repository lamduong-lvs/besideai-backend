// setting/modules/core/toast.js - Toast notification system

let toastTimeout;

export function showToast(message, type = 'info') {
  const toast = document.getElementById('toastNotification');
  if (!toast) return;
  
  clearTimeout(toastTimeout);
  toast.textContent = message;
  // Apply correct class based on type
  toast.className = `toast show ${type}`; // Ensure 'show' class is added
  // CSS should handle the appearance based on .success, .error, .info
  toastTimeout = setTimeout(() => {
    toast.className = toast.className.replace(' show', '');
  }, 3000);
}


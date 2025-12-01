// Global Error Handler to debug blank screen issues
window.addEventListener('error', function(event) {
  const errorDisplay = document.createElement('div');
  errorDisplay.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#ffebee;color:#c62828;padding:20px;z-index:999999;font-family:monospace;white-space:pre-wrap;overflow:auto;max-height:100vh;border-bottom:2px solid #b71c1c;';
  
  let errorMsg = event.message || 'Unknown Error';
  if (event.filename) {
    errorMsg += `\nFile: ${event.filename}`;
  }
  if (event.lineno) {
    errorMsg += `\nLine: ${event.lineno}:${event.colno}`;
  }
  if (event.error && event.error.stack) {
    errorMsg += `\n\nStack:\n${event.error.stack}`;
  }
  
  errorDisplay.textContent = `CRITICAL ERROR:\n${errorMsg}`;
  document.body.appendChild(errorDisplay);
  console.error('Global Error Caught:', event);
});

window.addEventListener('unhandledrejection', function(event) {
  const errorDisplay = document.createElement('div');
  errorDisplay.style.cssText = 'position:fixed;top:50%;left:0;right:0;background:#fff3e0;color:#ef6c00;padding:20px;z-index:999999;font-family:monospace;white-space:pre-wrap;overflow:auto;border-top:2px solid #e65100;';
  
  let errorMsg = event.reason ? (event.reason.message || event.reason) : 'Unknown Promise Error';
  if (event.reason && event.reason.stack) {
    errorMsg += `\n\nStack:\n${event.reason.stack}`;
  }

  errorDisplay.textContent = `UNHANDLED PROMISE REJECTION:\n${errorMsg}`;
  document.body.appendChild(errorDisplay);
  console.error('Unhandled Rejection Caught:', event.reason);
});


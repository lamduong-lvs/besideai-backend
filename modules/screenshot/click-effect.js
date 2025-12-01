// screenshot/click-effect.js - FIXED VERSION

(function() {
    'use strict';
    
    if (window.__recorderClickEffectInjected) {
        return;
    }
    window.__recorderClickEffectInjected = true;
    
    window.__recorderClickEffectEnabled = true;
    
    // Không sử dụng âm thanh nếu file không tồn tại
    let clickSounds = null;
    
    function initSounds() {
        try {
            clickSounds = {
                left: new Audio(chrome.runtime.getURL('modules/screenshot/sounds/click-left.wav')),
                right: new Audio(chrome.runtime.getURL('modules/screenshot/sounds/click-right.wav'))
            };
            clickSounds.left.volume = 0.3;
            clickSounds.right.volume = 0.3;
        } catch (err) {
            console.warn('Sound files not found, disabling sound:', err);
            clickSounds = null;
        }
    }
    
    function playSound(type) {
        if (!clickSounds) return;
        
        try {
            const sound = clickSounds[type];
            sound.currentTime = 0;
            sound.play().catch(() => {
                // Silent fail - sounds are optional
            });
        } catch (err) {
            // Silent fail
        }
    }
    
    // Try to init sounds (optional feature)
    initSounds();
    
    function createClickEffect(x, y, type = 'left') {
        if (!window.__recorderClickEffectEnabled) {
            return;
        }
        
        const effect = document.createElement('div');
        effect.className = `recorder-click-effect ${type}`;
        
        // ✅ CRITICAL: Set inline styles with !important via cssText
        // This ensures position is not reset by CSS
        effect.style.cssText = `
            left: ${x}px !important;
            top: ${y}px !important;
        `;
        
        document.body.appendChild(effect);
        
        playSound(type);
        
        setTimeout(() => {
            if (effect.parentNode) {
                effect.parentNode.removeChild(effect);
            }
        }, 600);
    }
    
    function handleMouseDown(e) {
        const type = e.button === 0 ? 'left' : (e.button === 2 ? 'right' : null);
        if (type) {
            createClickEffect(e.clientX, e.clientY, type);
        }
    }
    
    document.addEventListener('mousedown', handleMouseDown, true);
    
    document.addEventListener('touchstart', (e) => {
        if (window.__recorderClickEffectEnabled && e.touches.length > 0) {
            const touch = e.touches[0];
            createClickEffect(touch.clientX, touch.clientY, 'left');
        }
    }, true);
    
    function cleanup() {
        document.removeEventListener('mousedown', handleMouseDown, true);
        
        document.querySelectorAll('.recorder-click-effect').forEach(el => {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        });
        
        window.__recorderClickEffectInjected = false;
        window.__recorderClickEffectEnabled = false;
    }
    
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'cleanupRecorder') {
            cleanup();
            sendResponse({ success: true });
        }
        return true;
    });
    
})();
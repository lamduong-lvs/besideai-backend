// js/screenshot-area.js

(function() {
    console.log('[Screenshot Area] Script loaded');
    
    // Ngăn script chạy lại nếu đã tồn tại
    if (document.getElementById('ai-screenshot-overlay')) {
        console.log('[Screenshot Area] Already exists, skipping');
        return;
    }

    // ========================================
    // THÔNG BÁO CHO PANEL ẨN ĐI
    // ========================================
    const panelIframe = document.querySelector('.ai-side-panel-iframe');
    if (panelIframe && panelIframe.contentWindow) {
        panelIframe.contentWindow.postMessage({
            action: 'screenshotStarted'
        }, '*');
        console.log('[Screenshot Area] Sent screenshotStarted to panel');
    }

    // ========================================
    // TẠO UI
    // ========================================
    const overlay = document.createElement('div');
    overlay.id = 'ai-screenshot-overlay';
    document.body.appendChild(overlay);

    const selectionBox = document.createElement('div');
    selectionBox.id = 'ai-screenshot-selection';
    document.body.appendChild(selectionBox);

    let startX = 0, startY = 0;
    let isSelecting = false;

    // ========================================
    // HELPER FUNCTIONS
    // ========================================
    
    function notifyPanelCompleted() {
        const iframe = document.querySelector('.ai-side-panel-iframe');
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({
                action: 'screenshotCompleted'
            }, '*');
            console.log('[Screenshot Area] Sent screenshotCompleted');
        }
    }
    
    function notifyPanelCancelled() {
        const iframe = document.querySelector('.ai-side-panel-iframe');
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({
                action: 'screenshotCancelled'
            }, '*');
            console.log('[Screenshot Area] Sent screenshotCancelled');
        }
    }

    // ========================================
    // CLEANUP
    // ========================================
    const cleanup = () => {
        overlay.remove();
        selectionBox.remove();
        window.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('keydown', onKeyDown);
        console.log('[Screenshot Area] Cleaned up');
    };

    // ========================================
    // MOUSE HANDLERS
    // ========================================
    const onMouseDown = (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        isSelecting = true;
        startX = e.clientX;
        startY = e.clientY;
        selectionBox.style.left = `${startX}px`;
        selectionBox.style.top = `${startY}px`;
        selectionBox.style.width = '0px';
        selectionBox.style.height = '0px';
        selectionBox.style.display = 'block';
    };

    const onMouseMove = (e) => {
        if (!isSelecting) return;
        e.preventDefault();
        const currentX = e.clientX;
        const currentY = e.clientY;

        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);
        const left = Math.min(startX, currentX);
        const top = Math.min(startY, currentY);

        selectionBox.style.width = `${width}px`;
        selectionBox.style.height = `${height}px`;
        selectionBox.style.left = `${left}px`;
        selectionBox.style.top = `${top}px`;
    };

    const onMouseUp = (e) => {
        if (!isSelecting) return;
        e.preventDefault();
        isSelecting = false;
        
        const rect = selectionBox.getBoundingClientRect();

        // Dọn dẹp giao diện ngay lập tức
        cleanup(); 

        // Kiểm tra vùng chọn có đủ lớn không
        if (rect.width < 10 || rect.height < 10) {
            console.log('[Screenshot Area] Area too small, cancelled');
            notifyPanelCancelled(); // ← THÔNG BÁO HỦY
            return;
        }

        // Gửi thông điệp sau một khoảng trễ nhỏ
        setTimeout(() => {
            // Kiểm tra xem có flag forChat không (từ window hoặc global)
            const forChat = window.screenshotForChat || false;
            
            chrome.runtime.sendMessage({
                action: 'screenshotAreaSelected',
                data: {
                    x: rect.left,
                    y: rect.top,
                    width: rect.width,
                    height: rect.height,
                    devicePixelRatio: window.devicePixelRatio,
                    forChat: forChat
                }
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('[Screenshot Area] Error:', chrome.runtime.lastError);
                    notifyPanelCancelled(); // ← THÔNG BÁO LỖI
                } else if (response && response.success) {
                    console.log('[Screenshot Area] Success');
                    notifyPanelCompleted(); // ← THÔNG BÁO THÀNH CÔNG
                } else {
                    console.error('[Screenshot Area] Failed');
                    notifyPanelCancelled(); // ← THÔNG BÁO LỖI
                }
            });
        }, 50);
    };
    
    // ========================================
    // KEYBOARD HANDLER
    // ========================================
    const onKeyDown = (e) => {
        if (e.key === 'Escape') {
            console.log('[Screenshot Area] Cancelled by ESC');
            cleanup();
            notifyPanelCancelled(); // ← THÔNG BÁO HỦY
        }
    };

    // ========================================
    // GẮN EVENT LISTENERS
    // ========================================
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('keydown', onKeyDown);
    
    console.log('[Screenshot Area] Event listeners attached');
})();
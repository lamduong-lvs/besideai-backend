// screenshot/camera-overlay.js - FIXED VERSION (Drag Issue Resolved)

(function() {
    'use strict';
    
    if (window.__recorderCameraOverlayInjected) {
        return;
    }
    window.__recorderCameraOverlayInjected = true;
    
    let cameraOverlay = null;
    let videoElement = null;
    let cameraStream = null;
    let shape = 'circle';
    let isDragging = false;
    let isResizing = false;
    let isVisible = true;
	let isUpdatingFromBroadcast = false; // ✅ THÊM: Flag để tránh vòng lặp
    let dragOffset = { x: 0, y: 0 };
    let resizeStart = { 
        width: 0, 
        height: 0, 
        x: 0, 
        y: 0, 
        left: 0,
        top: 0,
        direction: '' 
    };
    
    // (Đã thêm) Helper i18n
    function getLang(key) {
        if (window.Lang && typeof window.Lang.get === 'function') {
            return window.Lang.get(key);
        }
        // Fallback nếu Lang chưa tải (mặc dù nên có)
        const fallbacks = {
            "cameraChangeShapeTitle": "Đổi hình dạng",
            "cameraHideTitle": "Ẩn"
        };
        return fallbacks[key] || `[${key}]`;
    }

    // (Đã cập nhật) Đợi i18n sẵn sàng trước khi tạo HTML
    async function createCameraOverlay() {
        // ✅ Đợi window.Lang sẵn sàng
        if (window.Lang && window.Lang.initializationPromise) {
            await window.Lang.initializationPromise;
        } else if (!window.Lang) {
            // Nếu window.Lang chưa tồn tại, đợi một chút
            let retries = 0;
            while (!window.Lang && retries < 10) {
                await new Promise(resolve => setTimeout(resolve, 100));
                retries++;
            }
        }
        
        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                },
                audio: false
            });
            
            cameraOverlay = document.createElement('div');
            cameraOverlay.id = 'recorderCameraOverlay';
            cameraOverlay.className = `${shape} size-medium`;
            
            videoElement = document.createElement('video');
            videoElement.srcObject = cameraStream;
            videoElement.autoplay = true;
            videoElement.muted = true;
            videoElement.playsInline = true;
            
            
            
            const controls = document.createElement('div');
            controls.className = 'camera-controls';
            // (Đã cập nhật) Sử dụng getLang() cho title
            controls.innerHTML = `
                <button class="camera-control-btn" data-action="changeShape" title="${getLang('cameraChangeShapeTitle')}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                    </svg>
                </button>
                <button class="camera-control-btn close" data-action="close" title="${getLang('cameraHideTitle')}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            `;
            
            const resizeHandles = createResizeHandles();
            
            // ✅ CRITICAL: Thứ tự append QUAN TRỌNG - Drag handle phải SAU video
            cameraOverlay.appendChild(videoElement);      // 1. Video (nền)
            
            cameraOverlay.appendChild(controls);          // 3. Controls (trên cùng khi hover)
            resizeHandles.forEach(handle => cameraOverlay.appendChild(handle)); // 4. Resize handles
            
            document.body.appendChild(cameraOverlay);
            
            // ✅ PROTECTION: Force SVG attributes after insertion
            protectSVGIcons();
            
            initEventListeners();
            
            console.log('[Camera] Overlay created successfully');
            
        } catch (error) {
            console.error('[Camera] Failed to create overlay:', error);
        }
    }
    
    // ✅ Protect SVG icons from website CSS
    function protectSVGIcons() {
        if (!cameraOverlay) return;
        
        cameraOverlay.querySelectorAll('svg').forEach(svg => {
            svg.style.cssText = 'fill: none !important; stroke: currentColor !important; stroke-width: 2 !important;';
            svg.setAttribute('data-protected', 'true');
        });
    }
    
    function createResizeHandles() {
        const directions = ['nw', 'ne', 'sw', 'se'];
        const handles = [];
        
        directions.forEach(dir => {
            const handle = document.createElement('div');
            handle.className = `camera-resize-handle camera-resize-${dir}`;
            handle.dataset.direction = dir;
            handle.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="2" fill="currentColor"/>
                </svg>
            `;
            handles.push(handle);
        });
        
        return handles;
    }
    
    function initEventListeners() {
        
        
        // Dạy cho chính camera cách lắng nghe sự kiện nhấn chuột
		cameraOverlay.addEventListener('mousedown', startDrag);
        
        // Control buttons
        cameraOverlay.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', handleAction);
        });
        
        // Resize handles
        cameraOverlay.querySelectorAll('.camera-resize-handle').forEach(handle => {
            handle.addEventListener('mousedown', startResize);
        });
        
        console.log('[Camera] Event listeners initialized');
    }
    
    function handleAction(e) {
        e.stopPropagation();
        e.preventDefault();
        const action = e.currentTarget.dataset.action;
        
        switch (action) {
            case 'changeShape':
                toggleShape();
                break;
            case 'close':
                hideCamera();
                break;
        }
    }
    
    // (Đã cập nhật)
    function toggleShape() {
        shape = shape === 'circle' ? 'square' : 'circle';
        cameraOverlay.classList.remove('circle', 'square');
        cameraOverlay.classList.add(shape);
        
        const btn = cameraOverlay.querySelector('[data-action="changeShape"]');
        if (shape === 'circle') {
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                </svg>
            `;
        } else {
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                </svg>
            `;
        }
        
        // (Đã thêm) Cập nhật title khi đổi hình dạng (mặc dù hiện tại title không đổi)
        btn.title = getLang('cameraChangeShapeTitle');
        
        protectSVGIcons();
    }
    
    function hideCamera() {
        if (!cameraOverlay) return;
        
        isVisible = false;
        cameraOverlay.classList.add('hidden');
        
        // ✅ CHỈ notify khi user click Close button
        // KHÔNG notify khi nhận broadcast từ background
        if (!isUpdatingFromBroadcast) {
            notifyControlBar('cameraHidden');
        }
        
        console.log('[Camera] Hidden');
    }
    
    function showCamera() {
        if (!cameraOverlay) return;
        
        isVisible = true;
        cameraOverlay.classList.remove('hidden');
        
        // ✅ CHỈ notify khi user thao tác thủ công
        // KHÔNG notify khi nhận broadcast
        if (!isUpdatingFromBroadcast) {
            notifyControlBar('cameraShown');
        }
        
        console.log('[Camera] Shown');
    }
    
    function toggleCamera() {
        if (isVisible) {
            hideCamera();
        } else {
            showCamera();
        }
    }
    
    function notifyControlBar(event) {
        try {
            // ✅ SỬA: Chỉ gửi khi user click Close button
            chrome.runtime.sendMessage({
                action: 'recorderControl',
                controlAction: 'cameraClosed',  // ✅ Đổi tên để rõ ràng
                data: {
                    event: event
                }
            }).catch(() => {});
        } catch (err) {
            console.warn('[Camera] Could not notify control bar:', err);
        }
    }
    
    function startDrag(e) {
        // ✅ Check if clicking on controls or resize handles
        if (e.target.closest('.camera-control-btn') || e.target.closest('.camera-resize-handle')) {
    return;
}
        
        console.log('[Camera] Starting drag...');
        
        isDragging = true;
        cameraOverlay.classList.add('dragging');
        
        const rect = cameraOverlay.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;
        
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDrag);
        
        e.preventDefault();
        e.stopPropagation();
    }
    
    function drag(e) {
        if (!isDragging) return;
        
        const x = e.clientX - dragOffset.x;
        const y = e.clientY - dragOffset.y;
        
        const maxX = window.innerWidth - cameraOverlay.offsetWidth;
        const maxY = window.innerHeight - cameraOverlay.offsetHeight;
        
        const constrainedX = Math.max(0, Math.min(x, maxX));
        const constrainedY = Math.max(0, Math.min(y, maxY));
        
        cameraOverlay.style.setProperty('left', `${constrainedX}px`, 'important');
        cameraOverlay.style.setProperty('top', `${constrainedY}px`, 'important');
        cameraOverlay.style.setProperty('right', 'auto', 'important');
        cameraOverlay.style.setProperty('bottom', 'auto', 'important');
    }
    
    function stopDrag() {
        if (isDragging) {
            console.log('[Camera] Drag stopped');
        }
        
        isDragging = false;
        cameraOverlay.classList.remove('dragging');
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', stopDrag);
    }
    
    function startResize(e) {
        e.stopPropagation();
        e.preventDefault();
        
        console.log('[Camera] Starting resize...');
        
        isResizing = true;
        cameraOverlay.classList.add('resizing');
        
        const rect = cameraOverlay.getBoundingClientRect();
        const direction = e.currentTarget.dataset.direction;
        
        resizeStart = {
            width: rect.width,
            height: rect.height,
            x: e.clientX,
            y: e.clientY,
            left: rect.left,
            top: rect.top,
            direction: direction
        };
        
        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', stopResize);
    }
    
    function resize(e) {
        if (!isResizing) return;
        
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        const direction = resizeStart.direction;
        
        let newWidth = resizeStart.width;
        let newHeight = resizeStart.height;
        let newLeft = resizeStart.left;
        let newTop = resizeStart.top;
        
        if (direction.includes('e')) {
            newWidth = resizeStart.width + deltaX;
        } else if (direction.includes('w')) {
            newWidth = resizeStart.width - deltaX;
            newLeft = resizeStart.left + deltaX;
        }
        
        if (direction.includes('s')) {
            newHeight = resizeStart.height + deltaY;
        } else if (direction.includes('n')) {
            newHeight = resizeStart.height - deltaY;
            newTop = resizeStart.top + deltaY;
        }
        
        const minSize = 80;
        const maxSize = Math.min(window.innerWidth * 0.5, window.innerHeight * 0.5);
        
        newWidth = Math.max(minSize, Math.min(maxSize, newWidth));
        newHeight = Math.max(minSize, Math.min(maxSize, newHeight));
        
        if (shape === 'circle') {
            const size = Math.max(newWidth, newHeight);
            newWidth = size;
            newHeight = size;
            
            if (direction.includes('w')) {
                newLeft = resizeStart.left + (resizeStart.width - newWidth);
            }
            if (direction.includes('n')) {
                newTop = resizeStart.top + (resizeStart.height - newHeight);
            }
        }
        
        cameraOverlay.style.setProperty('width', `${newWidth}px`, 'important');
        cameraOverlay.style.setProperty('height', `${newHeight}px`, 'important');
        
        if (direction.includes('w')) {
            cameraOverlay.style.setProperty('left', `${newLeft}px`, 'important');
            cameraOverlay.style.setProperty('right', 'auto', 'important');
        }
        if (direction.includes('n')) {
            cameraOverlay.style.setProperty('top', `${newTop}px`, 'important');
            cameraOverlay.style.setProperty('bottom', 'auto', 'important');
        }
        
        cameraOverlay.classList.remove('size-small', 'size-medium', 'size-large');
    }
    
    function stopResize() {
        console.log('[Camera] Resize stopped');
        
        isResizing = false;
        cameraOverlay.classList.remove('resizing');
        document.removeEventListener('mousemove', resize);
        document.removeEventListener('mouseup', stopResize);
        
        snapToViewport();
    }
    
    function snapToViewport() {
        const rect = cameraOverlay.getBoundingClientRect();
        
        let newLeft = rect.left;
        let newTop = rect.top;
        let needsAdjustment = false;
        
        if (rect.left < 0) {
            newLeft = 0;
            needsAdjustment = true;
        }
        if (rect.top < 0) {
            newTop = 0;
            needsAdjustment = true;
        }
        if (rect.right > window.innerWidth) {
            newLeft = window.innerWidth - rect.width;
            needsAdjustment = true;
        }
        if (rect.bottom > window.innerHeight) {
            newTop = window.innerHeight - rect.height;
            needsAdjustment = true;
        }
        
        if (needsAdjustment) {
            cameraOverlay.style.setProperty('transition', 'left 0.3s ease, top 0.3s ease', 'important');
            cameraOverlay.style.setProperty('left', `${newLeft}px`, 'important');
            cameraOverlay.style.setProperty('top', `${newTop}px`, 'important');
            
            setTimeout(() => {
                cameraOverlay.style.removeProperty('transition');
            }, 300);
        }
    }
    
    function cleanup() {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
        }
        if (cameraOverlay && cameraOverlay.parentNode) {
            cameraOverlay.parentNode.removeChild(cameraOverlay);
        }
        window.__recorderCameraOverlayInjected = false;
        
        console.log('[Camera] Cleaned up');
    }
    
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        try {
            if (request.action === 'initCamera') {
                shape = request.cameraShape || 'circle';
                if (cameraOverlay) {
                    cameraOverlay.className = `${shape} size-medium`;
                }
                sendResponse({ success: true });
            } 
            // ✅ SỬA: Xử lý message từ background broadcast
            else if (request.action === 'updateCameraState') {
                // ✅ Set flag để không gọi notifyControlBar()
                isUpdatingFromBroadcast = true;
                
                if (request.enabled) {
                    showCamera();
                } else {
                    hideCamera();
                }
                
                // ✅ Reset flag sau khi xong
                setTimeout(() => {
                    isUpdatingFromBroadcast = false;
                }, 100);
                
                sendResponse({ success: true, isVisible: isVisible });
            } 
            else if (request.action === 'cleanupRecorder') {
                cleanup();
                sendResponse({ success: true });
            }
        } catch (err) {
            sendResponse({ success: false, error: err.message });
        }
        return true;
    });
    
    // ✅ Gọi createCameraOverlay() async
    (async () => {
        await createCameraOverlay();
        
        // ✅ Lắng nghe thay đổi ngôn ngữ
        chrome.storage.onChanged.addListener(async (changes, namespace) => {
            if (namespace === 'sync' && changes.userLang && window.Lang && cameraOverlay) {
                const newLangCode = changes.userLang.newValue;
                const currentLang = window.Lang.getCurrentLanguage();
                
                if (newLangCode && newLangCode !== currentLang) {
                    try {
                        // Tải file ngôn ngữ mới
                        const langUrl = chrome.runtime.getURL(`lang/${newLangCode}.json`);
                        const response = await fetch(langUrl);
                        if (!response.ok) throw new Error(`Không thể tải ${newLangCode}.json`);
                        const newStrings = await response.json();
                        
                        // Cập nhật Lang service
                        window.Lang.currentLang = newLangCode;
                        window.Lang.strings = newStrings;
                        document.documentElement.lang = newLangCode;
                        
                        // Cập nhật lại các title trong camera overlay
                        const changeShapeBtn = cameraOverlay.querySelector('[data-action="changeShape"]');
                        const closeBtn = cameraOverlay.querySelector('[data-action="close"]');
                        
                        if (changeShapeBtn) changeShapeBtn.title = getLang('cameraChangeShapeTitle');
                        if (closeBtn) closeBtn.title = getLang('cameraHideTitle');
                        
                        console.log(`[CameraOverlay] Ngôn ngữ đã được cập nhật sang ${newLangCode}`);
                    } catch (error) {
                        console.error('[CameraOverlay] Lỗi khi cập nhật ngôn ngữ:', error);
                    }
                }
            }
        });
    })();
    
})();
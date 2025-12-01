// screenshot/control-bar.js - FIXED: Better state sync and mic handling

(function() {
    'use strict';
    
    if (window.__recorderControlBarInjected) {
        return;
    }
    window.__recorderControlBarInjected = true;
    
    let controlBar = null;
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    let isMinimized = false;
    let timerInterval = null;
    let startTime = Date.now();
    let isPaused = false;
    let pausedTime = 0;
    let settings = null;
    let isDrawing = false;
    let canvas = null;
    let ctx = null;
    let drawHistory = [];
    let historyStep = -1;
    let isMicEnabled = false;
    let micPermissionGranted = false;
	let drawTool = 'pen'; // Công cụ mặc định là 'pen'
	let drawColor = '#ff4747'; // Màu mặc định

    // (Đã thêm) Helper i18n
    function getLang(key) {
        if (window.Lang && typeof window.Lang.get === 'function') {
            return window.Lang.get(key);
        }
        // Fallback nếu Lang chưa tải
        const fallbacks = {
            "controlBarPause": "Tạm dừng",
            "controlBarResume": "Tiếp tục",
            "controlBarStop": "Dừng",
            "controlBarStopConfirm": "Bạn có chắc muốn dừng ghi hình?",
            "controlBarCamera": "Camera",
            "controlBarMic": "Micro",
            "controlBarMicUnavailable": "Microphone không khả dụng",
            "controlBarClickEffect": "Hiệu ứng click",
            "controlBarAnnotation": "Vẽ chú thích",
            "controlBarToolPen": "Bút vẽ",
            "controlBarToolRect": "Hình chữ nhật",
            "controlBarToolArrow": "Mũi tên",
            "controlBarUndo": "Hoàn tác",
            "controlBarRedo": "Làm lại",
            "controlBarMinimize": "Thu nhỏ",
            "controlBarMaximize": "Mở rộng"
        };
        return fallbacks[key] || `[${key}]`;
    }

    // (Đã cập nhật i18n)
    function createControlBar() {
        controlBar = document.createElement('div');
        controlBar.id = 'recorderControlBar';
        controlBar.innerHTML = `
            <div class="control-drag-handle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="5 9 2 12 5 15"/>
                    <polyline points="9 5 12 2 15 5"/>
                    <polyline points="15 19 12 22 9 19"/>
                    <polyline points="19 9 22 12 19 15"/>
                    <line x1="2" y1="12" x2="22" y2="12"/>
                    <line x1="12" y1="2" x2="12" y2="22"/>
                </svg>
            </div>
            
            <div class="control-rec-indicator">
                <div class="control-rec-dot"></div>
            </div>
            
            <div class="control-timer">00:00</div>
            
            <div class="control-divider hide-when-minimized"></div>
            
            <button class="control-btn control-btn-pause" title="${getLang('controlBarPause')}" data-action="pause">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16"/>
                    <rect x="14" y="4" width="4" height="16"/>
                </svg>
            </button>
            
            <button class="control-btn control-btn-stop" title="${getLang('controlBarStop')}" data-action="stop">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12"/>
                </svg>
            </button>
            
            <div class="control-divider hide-when-minimized"></div>
            
            <button class="control-btn hide-when-minimized" id="controlCameraBtn" title="${getLang('controlBarCamera')}" data-action="camera">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                </svg>
            </button>
            
            <button class="control-btn hide-when-minimized" id="controlMicBtn" title="${getLang('controlBarMic')}" data-action="mic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
            </button>
            
            <button class="control-btn hide-when-minimized" id="controlClickBtn" title="${getLang('controlBarClickEffect')}" data-action="click">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
                </svg>
            </button>
            
            <button class="control-btn hide-when-minimized" id="controlAnnotationBtn" title="${getLang('controlBarAnnotation')}" data-action="annotation">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
            </button>

            <div id="annotationSubMenu" class="annotation-sub-menu hidden">
                <button class="control-btn active" data-action="set-draw-tool" data-tool="pen" title="${getLang('controlBarToolPen')}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                    </svg>
                </button>
                <button class="control-btn" data-action="set-draw-tool" data-tool="rect" title="${getLang('controlBarToolRect')}">
                     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    </svg>
                </button>
                <button class="control-btn" data-action="set-draw-tool" data-tool="arrow" title="${getLang('controlBarToolArrow')}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="5" y1="12" x2="19" y2="12"/>
                        <polyline points="12 5 19 12 12 19"/>
                    </svg>
                </button>
                <div class="control-divider"></div>
                <button class="control-color-picker active" data-action="set-draw-color" data-color="#ff4747" style="background-color: #ff4747; --active-color: #ff4747;"></button>
                <button class="control-color-picker" data-action="set-draw-color" data-color="#3b82f6" style="background-color: #3b82f6;"></button>
                <button class="control-color-picker" data-action="set-draw-color" data-color="#28a745" style="background-color: #28a745;"></button>
            </div>
            
            <button class="control-btn control-annotation-tool" id="controlUndoBtn" title="${getLang('controlBarUndo')}" data-action="undo" style="display: none;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 7v6h6"/>
                    <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/>
                </svg>
            </button>
            
            <button class="control-btn control-annotation-tool" id="controlRedoBtn" title="${getLang('controlBarRedo')}" data-action="redo" style="display: none;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 7v6h-6"/>
                    <path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7"/>
                </svg>
            </button>
            
            <div class="control-divider"></div>
            
            <button class="control-btn control-btn-minimize" title="${getLang('controlBarMinimize')}" data-action="minimize">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="4 14 10 14 10 20"/>
                    <polyline points="20 10 14 10 14 4"/>
                    <line x1="14" y1="10" x2="21" y2="3"/>
                    <line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
            </button>
        `;
        
        document.body.appendChild(controlBar);
        
        protectSVGIcons();
        initEventListeners();
        startTimer();
        ensureAnnotationToolsHidden();
        console.log('[ControlBar] Registering with recorder tab...');
        notifyRecorderTab('register');
    }
    
    // ... (Các hàm từ protectSVGIcons đến stopDrag giữ nguyên) ...
     function protectSVGIcons() {
        controlBar.querySelectorAll('svg').forEach(svg => {
            const shouldFill = svg.getAttribute('fill') === 'currentColor';
            
            if (shouldFill) {
                svg.style.cssText = 'fill: currentColor !important; stroke: none !important;';
            } else {
                svg.style.cssText = 'fill: none !important; stroke: currentColor !important; stroke-width: 2 !important;';
            }
            
            svg.setAttribute('data-protected', 'true');
        });
    }
    
    function initEventListeners() {
        const dragHandle = controlBar.querySelector('.control-drag-handle');
        dragHandle.addEventListener('mousedown', startDrag);
        
        controlBar.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                handleAction(e);
            });
        });
    }
    
    function startDrag(e) {
        isDragging = true;
        controlBar.classList.add('dragging');
        
        const rect = controlBar.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;
        
        controlBar.style.cssText = `
            transform: none !important;
            left: ${rect.left}px !important;
            top: ${rect.top}px !important;
        `;
        
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDrag);
        
        e.preventDefault();
    }
    
    let rafId = null;
    function drag(e) {
        if (!isDragging) return;
        
        if (rafId) {
            cancelAnimationFrame(rafId);
        }
        
        rafId = requestAnimationFrame(() => {
            const x = e.clientX - dragOffset.x;
            const y = e.clientY - dragOffset.y;
            
            const maxX = window.innerWidth - controlBar.offsetWidth;
            const maxY = window.innerHeight - controlBar.offsetHeight;
            
            const constrainedX = Math.max(0, Math.min(x, maxX));
            const constrainedY = Math.max(0, Math.min(y, maxY));
            
            controlBar.style.cssText = `
                transform: none !important;
                left: ${constrainedX}px !important;
                top: ${constrainedY}px !important;
            `;
        });
    }
    
    function stopDrag() {
        isDragging = false;
        controlBar.classList.remove('dragging');
        
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
        
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', stopDrag);
    }
    
    function handleAction(e) {
        const action = e.currentTarget.dataset.action;
        console.log('[ControlBar] Action clicked:', action);
        
        switch (action) {
            case 'pause':
                togglePause();
                break;
            case 'stop':
                stopRecording();
                break;
            case 'camera':
                toggleCamera();
                break;
            case 'mic':
                toggleMic();
                break;
            case 'click':
                toggleClickEffect();
                break;
            case 'annotation':
                toggleAnnotation();
                break;
            case 'set-draw-tool':
                setDrawTool(e.currentTarget.dataset.tool);
                break;
            case 'set-draw-color':
                setDrawColor(e.currentTarget.dataset.color, e.currentTarget);
                break;
            case 'undo':
                undoAnnotation();
                break;
            case 'redo':
                redoAnnotation();
                break;
            case 'minimize':
                toggleMinimize();
                break;
        }
    }
    
    // ... (togglePause, updatePauseUI) ...
    // (Đã cập nhật i18n)
	function togglePause() {
        isPaused = !isPaused;
        updatePauseUI(isPaused);
        notifyRecorderTab('pause', { isPaused });
    }
    
    // (Đã cập nhật i18n)
    function updatePauseUI(paused) {
        const pauseBtn = controlBar.querySelector('.control-btn-pause');
        const dot = controlBar.querySelector('.control-rec-dot');
        
        if (paused) {
            pausedTime = Date.now();
            pauseBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
            `;
            pauseBtn.title = getLang('controlBarResume');
            dot.classList.add('paused');
        } else {
            if (pausedTime > 0) {
                startTime += (Date.now() - pausedTime);
                pausedTime = 0;
            }
            pauseBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16"/>
                    <rect x="14" y="4" width="4" height="16"/>
                </svg>
            `;
            pauseBtn.title = getLang('controlBarPause');
            dot.classList.remove('paused');
        }
        
        protectSVGIcons();
    }
    
    // (Đã cập nhật i18n)
    function stopRecording() {
        if (confirm(getLang('controlBarStopConfirm'))) {
            notifyRecorderTab('stop');
        }
    }
    
    function toggleCamera() {
        const btn = document.getElementById('controlCameraBtn');
        const willBeActive = !btn.classList.contains('active');
        
        notifyRecorderTab('toggleCamera', { enabled: willBeActive });
        
        if (willBeActive) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    }
    
    function toggleMic() {
        const btn = document.getElementById('controlMicBtn');
        
        // Check if mic permission is granted
        if (!micPermissionGranted) {
            console.debug('[ControlBar] Mic permission not granted, requesting sync...');
            
            // Request sync from recorder
            notifyRecorderTab('syncMicState', {});
            
            // Flash button to indicate action
            btn.classList.add('error-flash');
            setTimeout(() => btn.classList.remove('error-flash'), 300);
            
            return;
        }
        
        // Toggle mic state
        isMicEnabled = !isMicEnabled;
        
        console.log('[ControlBar] Toggling mic:', isMicEnabled);
        
        if (isMicEnabled) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
            btn.classList.remove('mic-active');
        }
        
        // Notify recorder tab
        notifyRecorderTab('toggleMic', { enabled: isMicEnabled });
    }
    
    function toggleClickEffect() {
        const btn = document.getElementById('controlClickBtn');
        const isActive = btn.classList.toggle('active');
        window.__recorderClickEffectEnabled = isActive;
    }
    
    function toggleAnnotation() {
        const btn = document.getElementById('controlAnnotationBtn');
        const subMenu = document.getElementById('annotationSubMenu');
        isDrawing = !isDrawing;
        
        if (isDrawing) {
            const btnRect = btn.getBoundingClientRect();
            const barRect = controlBar.getBoundingClientRect();
            subMenu.style.left = `${btnRect.left - barRect.left + (btnRect.width / 2) - (subMenu.offsetWidth / 2)}px`;

            btn.classList.add('active');
            subMenu.classList.remove('hidden');
            createAnnotationCanvas();
            showAnnotationTools();
        } else {
            btn.classList.remove('active');
            subMenu.classList.add('hidden');
            removeAnnotationCanvas();
            hideAnnotationTools();
        }
    }
    
    // ... (Các hàm từ showAnnotationTools đến restoreState giữ nguyên) ...
	function showAnnotationTools() {
        const undoBtn = document.getElementById('controlUndoBtn');
        const redoBtn = document.getElementById('controlRedoBtn');
        
        undoBtn.classList.add('annotation-tool-visible');
        redoBtn.classList.add('annotation-tool-visible');
        
        protectSVGIcons();
    }
    
    function hideAnnotationTools() {
        const undoBtn = document.getElementById('controlUndoBtn');
        const redoBtn = document.getElementById('controlRedoBtn');
        
        undoBtn.classList.remove('annotation-tool-visible');
        redoBtn.classList.remove('annotation-tool-visible');
    }
    
    function ensureAnnotationToolsHidden() {
        const undoBtn = document.getElementById('controlUndoBtn');
        const redoBtn = document.getElementById('controlRedoBtn');
        
        if (undoBtn) {
            undoBtn.classList.remove('annotation-tool-visible');
            undoBtn.style.display = '';
        }
        
        if (redoBtn) {
            redoBtn.classList.remove('annotation-tool-visible');
            redoBtn.style.display = '';
        }
    }
    
    // ✅ BƯỚC 2: THAY THẾ TOÀN BỘ HÀM NÀY
function createAnnotationCanvas() {
    canvas = document.createElement('canvas');
    canvas.id = 'recorderAnnotationCanvas';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    drawHistory = [];
    historyStep = -1;
    saveState();
    
    let drawing = false;
    let startX = 0;
    let startY = 0;
    let snapshot = null; // Biến để lưu trạng thái canvas cho việc vẽ preview

    const startDrawing = (e) => {
        drawing = true;
        startX = e.clientX;
        startY = e.clientY;
        
        // Lưu lại ảnh canvas hiện tại trước khi bắt đầu vẽ hình mới
        // Điều này rất quan trọng để vẽ preview hình chữ nhật và mũi tên
        snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Bắt đầu một đường vẽ mới
        ctx.beginPath();

        if (drawTool === 'pen') {
            ctx.moveTo(startX, startY);
        }
    };

    const draw = (e) => {
        if (!drawing) return;

        // Phục hồi lại ảnh canvas gốc để vẽ preview lên trên
        // Thao tác này giúp hình vẽ cũ không bị ảnh hưởng khi ta di chuột
        if (snapshot) {
            ctx.putImageData(snapshot, 0, 0);
        }
        
        // Kiểm tra công cụ đang được chọn
        switch (drawTool) {
            case 'pen':
                ctx.lineTo(e.clientX, e.clientY);
                ctx.stroke();
                break;
            case 'rect':
                // Vẽ hình chữ nhật từ điểm bắt đầu đến vị trí chuột hiện tại
                ctx.strokeRect(startX, startY, e.clientX - startX, e.clientY - startY);
                break;
            case 'arrow':
                // Vẽ mũi tên từ điểm bắt đầu đến vị trí chuột hiện tại
                ctx.beginPath(); // Cần beginPath riêng cho mũi tên
                drawArrow(ctx, startX, startY, e.clientX, e.clientY);
                ctx.stroke();
                break;
        }
    };

    const stopDrawing = () => {
        if (!drawing) return;
        drawing = false;

        // Lưu trạng thái cuối cùng của canvas vào lịch sử (dùng cho undo/redo)
        // Đối với 'pen', chúng ta phải vẽ lại đường cuối cùng lên snapshot
        if (drawTool === 'pen') {
             ctx.putImageData(snapshot, 0, 0);
             ctx.stroke();
        }
        
        saveState();
        snapshot = null;
    };

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing); // Dừng vẽ nếu chuột ra khỏi màn hình
}
    
    function removeAnnotationCanvas() {
        if (canvas && canvas.parentNode) {
            canvas.parentNode.removeChild(canvas);
            canvas = null;
            ctx = null;
        }
    }
    
    function saveState() {
        historyStep++;
        if (historyStep < drawHistory.length) {
            drawHistory.length = historyStep;
        }
        drawHistory.push(canvas.toDataURL());
    }
    
    function undoAnnotation() {
        if (historyStep > 0) {
            historyStep--;
            restoreState();
        }
    }
    
    function redoAnnotation() {
        if (historyStep < drawHistory.length - 1) {
            historyStep++;
            restoreState();
        }
    }
    
    function restoreState() {
        const img = new Image();
        img.src = drawHistory[historyStep];
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
    }

    // (Đã cập nhật i18n)
    function toggleMinimize() {
        isMinimized = !isMinimized;
        const btn = controlBar.querySelector('.control-btn-minimize');
        
        if (isMinimized) {
            controlBar.classList.add('minimized');
            if (isDrawing) hideAnnotationTools();
            btn.innerHTML = `<svg viewBox="0 0 24 24"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`;
            btn.title = getLang('controlBarMaximize');
        } else {
            controlBar.classList.remove('minimized');
            if (isDrawing) showAnnotationTools();
            btn.innerHTML = `<svg viewBox="0 0 24 24"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`;
            btn.title = getLang('controlBarMinimize');
        }
        protectSVGIcons();
    }
    
    // ... (startTimer, loadInitialState) ...
	function startTimer() {
        timerInterval = setInterval(() => {
            if (!isPaused) {
                const elapsed = Date.now() - startTime;
                const minutes = Math.floor(elapsed / 60000);
                const seconds = Math.floor((elapsed % 60000) / 1000);
                const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                
                const timerEl = controlBar.querySelector('.control-timer');
                if (timerEl) {
                    timerEl.textContent = timeStr;
                }
            }
        }, 1000);
    }
    
    // (Đã cập nhật i18n)
    function loadInitialState() {
        if (!settings) return;
        
        const clickBtn = document.getElementById('controlClickBtn');
        if (clickBtn) {
            clickBtn.classList.add('active');
            window.__recorderClickEffectEnabled = true;
        }
        
        if (settings.cameraEnabled) {
            const cameraBtn = document.getElementById('controlCameraBtn');
            if (cameraBtn) cameraBtn.classList.add('active');
        }
        
        const micBtn = document.getElementById('controlMicBtn');
        if (settings.micEnabled) {
            micPermissionGranted = true;
            isMicEnabled = true;
            if (micBtn) {
                micBtn.classList.add('active');
                micBtn.style.opacity = '1';
                micBtn.title = getLang('controlBarMic');
            }
        } else {
            micPermissionGranted = false;
            isMicEnabled = false;
            if (micBtn) {
                micBtn.classList.remove('active');
                micBtn.style.opacity = '0.5';
                micBtn.title = getLang('controlBarMicUnavailable');
            }
        }
    }
    
    function notifyRecorderTab(action, data = {}) {
        try {
            chrome.runtime.sendMessage({ action: 'recorderControl', controlAction: action, data });
        } catch (err) {
            console.warn('[ControlBar] Error sending message:', err);
        }
    }
    
    function cleanup() {
        if (timerInterval) clearInterval(timerInterval);
        if (controlBar && controlBar.parentNode) {
            controlBar.parentNode.removeChild(controlBar);
        }
        removeAnnotationCanvas();
        window.__recorderControlBarInjected = false;
    }

    // ✅ ĐÃ SỬA: Chuyển các hàm vào bên trong IIFE
    function setDrawTool(tool) {
        drawTool = tool;
        console.log('[ControlBar] Draw tool set to:', tool);
        document.querySelectorAll('[data-action="set-draw-tool"]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });
    }
	
	// ✅ BƯỚC 1: THÊM HÀM MỚI ĐỂ VẼ MŨI TÊN
function drawArrow(context, fromx, fromy, tox, toy) {
    const headlen = 10; // Chiều dài của đầu mũi tên
    const dx = tox - fromx;
    const dy = toy - fromy;
    const angle = Math.atan2(dy, dx);
    context.moveTo(fromx, fromy);
    context.lineTo(tox, toy);
    context.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
    context.moveTo(tox, toy);
    context.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
}

    function setDrawColor(color, selectedElement) {
        drawColor = color;
        if (ctx) {
            ctx.strokeStyle = drawColor;
        }
        console.log('[ControlBar] Draw color set to:', color);
        
        document.querySelectorAll('.control-color-picker').forEach(picker => {
            picker.classList.remove('active');
            picker.style.removeProperty('--active-color');
        });
        selectedElement.classList.add('active');
        selectedElement.style.setProperty('--active-color', color);
    }

    // (Đã cập nhật i18n)
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'updateMicLevel') {
            const micBtn = document.getElementById('controlMicBtn');
            if (micBtn && isMicEnabled && micPermissionGranted) {
                micBtn.style.setProperty('--mic-level', request.level);
            } else if (micBtn) {
                micBtn.style.setProperty('--mic-level', 0);
            }
            return;
        }

        try {
            switch (request.action) {
                case 'initControlBar':
                    settings = request.settings;
                    loadInitialState();
                    sendResponse({ success: true });
                    break;
                case 'updatePauseState':
                    isPaused = request.isPaused;
                    updatePauseUI(isPaused);
                    sendResponse({ success: true });
                    break;
                case 'updateMicState':
                    micPermissionGranted = request.permissionGranted;
                    isMicEnabled = request.isEnabled;
                    const micBtn = document.getElementById('controlMicBtn');
                    if (micBtn) {
                        micBtn.style.opacity = micPermissionGranted ? '1' : '0.5';
                        micBtn.title = micPermissionGranted ? getLang('controlBarMic') : getLang('controlBarMicUnavailable');
                        micBtn.style.cursor = micPermissionGranted ? 'pointer' : 'not-allowed';
                        micBtn.classList.toggle('active', isMicEnabled && micPermissionGranted);
                    }
                    sendResponse({ success: true });
                    break;
                case 'updateCameraState':
                    const cameraBtn = document.getElementById('controlCameraBtn');
                    if (cameraBtn) cameraBtn.classList.toggle('active', request.enabled);
                    sendResponse({ success: true });
                    break;
                case 'cleanupRecorder':
                    cleanup();
                    sendResponse({ success: true });
                    break;
            }
        } catch (err) {
            console.error('[ControlBar] Error handling message:', err);
            sendResponse({ success: false, error: err.message });
        }

        return true;
    });
    
    async function initializeControlBar() {
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
        // Bây giờ mới an toàn để gọi hàm tạo UI
        createControlBar();
        
        // ✅ Lắng nghe thay đổi ngôn ngữ
        chrome.storage.onChanged.addListener(async (changes, namespace) => {
            if (namespace === 'sync' && changes.userLang && window.Lang && controlBar) {
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
                        
                        // Cập nhật lại các title và text trong control bar
                        const pauseBtn = controlBar.querySelector('.control-btn-pause');
                        const stopBtn = controlBar.querySelector('.control-btn-stop');
                        const cameraBtn = controlBar.querySelector('#controlCameraBtn');
                        const micBtn = controlBar.querySelector('#controlMicBtn');
                        const clickBtn = controlBar.querySelector('#controlClickBtn');
                        const annotationBtn = controlBar.querySelector('#controlAnnotationBtn');
                        const minimizeBtn = controlBar.querySelector('.control-btn-minimize');
                        
                        if (pauseBtn) pauseBtn.title = isPaused ? getLang('controlBarResume') : getLang('controlBarPause');
                        if (stopBtn) stopBtn.title = getLang('controlBarStop');
                        if (cameraBtn) cameraBtn.title = getLang('controlBarCamera');
                        if (micBtn) micBtn.title = micPermissionGranted ? getLang('controlBarMic') : getLang('controlBarMicUnavailable');
                        if (clickBtn) clickBtn.title = getLang('controlBarClickEffect');
                        if (annotationBtn) annotationBtn.title = getLang('controlBarAnnotation');
                        if (minimizeBtn) minimizeBtn.title = isMinimized ? getLang('controlBarMaximize') : getLang('controlBarMinimize');
                        
                        console.log(`[ControlBar] Ngôn ngữ đã được cập nhật sang ${newLangCode}`);
                    } catch (error) {
                        console.error('[ControlBar] Lỗi khi cập nhật ngôn ngữ:', error);
                    }
                }
            }
        });
    }

    initializeControlBar();

})(); // ✅ ĐÃ SỬA: Xóa dấu } thừa và đảm bảo các hàm nằm trong khối này
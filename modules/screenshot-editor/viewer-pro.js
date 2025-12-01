// viewer-pro.js - Professional Screenshot Editor

class ScreenshotEditorPro {
    constructor() {
        this.canvas = null;
        this.imageData = null;
        this.currentTool = 'select';
        this.currentColor = '#ff0000';
        this.lineWidth = 3;
        this.isDrawing = false;
        this.currentDrawMode = 'pencil';
        this.currentShapeType = 'rect';
        this.currentArrowStyle = 'solid';
        this.zoomLevel = 1;
        
        this.init();
    }
    
    async init() {
        console.log('[Editor Pro] Initializing...');

        // Đặt tiêu đề (nếu Lang đã tải)
        if (window.Lang) {
            document.title = Lang.get('editorProTitle');
        }
        
        // Get data from background
        const urlParams = new URLSearchParams(window.location.search);
        const dataId = urlParams.get('id');
        
        if (!dataId) {
            this.showError(Lang.get('editorErrorNoId'));
            return;
        }
        
        const data = await chrome.runtime.sendMessage({
            action: 'getScreenshotData',
            id: dataId
        });
        
        if (!data || !data.dataUrl) {
            this.showError(Lang.get('editorErrorNoData'));
            return;
        }
        
        this.imageData = data.dataUrl;
        await this.loadImage();
        this.setupEventListeners();
        
        console.log('[Editor Pro] Ready');
    }
    
    async loadImage() {
    const img = await this.loadImageFromDataUrl(this.imageData);
    
    // Initialize Fabric canvas
    this.canvas = new fabric.Canvas('canvas', {
        width: img.width,
        height: img.height,
        backgroundColor: null  // ĐỔI từ '#ffffff' thành null để trong suốt
    });
    
    // Set background image
    this.canvas.setBackgroundImage(
        new fabric.Image(img),
        this.canvas.renderAll.bind(this.canvas)
    );
    
    // Enable selection
    this.canvas.selection = true;
    this.canvas.isDrawingMode = false;
    
    // Hide loading
    document.querySelector('.loading').style.display = 'none';
    
    // Update info
    const sizeMB = (this.imageData.length / 1024 / 1024).toFixed(2);
    document.getElementById('info').textContent = 
        `${img.width} × ${img.height} px • ${sizeMB} MB`;
    
    // Enable history
    this.setupHistory();
}
    
    loadImageFromDataUrl(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = dataUrl;
        });
    }
    
    setupHistory() {
        this.canvas.on('object:added', () => this.updateHistory());
        this.canvas.on('object:modified', () => this.updateHistory());
        this.canvas.on('object:removed', () => this.updateHistory());
    }
    
    updateHistory() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        
        undoBtn.disabled = !this.canvas._objects || this.canvas._objects.length === 0;
        redoBtn.disabled = true; // Fabric doesn't have built-in redo
    }
    
    setupEventListeners() {
        // Tool buttons
        document.getElementById('selectBtn').onclick = () => this.setTool('select');
        document.getElementById('drawBtn').onclick = (e) => this.toggleDropdown('drawDropdown', e);
        document.getElementById('shapeBtn').onclick = (e) => this.toggleDropdown('shapeDropdown', e);
        document.getElementById('arrowBtn').onclick = (e) => this.toggleDropdown('arrowDropdown', e);
        document.getElementById('textBtn').onclick = () => this.setTool('text');
        document.getElementById('cropBtn').onclick = () => this.cropImage();
        
        // Action buttons
        document.getElementById('downloadBtn').onclick = () => this.download();
        document.getElementById('copyBtn').onclick = () => this.copy();
        document.getElementById('undoBtn').onclick = () => this.undo();
        document.getElementById('redoBtn').onclick = () => this.redo();
        document.getElementById('deleteBtn').onclick = () => this.deleteSelected();
        document.getElementById('closeBtn').onclick = () => window.close();
        
        // Color and width
        document.getElementById('colorPicker').onchange = (e) => {
            this.currentColor = e.target.value;
            this.updateActiveObjectColor();
        };
        
        document.getElementById('lineWidth').oninput = (e) => {
            this.lineWidth = parseInt(e.target.value);
            document.getElementById('lineWidthValue').textContent = this.lineWidth;
            this.updateActiveObjectStroke();
        };
        
        // Zoom controls
        document.getElementById('zoomInBtn').onclick = () => this.adjustZoom(10);
        document.getElementById('zoomOutBtn').onclick = () => this.adjustZoom(-10);
        document.getElementById('zoomFitBtn').onclick = () => this.fitToScreen();
        document.getElementById('zoomSlider').oninput = (e) => {
            this.setZoom(parseInt(e.target.value));
        };
        
        // Dropdown items
        document.querySelectorAll('#drawDropdown .dropdown-item').forEach(item => {
            item.onclick = () => this.selectDrawMode(item.dataset.tool);
        });
        
        document.querySelectorAll('#shapeDropdown .dropdown-item').forEach(item => {
            item.onclick = () => this.addShape(item.dataset.shape);
        });
        
        document.querySelectorAll('#arrowDropdown .dropdown-item').forEach(item => {
            item.onclick = () => this.addArrow(item.dataset.arrow);
        });
        
        // Text input
        document.getElementById('textConfirm').onclick = () => this.confirmText();
        document.getElementById('textCancel').onclick = () => this.cancelText();
        
        // Canvas events for text tool
        this.canvas.on('mouse:down', (e) => {
            if (this.currentTool === 'text' && !e.target) {
                this.showTextInput(e.pointer.x, e.pointer.y);
            }
        });
        
        // Keyboard shortcuts
        document.onkeydown = (e) => {
            if (e.key === 'Escape') this.setTool('select');
            else if (e.key === 'Delete') this.deleteSelected();
            else if (e.key === 'v' && !e.ctrlKey) this.setTool('select');
            else if (e.key === 'd' && !e.ctrlKey) this.setTool('draw');
            else if (e.key === 't' && !e.ctrlKey) this.setTool('text');
            else if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.download();
            } else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.undo();
            } else if (e.key === 'y' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.redo();
            }
        };
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.tool-group')) {
                document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('show'));
            }
        });
        
        // Zoom with Ctrl + Mouse Wheel
const canvasWrapper = document.querySelector('.canvas-wrapper');
canvasWrapper.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        
        // Tính zoom mới
        const delta = e.deltaY > 0 ? -10 : 10;
        const currentZoom = parseInt(document.getElementById('zoomSlider').value);
        const newZoom = Math.max(10, Math.min(200, currentZoom + delta));
        
        // Lấy vị trí chuột relative đến canvas wrapper
        const rect = canvasWrapper.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        this.setZoom(newZoom, mouseX, mouseY);
    }
}, { passive: false });
    }
    
    setTool(tool) {
        this.currentTool = tool;
        
        // Update UI
        document.querySelectorAll('.btn-tool').forEach(btn => btn.classList.remove('active'));
        
        if (tool === 'select') {
            document.getElementById('selectBtn').classList.add('active');
            this.canvas.isDrawingMode = false;
            this.canvas.selection = true;
        } else if (tool === 'draw') {
            document.getElementById('drawBtn').classList.add('active');
            this.canvas.isDrawingMode = true;
            this.canvas.selection = false;
            this.setupDrawingBrush();
        } else if (tool === 'text') {
            document.getElementById('textBtn').classList.add('active');
            this.canvas.isDrawingMode = false;
            this.canvas.selection = true;
        }
    }
    
    toggleDropdown(dropdownId, event) {
        event.stopPropagation();
        const dropdown = document.getElementById(dropdownId);
        const isShown = dropdown.classList.contains('show');
        
        // Close all dropdowns
        document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('show'));
        
        // Toggle current
        if (!isShown) {
            dropdown.classList.add('show');
        }
    }
    
    selectDrawMode(mode) {
        this.currentDrawMode = mode;
        this.setTool('draw');
        document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('show'));
    }
    
    setupDrawingBrush() {
        const brush = new fabric.PencilBrush(this.canvas);
        brush.color = this.currentColor;
        brush.width = this.lineWidth;
        
        switch (this.currentDrawMode) {
            case 'pencil':
                brush.width = this.lineWidth;
                break;
            case 'brush':
                brush.width = this.lineWidth * 2;
                break;
            case 'marker':
                brush.width = this.lineWidth * 1.5;
                brush.color = this.currentColor + '80'; // Semi-transparent
                break;
            case 'spray':
                const sprayBrush = new fabric.SprayBrush(this.canvas);
                sprayBrush.color = this.currentColor;
                sprayBrush.width = this.lineWidth * 10;
                sprayBrush.density = 20;
                this.canvas.freeDrawingBrush = sprayBrush;
                return;
        }
        
        this.canvas.freeDrawingBrush = brush;
    }
    
    addShape(type) {
        let shape;
        const options = {
            left: 100,
            top: 100,
            fill: 'transparent',
            stroke: this.currentColor,
            strokeWidth: this.lineWidth
        };
        
        switch (type) {
            case 'rect':
                shape = new fabric.Rect({ ...options, width: 200, height: 150 });
                break;
            case 'circle':
                shape = new fabric.Circle({ ...options, radius: 75 });
                break;
            case 'triangle':
                shape = new fabric.Triangle({ ...options, width: 150, height: 150 });
                break;
            case 'line':
                shape = new fabric.Line([50, 50, 250, 50], {
                    stroke: this.currentColor,
                    strokeWidth: this.lineWidth
                });
                break;
        }
        
        if (shape) {
            this.canvas.add(shape);
            this.canvas.setActiveObject(shape);
            this.canvas.renderAll();
        }
        
        document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('show'));
    }
    
    addArrow(style) {
        const arrow = this.createArrow(100, 100, 300, 100, style);
        this.canvas.add(arrow);
        this.canvas.setActiveObject(arrow);
        this.canvas.renderAll();
        
        document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('show'));
    }
    
    createArrow(x1, y1, x2, y2, style) {
        const headSize = 15;
        const angle = Math.atan2(y2 - y1, x2 - x1);
        
        const strokeDashArray = {
            'solid': [],
            'dashed': [10, 10],
            'dotted': [2, 5]
        }[style] || [];
        
        const line = new fabric.Line([x1, y1, x2, y2], {
            stroke: this.currentColor,
            strokeWidth: this.lineWidth,
            strokeDashArray: strokeDashArray
        });
        
        const arrowHead = new fabric.Triangle({
            left: x2,
            top: y2,
            originX: 'center',
            originY: 'center',
            height: headSize,
            width: headSize,
            fill: this.currentColor,
            angle: (angle * 180 / Math.PI) + 90
        });
        
        const group = new fabric.Group([line, arrowHead]);
        
        if (style === 'double') {
            const arrowHead2 = new fabric.Triangle({
                left: x1,
                top: y1,
                originX: 'center',
                originY: 'center',
                height: headSize,
                width: headSize,
                fill: this.currentColor,
                angle: (angle * 180 / Math.PI) - 90
            });
            return new fabric.Group([line, arrowHead, arrowHead2]);
        }
        
        return group;
    }
    
    showTextInput(x, y) {
        const overlay = document.getElementById('textInputOverlay');
        const textarea = document.getElementById('textInput');
        
        overlay.style.display = 'block';
        overlay.style.left = x + 'px';
        overlay.style.top = y + 'px';
        
        textarea.value = '';
        textarea.focus();
        textarea.dataset.x = x;
        textarea.dataset.y = y;
    }
    
    confirmText() {
        const textarea = document.getElementById('textInput');
        const text = textarea.value.trim();
        
        if (!text) {
            this.cancelText();
            return;
        }
        
        const x = parseFloat(textarea.dataset.x);
        const y = parseFloat(textarea.dataset.y);
        
        const textObj = new fabric.IText(text, {
            left: x,
            top: y,
            fill: this.currentColor,
            fontSize: this.lineWidth * 8,
            fontFamily: 'Arial'
        });
        
        this.canvas.add(textObj);
        this.canvas.setActiveObject(textObj);
        this.canvas.renderAll();
        
        this.cancelText();
    }
    
    cancelText() {
        document.getElementById('textInputOverlay').style.display = 'none';
        document.getElementById('textInput').value = '';
    }
    
    updateActiveObjectColor() {
        const obj = this.canvas.getActiveObject();
        if (obj) {
            if (obj.type === 'i-text' || obj.type === 'text') {
                obj.set('fill', this.currentColor);
            } else {
                obj.set('stroke', this.currentColor);
            }
            this.canvas.renderAll();
        }
        
        if (this.canvas.isDrawingMode) {
            this.setupDrawingBrush();
        }
    }
    
    updateActiveObjectStroke() {
        const obj = this.canvas.getActiveObject();
        if (obj && obj.type !== 'i-text' && obj.type !== 'text') {
            obj.set('strokeWidth', this.lineWidth);
            this.canvas.renderAll();
        }
        
        if (this.canvas.isDrawingMode) {
            this.setupDrawingBrush();
        }
    }
    
    deleteSelected() {
        const activeObjects = this.canvas.getActiveObjects();
        if (activeObjects.length) {
            activeObjects.forEach(obj => this.canvas.remove(obj));
            this.canvas.discardActiveObject();
            this.canvas.renderAll();
        }
    }
    
    cropImage() {
        const rect = new fabric.Rect({
            left: 50,
            top: 50,
            width: 300,
            height: 200,
            fill: 'rgba(0,0,0,0.3)',
            stroke: '#4a9eff',
            strokeWidth: 2,
            strokeDashArray: [5, 5],
            lockRotation: true
        });
        
        this.canvas.add(rect);
        this.canvas.setActiveObject(rect);
        
        const cropBtn = document.getElementById('cropBtn');
        cropBtn.innerHTML = Lang.get('cropConfirm');
        cropBtn.onclick = () => this.applyCrop(rect);
    }
    
    applyCrop(rect) {
        const left = rect.left;
        const top = rect.top;
        const width = rect.width * rect.scaleX;
        const height = rect.height * rect.scaleY;
        
        // Create new canvas with cropped size
        const croppedDataUrl = this.canvas.toDataURL({
            left: left,
            top: top,
            width: width,
            height: height
        });
        
        // Reload with cropped image
        this.loadImageFromDataUrl(croppedDataUrl).then(img => {
            this.canvas.clear();
            this.canvas.setWidth(img.width);
            this.canvas.setHeight(img.height);
            this.canvas.setBackgroundImage(
                new fabric.Image(img),
                this.canvas.renderAll.bind(this.canvas)
            );
        });
        
        // Reset crop button
        const cropBtn = document.getElementById('cropBtn');
        cropBtn.innerHTML = Lang.get('cropBtnHtml');
        cropBtn.onclick = () => this.cropImage();
    }
    
    undo() {
        const objects = this.canvas.getObjects();
        if (objects.length > 0) {
            this.canvas.remove(objects[objects.length - 1]);
            this.canvas.renderAll();
        }
    }
    
    redo() {
        // Fabric.js doesn't have built-in redo
        // Would need to implement custom history stack
    }
    
    setZoom(percentage, mouseX = null, mouseY = null) {
    const wrapper = document.querySelector('.canvas-wrapper');
    const container = document.getElementById('canvasContainer');
    
    this.zoomLevel = percentage / 100;
    
    // Lấy vị trí chuột hoặc center viewport
    if (mouseX === null || mouseY === null) {
        const rect = container.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();
        mouseX = wrapperRect.width / 2;
        mouseY = wrapperRect.height / 2;
    }
    
    // Apply zoom bằng CSS transform thay vì Fabric.js setZoom
    container.style.transform = `scale(${this.zoomLevel})`;
    container.style.transformOrigin = 'center center';
    
    // Update UI
    document.getElementById('zoomValue').textContent = percentage + '%';
    document.getElementById('zoomSlider').value = percentage;
}   
    adjustZoom(delta) {
    const currentZoom = parseInt(document.getElementById('zoomSlider').value);
    const newZoom = Math.max(10, Math.min(200, currentZoom + delta));
    this.setZoom(newZoom);  // Không cần truyền tọa độ
}
    
    fitToScreen() {
    const wrapper = document.querySelector('.canvas-wrapper');
    const container = document.getElementById('canvasContainer');
    
    const availableHeight = wrapper.clientHeight - 40;
    const availableWidth = wrapper.clientWidth - 40;
    
    const scaleX = availableWidth / this.canvas.width;
    const scaleY = availableHeight / this.canvas.height;
    const scale = Math.min(scaleX, scaleY, 1);
    
    this.setZoom(Math.floor(scale * 100));
}
    
    download() {
        const dataUrl = this.canvas.toDataURL({
            format: 'png',
            quality: 1
        });
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `screenshot-edited-${timestamp}.png`;
        
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        a.click();
        
        console.log('[Editor Pro] Downloaded:', filename);
    }
    
    async copy() {
        try {
            const dataUrl = this.canvas.toDataURL();
            const blob = await (await fetch(dataUrl)).blob();
            
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);
            
            const btn = document.getElementById('copyBtn');
            const originalHTML = btn.innerHTML;
            btn.innerHTML = Lang.get('copiedBtnHtml');
            
            setTimeout(() => {
                btn.innerHTML = originalHTML;
            }, 2000);
            
            console.log('[Editor Pro] Copied to clipboard');
        } catch (err) {
            console.error('[Editor Pro] Copy failed:', err);
            alert(Lang.get('editorErrorCopy', { error: err.message }));
        }
    }
    
    showError(message) {
        document.querySelector('.loading').innerHTML = 
            `<div style="color: #ff4444;">${message}</div>`;
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new ScreenshotEditorPro();
    });
} else {
    new ScreenshotEditorPro();
}
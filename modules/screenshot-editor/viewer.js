// viewer.js - UPDATED to receive data from background

class ScreenshotEditor {
    constructor() {
        this.imageData = null;
        this.img = null;
        this.canvas = null;
        this.ctx = null;
        this.drawingCanvas = null;
        this.drawingCtx = null;
        
        this.currentTool = null;
        this.isDrawing = false;
        this.startX = 0;
        this.startY = 0;
        this.history = [];
        this.historyStep = -1;
        
        this.color = '#ff0000';
        this.lineWidth = 3;
        
        this.init();
    }
    
    async init() {
        console.log('[Editor] Initializing...');
        
        // === ĐỌC ID TỪ URL ===
        const urlParams = new URLSearchParams(window.location.search);
        const dataId = urlParams.get('id');
        
        if (!dataId) {
            this.showError(Lang.get('editorErrorNoId'));
            return;
        }
        
        console.log('[Editor] Requesting data with ID:', dataId);
        
        // === LẤY DATA TỪ BACKGROUND ===
        const data = await chrome.runtime.sendMessage({
            action: 'getScreenshotData',
            id: dataId
        });
        
        if (!data || !data.dataUrl) {
            this.showError(Lang.get('editorErrorNoData'));
            return;
        }
        
        this.imageData = data.dataUrl;
        console.log('[Editor] Data received, length:', this.imageData.length);
        
        // Setup canvas
        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.drawingCanvas = document.getElementById('drawingCanvas');
        this.drawingCtx = this.drawingCanvas.getContext('2d');
        
        // Load image
        await this.loadImage();
        
        // Setup event listeners
        this.setupEventListeners();
        
        console.log('[Editor] Ready');
    }
    
    async loadImage() {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                console.log('[Editor] Image loaded:', img.width, 'x', img.height);
                
                this.img = img;
                
                // Set canvas size
                this.canvas.width = img.width;
                this.canvas.height = img.height;
                this.drawingCanvas.width = img.width;
                this.drawingCanvas.height = img.height;
                
                // Draw image
                this.ctx.drawImage(img, 0, 0);
                
                // Save to history
                this.saveState();
                
                // Update UI
                document.querySelector('.loading').style.display = 'none';
                const sizeMB = (this.imageData.length / 1024 / 1024).toFixed(2);
                document.getElementById('info').textContent = 
                    `${img.width} × ${img.height} px • ${sizeMB} MB`;
                
                resolve();
            };
            
            img.onerror = () => {
                console.error('[Editor] Failed to load image');
                this.showError(Lang.get('editorErrorLoadImage'));
                reject();
            };
            
            img.src = this.imageData;
        });
    }
    
    setupEventListeners() {
        // Toolbar buttons
        document.getElementById('downloadBtn').onclick = () => this.download();
        document.getElementById('copyBtn').onclick = () => this.copy();
        document.getElementById('cropBtn').onclick = () => this.setTool('crop');
        document.getElementById('drawBtn').onclick = () => this.setTool('draw');
        document.getElementById('textBtn').onclick = () => this.setTool('text');
        document.getElementById('shapeBtn').onclick = () => this.setTool('shape');
        document.getElementById('arrowBtn').onclick = () => this.setTool('arrow');
        document.getElementById('undoBtn').onclick = () => this.undo();
        document.getElementById('redoBtn').onclick = () => this.redo();
        document.getElementById('zoomBtn').onclick = () => this.toggleZoom();
        document.getElementById('closeBtn').onclick = () => window.close();
        
        // Color & line width
        document.getElementById('colorPicker').onchange = (e) => {
            this.color = e.target.value;
        };
        document.getElementById('lineWidth').oninput = (e) => {
            this.lineWidth = parseInt(e.target.value);
        };
        
        // Drawing canvas events
        this.drawingCanvas.onmousedown = (e) => this.onMouseDown(e);
        this.drawingCanvas.onmousemove = (e) => this.onMouseMove(e);
        this.drawingCanvas.onmouseup = (e) => this.onMouseUp(e);
        
        // Keyboard shortcuts
        document.onkeydown = (e) => {
            if (e.key === 'Escape') {
                this.setTool(null);
            } else if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
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
    }
    
    setTool(tool) {
        this.currentTool = tool;
        
        // Update UI
        document.querySelectorAll('.btn-tool').forEach(btn => {
            btn.classList.remove('active');
        });
        
        if (tool) {
            const toolBtn = {
                'crop': 'cropBtn',
                'draw': 'drawBtn',
                'text': 'textBtn',
                'shape': 'shapeBtn',
                'arrow': 'arrowBtn'
            }[tool];
            
            if (toolBtn) {
                document.getElementById(toolBtn).classList.add('active');
            }
        }
        
        // Update cursor
        this.drawingCanvas.style.cursor = tool ? 'crosshair' : 'default';
    }
    
    onMouseDown(e) {
        if (!this.currentTool) return;
        
        this.isDrawing = true;
        const rect = this.drawingCanvas.getBoundingClientRect();
        this.startX = e.clientX - rect.left;
        this.startY = e.clientY - rect.top;
    }
    
    onMouseMove(e) {
        if (!this.isDrawing) return;
        
        const rect = this.drawingCanvas.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;
        
        // Clear drawing canvas
        this.drawingCtx.clearRect(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);
        
        // Draw preview
        this.drawingCtx.strokeStyle = this.color;
        this.drawingCtx.fillStyle = this.color;
        this.drawingCtx.lineWidth = this.lineWidth;
        this.drawingCtx.lineCap = 'round';
        
        switch (this.currentTool) {
            case 'draw':
                this.drawingCtx.beginPath();
                this.drawingCtx.moveTo(this.startX, this.startY);
                this.drawingCtx.lineTo(currentX, currentY);
                this.drawingCtx.stroke();
                this.startX = currentX;
                this.startY = currentY;
                break;
                
            case 'shape':
                this.drawingCtx.strokeRect(
                    this.startX,
                    this.startY,
                    currentX - this.startX,
                    currentY - this.startY
                );
                break;
                
            case 'arrow':
                this.drawArrow(this.startX, this.startY, currentX, currentY);
                break;
                
            case 'crop':
                this.drawingCtx.setLineDash([5, 5]);
                this.drawingCtx.strokeRect(
                    this.startX,
                    this.startY,
                    currentX - this.startX,
                    currentY - this.startY
                );
                this.drawingCtx.setLineDash([]);
                break;
        }
    }
    
    onMouseUp(e) {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        
        const rect = this.drawingCanvas.getBoundingClientRect();
        const endX = e.clientX - rect.left;
        const endY = e.clientY - rect.top;
        
        // Apply to main canvas
        if (this.currentTool === 'crop') {
            this.applyCrop(this.startX, this.startY, endX, endY);
        } else if (this.currentTool === 'text') {
            this.addText(endX, endY);
        } else {
            // Merge drawing canvas to main canvas
            this.ctx.drawImage(this.drawingCanvas, 0, 0);
            this.saveState();
        }
        
        // Clear drawing canvas
        this.drawingCtx.clearRect(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);
    }
    
    drawArrow(fromX, fromY, toX, toY) {
        const headlen = 15;
        const angle = Math.atan2(toY - fromY, toX - fromX);
        
        this.drawingCtx.beginPath();
        this.drawingCtx.moveTo(fromX, fromY);
        this.drawingCtx.lineTo(toX, toY);
        this.drawingCtx.lineTo(
            toX - headlen * Math.cos(angle - Math.PI / 6),
            toY - headlen * Math.sin(angle - Math.PI / 6)
        );
        this.drawingCtx.moveTo(toX, toY);
        this.drawingCtx.lineTo(
            toX - headlen * Math.cos(angle + Math.PI / 6),
            toY - headlen * Math.sin(angle + Math.PI / 6)
        );
        this.drawingCtx.stroke();
    }
    
    applyCrop(x1, y1, x2, y2) {
        const x = Math.min(x1, x2);
        const y = Math.min(y1, y2);
        const width = Math.abs(x2 - x1);
        const height = Math.abs(y2 - y1);
        
        if (width < 10 || height < 10) return;
        
        // Get cropped image data
        const imageData = this.ctx.getImageData(x, y, width, height);
        
        // Resize canvas
        this.canvas.width = width;
        this.canvas.height = height;
        this.drawingCanvas.width = width;
        this.drawingCanvas.height = height;
        
        // Draw cropped image
        this.ctx.putImageData(imageData, 0, 0);
        
        this.saveState();
        this.setTool(null);
        
        // Update info
        const sizeMB = (this.canvas.toDataURL().length / 1024 / 1024).toFixed(2);
        document.getElementById('info').textContent = 
            `${width} × ${height} px • ${sizeMB} MB`;
    }
    
    addText(x, y) {
        const text = prompt(Lang.get('textPrompt'), '');
        if (!text) return;
        
        this.ctx.font = `${this.lineWidth * 10}px Arial`;
        this.ctx.fillStyle = this.color;
        this.ctx.fillText(text, x, y);
        
        this.saveState();
        this.setTool(null);
    }
    
    saveState() {
        // Remove any redo states
        this.history = this.history.slice(0, this.historyStep + 1);
        
        // Save current state
        this.history.push(this.canvas.toDataURL());
        this.historyStep++;
        
        // Limit history to 20 states
        if (this.history.length > 20) {
            this.history.shift();
            this.historyStep--;
        }
        
        this.updateHistoryButtons();
    }
    
    undo() {
        if (this.historyStep <= 0) return;
        
        this.historyStep--;
        this.loadState(this.history[this.historyStep]);
        this.updateHistoryButtons();
    }
    
    redo() {
        if (this.historyStep >= this.history.length - 1) return;
        
        this.historyStep++;
        this.loadState(this.history[this.historyStep]);
        this.updateHistoryButtons();
    }
    
    loadState(dataUrl) {
        const img = new Image();
        img.onload = () => {
            this.canvas.width = img.width;
            this.canvas.height = img.height;
            this.drawingCanvas.width = img.width;
            this.drawingCanvas.height = img.height;
            this.ctx.drawImage(img, 0, 0);
        };
        img.src = dataUrl;
    }
    
    updateHistoryButtons() {
        document.getElementById('undoBtn').disabled = this.historyStep <= 0;
        document.getElementById('redoBtn').disabled = this.historyStep >= this.history.length - 1;
    }
    
    download() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `screenshot-${timestamp}.png`;
        
        const a = document.createElement('a');
        a.href = this.canvas.toDataURL();
        a.download = filename;
        a.click();
        
        console.log('[Editor] Downloaded:', filename);
    }
    
    async copy() {
        try {
            this.canvas.toBlob(async (blob) => {
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ]);
                
                const btn = document.getElementById('copyBtn');
                const originalHTML = btn.innerHTML;
                btn.innerHTML = Lang.get('copiedBtnHtml');
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                }, 2000);
                
                console.log('[Editor] Copied to clipboard');
            });
        } catch (err) {
            console.error('[Editor] Copy failed:', err);
            alert(Lang.get('editorErrorCopy', { error: err.message }));
        }
    }
    
    toggleZoom() {
        const container = document.getElementById('canvasContainer');
        if (this.canvas.style.maxWidth === 'none') {
            this.canvas.style.maxWidth = '100%';
            this.drawingCanvas.style.maxWidth = '100%';
        } else {
            this.canvas.style.maxWidth = 'none';
            this.drawingCanvas.style.maxWidth = 'none';
        }
    }
    
    showError(message) {
        document.querySelector('.loading').innerHTML = `<div style="color: #ff4444;">${message}</div>`;
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new ScreenshotEditor();
    });
} else {
    new ScreenshotEditor();
}
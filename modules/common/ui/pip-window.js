/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  TRANSLATION PIP WINDOW - TAB VERSION                          │
 * │  3 Tabs: Dịch, Lịch sử, Cài đặt                               │
 * │  Full conversation history with speaker names                   │
 * └─────────────────────────────────────────────────────────────────┘
 */

class TranslationPiPWindow {
    constructor(summarizerManager = null) { // <-- Sửa dòng này
        this.container = null;
        this.summarizerManager = summarizerManager;
        this.isMinimized = false;
        this.captionCount = 0;
        this.currentTab = 'translation';
        
        // History management
        this.conversationHistory = [];
        this.historyLimit = 100;
        this.currentCaption = {
            speaker: 'Unknown',
            original: '',
            translated: ''
        };
        
        // Settings
        this.settings = {
            targetLanguage: 'vi',
            fontSize: 'medium',
            showOriginal: true,
            autoScroll: true,
            saveHistory: true,
            minLength: 5,
            debounceMs: 500,
            historyLimit: 100
        };
        
        // Drag & Resize
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        
        // Callbacks
        this.themeChangeListener = null;
        this.closeCallback = null;
		this.historyManager = null;
		this.summaryRenderer = null;
        
        console.log('[TranslationPiP] 🎬 Instance created');
    }
	
    async toggleTheme() {
        const currentTheme = this.container.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.container.setAttribute('data-theme', newTheme);
        
        try {
            await chrome.storage.local.set({ theme: newTheme });
            console.log('[TranslationPiP] ✓ Theme saved:', newTheme);
        } catch (error) {
            console.error('[TranslationPiP] ✗ Error saving theme:', error);
        }
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * INITIALIZATION
     * ═══════════════════════════════════════════════════════════════
     */

    async show() {
    console.log('[TranslationPiP] 📺 Showing window...');
    
    // ✅ Check if container exists in shadow DOM or body
    const containerExists = this.shadowContainer 
        ? this.shadowContainer.container.contains(this.container)
        : (this.container && document.body.contains(this.container));
    
    if (containerExists) {
        console.log('[TranslationPiP] ✓ Container exists, just showing');
        this.container.style.setProperty('display', 'flex', 'important');
        return;
    }
    
    // ✅ Xóa TẤT CẢ PiP duplicate trong DOM (cleanup)
    const existingPiPs = document.querySelectorAll('#meetTranslationPiP');
    if (existingPiPs.length > 0) {
        console.log(`[TranslationPiP] 🗑️ Removing ${existingPiPs.length} existing PiP(s)`);
        existingPiPs.forEach(pip => pip.remove());
    }
    
    console.log('[TranslationPiP] 📦 Creating NEW window...');

    try {
        // Load CSS
        await this.loadCSS();
        
        // ✅ Load shadow-dom-helper nếu chưa có
        if (typeof window.createShadowContainer !== 'function') {
            const script = document.createElement('script');
            script.src = chrome.runtime.getURL('utils/shadow-dom-helper.js');
            document.head.appendChild(script);
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Create window
        this.container = await this.createPiPWindow();
        
        // ✅ Tạo Shadow DOM container
        if (typeof window.createShadowContainer === 'function') {
            this.shadowContainer = window.createShadowContainer({
                id: 'translation-pip-shadow',
                className: 'translation-pip-shadow-container',
                stylesheets: ['modules/common/ui/pip-window.css']
            });
            
            // Setup theme observer
            if (typeof window.setupThemeObserver === 'function') {
                window.setupThemeObserver(this.shadowContainer.shadowRoot);
            }
            
            // Append container vào shadow DOM
            this.shadowContainer.container.appendChild(this.container);
        } else {
            // Fallback: append trực tiếp vào body
            document.body.appendChild(this.container);
        }
        console.log('[TranslationPiP] ✅ Container appended to', this.shadowContainer ? 'Shadow DOM' : 'body');
        
        // Setup
        this.setupEventListeners();
        await this.loadSettings();
        await this.applyTheme();
        this.makeDraggable();
        this.makeResizable();
        
        // ❌ KHÔNG load history cũ
        // await this.loadHistoryFromStorage(); // REMOVED
        
        // Init managers (sẽ tự động clear history)
        await this.initManagers();

        console.log('[TranslationPiP] ✓ Window created successfully');

    } catch (error) {
        console.error('[TranslationPiP] ✗ Error:', error);
        throw error;
    }
}

    /**
     * Load CSS
     */
    async loadCSS() {
        const cssUrl = chrome.runtime.getURL('modules/common/ui/pip-window.css');
        
        if (document.querySelector(`link[href="${cssUrl}"]`)) {
            console.log('[TranslationPiP] CSS already loaded');
            return;
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = cssUrl;
        document.head.appendChild(link);
        
        console.log('[TranslationPiP] ✓ CSS loaded');
    }


    /**
     * Create PiP Window DOM structure
     */
    async createPiPWindow() {
        try {
            // 1. Lấy đường dẫn chính xác đến file .html
            // (Đường dẫn này đã được khai báo trong manifest.json)
            const url = chrome.runtime.getURL('modules/common/ui/pip-window.html');
            
            // 2. Tải nội dung file HTML
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Không thể tải pip-window.html: ${response.statusText}`);
            }
            const htmlText = await response.text();

            // 3. Phân tích chuỗi HTML thành một tài liệu DOM
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');
            
            // 4. Trích xuất đúng element #meetTranslationPiP từ file HTML đã phân tích
            const pipElement = doc.getElementById('meetTranslationPiP');
            
            if (!pipElement) {
                throw new Error('Không tìm thấy #meetTranslationPiP trong file pip-window.html');
            }
			
			// 4A. Lấy tên extension từ manifest và chèn vào header
            try {
                const manifest = chrome.runtime.getManifest();
                const extensionName = manifest.name || 'AI Assistant'; // Lấy tên, hoặc tên dự phòng
                
                // 4B. Tìm element #pip-extension-name (đã thêm trong HTML)
                const nameElement = pipElement.querySelector('#pip-extension-name'); 
                
                if (nameElement) {
                    // 4C. Gán tên vào
                    nameElement.textContent = extensionName;
                } else {
                    console.warn('[TranslationPiP] Không tìm thấy #pip-extension-name');
                }
            } catch (e) {
                console.error('[TranslationPiP] Lỗi khi lấy manifest.name:', e);
            }

            // 5. Ghi đè các thuộc tính để đảm bảo nó hoạt động
            pipElement.setAttribute('data-theme', 'light');
            
            // 6. Sửa lỗi cho tab Tóm tắt (giống như code cũ của bạn)
            const summaryTab = pipElement.querySelector('#summaryTab');
            if(summaryTab) {
                summaryTab.innerHTML = `<div class="summary-placeholder">Đang tải...</div>`;
            }

            console.log('[TranslationPiP] ✓ Đã tạo PiP DOM bằng cách fetch file HTML');
            return pipElement;

        } catch (error) {
            console.error('[TranslationPiP] ✗ Lỗi nghiêm trọng khi tạo PiP Window:', error);
            // Fallback: Tạo một div lỗi
            const errorDiv = document.createElement('div');
            errorDiv.id = 'meetTranslationPiP';
            errorDiv.style.cssText = "position:fixed; top:20px; right:20px; padding: 20px; background: red; color: white; z-index: 999999;";
            errorDiv.innerText = `Lỗi tải PiP: ${error.message}. Hãy kiểm tra manifest.json.`;
            return errorDiv;
        }
    }

    /**
     * Create settings tab
     */
    createSettingsTab() {
        const tab = document.createElement('div');
        tab.className = 'pip-tab-content';
        tab.id = 'settingsTab';
        
        tab.innerHTML = `
            <div class="settings-body">
                <div class="setting-item">
                    <label>Ngôn ngữ đích:</label>
                    <select id="pipTargetLanguage">
                        <option value="vi">Tiếng Việt</option>
                        <option value="en">English</option>
                        <option value="ja">日本語</option>
                        <option value="ko">한국어</option>
                        <option value="zh">中文</option>
                    </select>
                </div>

                <div class="setting-item">
                    <label>Kích thước chữ:</label>
                    <select id="pipFontSize">
                        <option value="small">Nhỏ</option>
                        <option value="medium" selected>Trung bình</option>
                        <option value="large">Lớn</option>
                    </select>
                </div>

                <div class="setting-item">
                    <label>
                        <input type="checkbox" id="pipShowOriginal" checked>
                        <span>Hiển thị phụ đề gốc</span>
                    </label>
                </div>

                <div class="setting-item">
                    <label>
                        <input type="checkbox" id="pipAutoScroll" checked>
                        <span>Tự động cuộn lịch sử</span>
                    </label>
                </div>

                <div class="setting-item">
                    <label>
                        <input type="checkbox" id="pipSaveHistory" checked>
                        <span>Lưu lịch sử hội thoại</span>
                    </label>
                </div>

                <div class="setting-item-divider"></div>

                <div class="setting-item">
                    <label for="pipMinLength">Độ dài câu tối thiểu: <output id="pipMinLengthValue">5</output> ký tự</label>
                    <input type="range" id="pipMinLength" min="1" max="20" value="5" class="pip-slider">
                </div>

                <div class="setting-item">
                    <label for="pipDebounceMs">Độ trễ dịch: <output id="pipDebounceMsValue">500</output> ms</label>
                    <input type="range" id="pipDebounceMs" min="100" max="2000" step="100" value="500" class="pip-slider">
                </div>

                <div class="setting-item-divider"></div>

                <div class="setting-item">
                    <label for="pipHistoryLimit">Giới hạn lịch sử: <output id="pipHistoryLimitValue">100</output> câu</label>
                    <input type="range" id="pipHistoryLimit" min="50" max="500" step="50" value="100" class="pip-slider">
                </div>

                <div class="settings-actions">
                    <button id="pipSaveSettings" class="btn-primary-full">
                        Lưu cài đặt
                    </button>
                </div>
            </div>
        `;
        
        return tab;
    }


    /**
     * ═══════════════════════════════════════════════════════════════
     * EVENT LISTENERS
     * ═══════════════════════════════════════════════════════════════
     */

    setupEventListeners() {
        if (!this.container) return;

        // --- CHẶN MOUSEDOWN CHỈ CHO CLOSE BUTTON ---
        const closeBtn = this.container.querySelector('#closePiP');
        if (closeBtn) {
            closeBtn.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });
        }

        // --- CLOSE BUTTON EVENT ---
        closeBtn?.addEventListener('click', () => {
            console.log('[TranslationPiP] 📽 Close button clicked - hiding window');
            
            // Hide window instead of removing it
            this.hide();
            
            // Notify parent (meet-content.js) that window was hidden
            if (this.closeCallback) {
                this.closeCallback('hidden');
            }
            
            // Show notification
            this.showNotification('✔ Cửa sổ đã được ẩn. Dịch vẫn chạy ngầm.', 'success');
        });

        // --- TAB SWITCHING ---
        this.container.querySelectorAll('.tab-btn').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // --- SETTINGS ---
        this.setupSettingsListeners();
        
        // --- THEME CHANGES ---
        this.themeChangeListener = (changes) => {
            if (changes.theme) {
                this.applyTheme();
            }
        };
        chrome.storage.onChanged.addListener(this.themeChangeListener);

        // --- HISTORY EXPORT BUTTON (ĐÃ DI CHUYỂN VÀO ĐÂY) ---
        this.container.querySelector('#exportHistoryBtn')?.addEventListener('click', () => {
            console.log('[TranslationPiP] Export History button clicked');
            this.handleExportHistory();
        });
        // --- KẾT THÚC THÊM MỚI ---

        console.log('[TranslationPiP] ✓ Event listeners attached (CLOSE ONLY)');
    }


    /**
     * Setup settings listeners
     */
    setupSettingsListeners() {
        // Save button (ID MỚI: #saveSettings)
        this.container.querySelector('#saveSettings')?.addEventListener('click', () => this.saveSettings());
        
        // Reset button (ID MỚI: #resetSettings)
        this.container.querySelector('#resetSettings')?.addEventListener('click', () => this.resetSettings()); // Sẽ thêm hàm này ở bước 7
    }

// HÀM MỚI
    resetSettings() {
        if (!confirm('Bạn có muốn đặt lại cài đặt về mặc định?')) return;
        
        // Xóa cài đặt đã lưu
        chrome.storage.local.remove('pipSettings', async () => {
            // Tải lại cài đặt mặc định (constructor)
            this.settings = new TranslationPiPWindow().settings;
            await this.loadSettings(); // Tải lại để áp dụng
            this.showNotification('✓ Đã đặt lại cài đặt');
        });
    }

// HÀM MỚI (thay cho hàm export cũ)
    exportHistory() {
        if (!this.historyManager) {
            alert('Lỗi: Không tìm thấy History Manager.');
            return;
        }

        const history = this.historyManager.getHistory();
        if (history.length === 0) {
            alert('Chưa có lịch sử để xuất');
            return;
        }

        // Format as text
        let text = '=== LỊCH SỬ HỘI THOẠI ===\n';
        text += `Xuất lúc: ${new Date().toLocaleString('vi-VN')}\n`;
        text += `Tổng số câu: ${history.length}\n\n`;

        history.forEach((item, index) => {
            const time = new Date(item.timestamp).toLocaleTimeString('vi-VN');
            text += `[${index + 1}] ${time} | ${item.speaker}:\n`;
            text += `Gốc: ${item.original}\n`;
            text += `Dịch: ${item.translated}\n\n`;
        });

        // Download
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lich-su-hoi-thoai-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);

        console.log('[TranslationPiP] ✓ History exported');
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * TAB MANAGEMENT
     * ═══════════════════════════════════════════════════════════════
     */

    switchTab(tabName) {
        this.currentTab = tabName;

        // Cập nhật nút tab (CLASS MỚI: .tab-btn)
        this.container.querySelectorAll('.tab-btn').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Cập nhật nội dung tab (CLASS MỚI: .tab-content)
        this.container.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}Tab`);
        });

        console.log('[TranslationPiP] ✓ Switched to tab:', tabName);
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * CAPTION UPDATES
     * ═══════════════════════════════════════════════════════════════
     */

    /**
     * Update current caption display
     * --- BẮT ĐẦU SỬA LỖI (QUAN TRỌNG) ---
     * Cập nhật UI trực tiếp, không phụ thuộc vào HistoryManager
     */
    updateCaption(speaker, original, translated) {
        if (!this.container) return;

        // Cập nhật bộ đếm
        if (translated) {
            this.captionCount++;
            this.updateCounter();
        }

        // --- PHẦN 1: CẬP NHẬT UI TRỰC TIẾP (BẮT BUỘC) ---
        // (Sử dụng lại logic từ các lần sửa trước, đảm bảo ID chính xác)
        
        // Phân biệt:
        // 'translated' là 'null' (lần đầu, đang chờ dịch)
        // 'translated' là 'undefined' (bị filter, chỉ cập nhật Gốc)
        // 'translated' là một chuỗi string (dịch thành công)

        const originalSpeaker = this.container.querySelector('#liveSpeaker');
        const originalCaption = this.container.querySelector('#liveOriginal');
        const translatedSpeaker = this.container.querySelector('#liveTranslatedSpeaker');
        const translatedCaption = this.container.querySelector('#liveTranslated');

        if (originalSpeaker) originalSpeaker.textContent = speaker || 'Unknown';
        if (originalCaption) {
             originalCaption.textContent = original || '...';
             originalCaption.classList.toggle('placeholder', !original);
        }
        if (translatedSpeaker) translatedSpeaker.textContent = speaker || 'Unknown';
        
        // Xử lý logic hiển thị bản dịch
        if (translatedCaption) {
            if (translated === null) {
                // 'null' có nghĩa là đang chờ, hiển thị "Đang dịch..."
                translatedCaption.textContent = 'Đang dịch...';
                translatedCaption.classList.add('placeholder');
            } else if (translated !== undefined) {
                // 'string' (kể cả rỗng) hoặc '[Lỗi dịch thuật]'
                translatedCaption.textContent = translated || '...';
                translatedCaption.classList.toggle('placeholder', !translated);
            }
            // Nếu 'translated' là 'undefined', chúng ta không làm gì cả,
            // để giữ nguyên bản dịch cũ (nếu có)
        }

        // --- PHẦN 2: GỬI CHO HISTORY MANAGER (NẾU CÓ) ---
        // Thử gửi cho history manager, nhưng không phụ thuộc vào nó
        if (this.historyManager) {
            try {
                this.historyManager.processCaption({
                    speaker: speaker || 'Unknown',
                    original: original || '',
                    translated: translated || '' // Gửi giá trị (kể cả null/undefined)
                });
            } catch (error) {
                console.error('[TranslationPiP] HistoryManager processCaption failed:', error);
                // Vẫn tiếp tục, vì UI đã được cập nhật
            }
        }
    }

    /**
     * Show loading indicator
     */
    showLoading() {
        const loading = this.container?.querySelector('#pipLoading');
        if (loading) loading.style.display = 'flex';
    }

    /**
     * Hide loading indicator
     */
    hideLoading() {
        const loading = this.container?.querySelector('#pipLoading');
        if (loading) loading.style.display = 'none';
    }

    /**
     * Update counter
     */
    updateCounter() {
        const counter = this.container?.querySelector('#captionCount');
        if (counter) counter.textContent = this.captionCount;
    }

    /**
     * Reset counter
     */
    resetCount() {
        this.captionCount = 0;
        this.updateCounter();
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * HISTORY MANAGEMENT
     * ═══════════════════════════════════════════════════════════════
     */

addToHistory(caption) {
    // ✅ CHỈ LƯU TIẾNG VIỆT
    const vietnameseText = caption.translated || caption.original;
    
    // Add to array
    this.conversationHistory.push({
        speaker: caption.speaker,
        timestamp: caption.timestamp || Date.now(),
        translated: vietnameseText, // Only save Vietnamese
        id: Date.now() + Math.random()
    });

    // Enforce limit
    if (this.conversationHistory.length > this.settings.historyLimit) {
        this.conversationHistory.shift();
    }

    // Update UI
    this.renderHistory();

    // Save to storage
    this.saveHistoryToStorage();

    console.log('[TranslationPiP] ✓ Added to history (Vietnamese only)');
}

    /**
     * Render history list
     */

    renderHistory() {
        // --- CẬP NHẬT STATS (THÊM MỚI) ---
        const entryCountEl = this.container?.querySelector('#entryCount');
        const totalWordsEl = this.container?.querySelector('#totalWords');
        
        if (entryCountEl) {
            entryCountEl.textContent = `${this.conversationHistory.length} mục`;
        }
        if (totalWordsEl) {
            // historymanager.js đã tính sẵn wordCount cho mỗi mục
            const totalWords = this.conversationHistory.reduce((sum, entry) => sum + (entry.wordCount || 0), 0);
            totalWordsEl.textContent = `${totalWords} từ`;
        }
        // --- KẾT THÚC CẬP NHẬT STATS ---

        const historyList = this.container?.querySelector('#historyList');
        if (!historyList) return;

        // ✅ SỬA LỖI (QUAN TRỌNG):
        // Thêm "max-height: none !important;" để GHI ĐÈ
        // file CSS (nếu file CSS chưa được cập nhật).
        historyList.style.cssText = `
            overflow-y: auto !important;
            flex: 1 !important;
            min-height: 0 !important;
            max-height: none !important;
        `;

        // Clear existing content
        historyList.innerHTML = '';

        // Check if empty
        if (this.conversationHistory.length === 0) {
            historyList.innerHTML = `
                <div class="history-empty">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                        <circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="2" opacity="0.2"/>
                        <path d="M24 16v8l4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
                    </svg>
                    <p>Chưa có lịch sử hội thoại</p>
                </div>
            `;
            return;
        }

        // Render items (reverse to show newest first)
        const items = [...this.conversationHistory].reverse();
        items.forEach(item => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item'; // Sửa từ className (nếu dùng HTML cũ)
            
            // Lấy ID từ HTML mới
            const speakerElement = this.container.querySelector('#showTimestamps')?.checked;
            const time = speakerElement ? new Date(item.timestamp).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit'
            }) : '';
            
            // Dựa theo cấu trúc HTML mới (image_7e36e7.png)
            // ✅ CHỈ HIỂN THỊ TIẾNG VIỆT
			const displayText = item.translated || item.original || '';
			historyItem.innerHTML = `
			${time ? `<div class="history-timestamp">${time}</div>` : ''}
			<div class="history-speaker">${item.speaker}:</div>
			<div class="history-text">${displayText}</div>
			`;
            
            historyList.appendChild(historyItem);
        });

        // Auto scroll if enabled
        if (this.settings.autoScroll && this.currentTab === 'history') {
            setTimeout(() => {
                historyList.scrollTop = 0; // Scroll to top (newest)
            }, 100);
        }
    }

    /**
     * Clear history
     */
    async clearHistory() {
        const confirmed = confirm('Bạn có chắc muốn xóa toàn bộ lịch sử hội thoại?');
        if (!confirmed) return;

        this.conversationHistory = [];
        this.renderHistory();
        await this.saveHistoryToStorage();
        
        console.log('[TranslationPiP] ✓ History cleared');
    }

    /**
     * Export history
     */
    exportHistory() {
        if (this.conversationHistory.length === 0) {
            alert('Chưa có lịch sử để xuất');
            return;
        }

        // Format as text
        let text = '=== LỊCH SỬ HỘI THOẠI ===\n';
        text += `Xuất lúc: ${new Date().toLocaleString('vi-VN')}\n`;
        text += `Tổng số câu: ${this.conversationHistory.length}\n\n`;

        this.conversationHistory.forEach((item, index) => {
            const time = new Date(item.timestamp).toLocaleTimeString('vi-VN');
            text += `[${index + 1}] ${time}\n`;
            text += `${item.speaker}:\n`;
            text += `Gốc: ${item.original}\n`;
            text += `Dịch: ${item.translated}\n\n`;
        });

        // Download
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lich-su-hoi-thoai-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);

        console.log('[TranslationPiP] ✓ History exported');
    }

    /**
     * Save history to storage
     */
    async saveHistoryToStorage() {
        try {
            await chrome.storage.local.set({
                pipConversationHistory: this.conversationHistory
            });
        } catch (error) {
            console.error('[TranslationPiP] ✗ Error saving history:', error);
        }
    }

    /**
     * Load history from storage
     */
    async loadHistoryFromStorage() {
        try {
            const result = await chrome.storage.local.get('pipConversationHistory');
            if (result.pipConversationHistory) {
                this.conversationHistory = result.pipConversationHistory;
                this.renderHistory();
                console.log('[TranslationPiP] ✓ History loaded:', this.conversationHistory.length);
            }
        } catch (error) {
            console.error('[TranslationPiP] ✗ Error loading history:', error);
        }
    }
	
    /**
     * Handle click on export history button (THÊM MỚI)
     */
    handleExportHistory() {
        if (!this.historyManager) {
            this.showNotification('Lỗi: Không tìm thấy trình quản lý lịch sử', 'error');
            return;
        }
        const history = this.historyManager.getHistory();
        if (history.length === 0) {
            this.showNotification('Chưa có lịch sử để xuất', 'error');
            return;
        }
        
        // ===================================================================
        // ✅ BẮT ĐẦU SỬA ĐỔI: Thêm 2 định dạng mới
        // ===================================================================
        const formats = [
            { label: '📄 Google Doc', value: 'gdoc' },
            { label: '📝 Text', value: 'txt' },
            { label: '📋 JSON', value: 'json' },
            { label: '📃 Markdown', value: 'md' }
        ];
        // ===================================================================
        // ✅ KẾT THÚC SỬA ĐỔI
        // ===================================================================

        // Tái sử dụng hàm showFormatDialog (đã có sẵn trong summaryrenderer.js)
        if (this.summaryRenderer && typeof this.summaryRenderer.showFormatDialog === 'function') {
            this.summaryRenderer.showFormatDialog(formats, (format) => {
                this.downloadHistory(history, format);
            });
        } else {
            // Fallback: Nếu không tìm thấy, tải thẳng .txt
            console.warn('[TranslationPiP] Không tìm thấy showFormatDialog, tải thẳng .txt');
            this.downloadHistory(history, 'txt');
        }
    }

    /**
     * Download history in specified format (THÊM MỚI)
     */
    downloadHistory(history, format) {
        let content, filename, mimeType;
        const timestamp = new Date().toISOString().split('T')[0];

        // ===================================================================
        // ✅ BẮT ĐẦU SỬA ĐỔI: Thêm case 'gdoc' và 'md'
        // ===================================================================
        if (format === 'gdoc') {
            console.log('[TranslationPiP] Exporting history to Google Doc...');
            // Gọi hàm mới mà chúng ta sẽ thêm bên dưới
            this.exportHistoryToGoogleDoc(history);
            return; // Dừng tại đây, vì hàm export gdoc tự xử lý
        }
        // ===================================================================
        // ✅ KẾT THÚC SỬA ĐỔI (PHẦN 1)
        // ===================================================================

        if (format === 'json') {
            content = JSON.stringify(history, null, 2);
            filename = `meeting-history-${timestamp}.json`;
            mimeType = 'application/json';
        // ===================================================================
        // ✅ BẮT ĐẦU SỬA ĐỔI: Thêm case 'md'
        // ===================================================================
        } else if (format === 'md') {
            content = this.formatHistoryAsMarkdown(history); // Gọi hàm mới
            filename = `meeting-history-${timestamp}.md`;
            mimeType = 'text/markdown';
        // ===================================================================
        // ✅ KẾT THÚC SỬA ĐỔI (PHẦN 2)
        // ===================================================================
        } else {
            // Mặc định là 'txt'
            content = this.formatHistoryAsText(history);
            filename = `meeting-history-${timestamp}.txt`;
            mimeType = 'text/plain';
        }

        // Create and trigger download
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        console.log(`[TranslationPiP] 📥 Exported history as ${format}`);
        this.showNotification(`✓ Đã xuất lịch sử ra file .${format}`, 'success');
    }

    /**
     * Format history as plain text (THÊM MỚI)
     */
    formatHistoryAsText(history) {
        let txt = `LỊCH SỬ HỘI THOẠI\n`;
        txt += `${'='.repeat(50)}\n`;
        txt += `Ngày: ${new Date().toLocaleString('vi-VN')}\n`;
        txt += `Tổng số mục: ${history.length}\n\n`;
        
        history.forEach((entry, i) => {
            const time = new Date(entry.timestamp).toLocaleTimeString('vi-VN');
            txt += `[${i + 1}] ${time} | ${entry.speaker}:\n`;
            
            // LƯU Ý: historymanager.js (dòng 86) đã lưu tiếng Việt vào 'original'
            txt += `${entry.original.trim()}\n\n`; 
        });
        
        return txt;
    }
	
	/**
     * Format history as Markdown (HÀM MỚI)
     */
    formatHistoryAsMarkdown(history) {
        let md = `# Lịch sử hội thoại\n\n`;
        md += `*Ngày: ${new Date().toLocaleString('vi-VN')}*\n`;
        md += `*Tổng số mục: ${history.length}*\n\n---\n\n`;
        
        history.forEach((entry, i) => {
            const time = new Date(entry.timestamp).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit'
            });
            // Lưu ý: entry.original đã được historymanager.js lưu là tiếng Việt
            md += `**[${time}] ${entry.speaker}:**\n`;
            md += `${entry.original.trim()}\n\n`; 
        });
        
        return md;
    }

    /**
     * Export history to Google Doc (cho Lịch sử hội thoại)
     * ✅ ĐÃ SỬA: Sử dụng setMainStatus
     */
    async exportHistoryToGoogleDoc(history) {
        // Tái sử dụng trình kết xuất tóm tắt CHỈ để hiển thị popup KẾT QUẢ
        if (!this.summaryRenderer) {
            this.showNotification('Lỗi: Không tìm thấy trình quản lý giao diện', 'error');
            return;
        }

        // Ghi lại trạng thái ban đầu để khôi phục
        const originalStatus = this.container.querySelector('#statusText').textContent;
        
        try {
            // 1. HIỂN THỊ TRẠNG THÁI CHÍNH
            this.setMainStatus('Đang tạo Google Doc...', 'loading');

            // Khởi tạo exporter nếu chưa có
            if (!window.googleDocsExporter) {
                if (typeof GoogleDocsExporter === 'undefined') {
                    throw new Error('GoogleDocsExporter chưa được load.');
                }
                window.googleDocsExporter = new GoogleDocsExporter();
            }

            // 2. Chuyển lịch sử thành dạng văn bản thô
            const historyText = this.formatHistoryAsText(history);
            const title = `Lịch sử hội thoại - ${new Date().toLocaleDateString('vi-VN')}`;

            // 3. Gọi exporter
            const link = await window.googleDocsExporter.exportRawTextToGoogleDoc(historyText, title);

            // 4. Hiển thị popup chứa link (tái sử dụng từ summaryRenderer)
            this.summaryRenderer.showLinkPopup(link);
            
            // 5. CẬP NHẬT TRẠNG THÁI CHÍNH (Thành công)
            this.setMainStatus('✓ Google Doc đã tạo', 'success');
            setTimeout(() => this.setMainStatus(originalStatus, 'success'), 3000); // Reset sau 3s

        } catch (error) {
            console.error('[TranslationPiP] ✗ Google Doc export failed:', error);
            
            // 6. CẬP NHẬT TRẠNG THÁI CHÍNH (Lỗi)
            this.setMainStatus(`Lỗi: ${error.message}`, 'error');
            setTimeout(() => this.setMainStatus(originalStatus, 'error'), 5000); // Reset sau 5s
        }
    }

/**
 * Initialize HistoryManager and SummaryRenderer
 */
async initManagers() {
    console.log('[TranslationPiP] 🔧 Initializing managers...');
    
    // Init HistoryManager
    if (typeof HistoryManager !== 'undefined') {
        try {
            this.historyManager = new HistoryManager({
                minSpeakerDuration: this.settings.minSpeakerDuration || 3000,
                maxLiveBufferAge: this.settings.maxBufferAge || 10000,
                autosaveInterval: 30000,
                storageKey: 'meetTranslationHistory'
            });
            
            // Set callbacks
            this.historyManager.setOnHistoryUpdate((history) => {
                this.conversationHistory = history;
                this.renderHistory();
            });
            
            // (ĐOẠN NÀY ĐÃ SỬA Ở BƯỚC TRƯỚC - Giữ nguyên)
            this.historyManager.setOnLiveBufferUpdate((buffer) => {
               /*
                if (buffer.speaker && buffer.original) {
                    // ... (code đã comment out) ...
                }
                */
               console.log('[PipWindow] HistoryManager buffer updated (Live UI update skipped)');
            });
            
            // ✅ CLEAR history cho session mới thay vì load history cũ
            await this.historyManager.clearHistory();
            console.log('[TranslationPiP] ✓ History cleared for new session');
            
            // Make global for SummaryRenderer
            window.historyManager = this.historyManager;
            
            console.log('[TranslationPiP] ✓ HistoryManager initialized');
        } catch (error) {
            console.error('[TranslationPiP] ✗ HistoryManager init failed:', error);
        }
    } else {
        console.warn('[TranslationPiP] ⚠ HistoryManager class not found');
    }
    
    // Init SummaryRenderer with delay to ensure DOM is ready
    if (typeof SummaryRenderer !== 'undefined') {
        setTimeout(() => {
            try {
                const summaryTab = this.container?.querySelector('#summaryTab');
                if (summaryTab) {
                    // --- SỬA LỖI: Truyền this.summarizerManager ---
                    this.summaryRenderer = new SummaryRenderer('summaryTab', this.summarizerManager, this); // 'this' là pipWindow
                    console.log('[TranslationPiP] ✓ SummaryRenderer initialized');
                } else {
                    console.warn('[TranslationPiP] ⚠ #summaryTab not found');
                }
            } catch (error) {
                console.error('[TranslationPiP] ✗ SummaryRenderer init failed:', error);
            }
        }, 500);
    } else {
        console.warn('[TranslationPiP] ⚠ SummaryRenderer class not found');
    }
}

    /**
     * ═══════════════════════════════════════════════════════════════
     * SETTINGS
     * ═══════════════════════════════════════════════════════════════
     */

    /**
     * Load settings
     */
    async loadSettings() {
        try {
            const result = await chrome.storage.local.get(['pipSettings', 'meetFilterSettings']);
            
            if (result.pipSettings) {
                this.settings = { ...this.settings, ...result.pipSettings };
            }
            
            if (result.meetFilterSettings) {
                this.settings.minLength = result.meetFilterSettings.minLength || 5;
                this.settings.debounceMs = result.meetFilterSettings.debounceMs || 500;
            }

            // Update UI
            this.updateSettingsUI();
            this.applySettings();

            console.log('[TranslationPiP] ✓ Settings loaded:', this.settings);

        } catch (error) {
            console.error('[TranslationPiP] ✗ Error loading settings:', error);
        }
    }

    /**
     * Update settings UI
     */
    updateSettingsUI() {
        if (!this.container) return;

        try {
            // Cài đặt Dịch
            this.container.querySelector('#targetLang').value = this.settings.targetLanguage || 'vi';

            // Cài đặt Lịch sử
            // ĐÃ XÓA minSpeakerDuration
            this.container.querySelector('#maxBufferAge').value = this.settings.maxBufferAge || 10000;
            this.container.querySelector('#autosaveHistory').checked = this.settings.saveHistory !== false; // Mặc định là true

            // Cài đặt Hiển thị
            this.container.querySelector('#fontSize').value = this.settings.fontSize || 'medium';
            this.container.querySelector('#showTimestamps').checked = this.settings.showTimestamps === true; // Mặc định là false
            
            console.log('[TranslationPiP] ✓ Đã cập nhật UI settings (đã dọn dẹp)');
            
        } catch (error) {
            console.error('[TranslationPiP] ✗ Lỗi khi cập nhật UI settings:', error);
            // Lỗi có thể do ID không khớp (nếu HTML chưa được cập nhật)
        }
    }

    /**
     * Save settings
     */
    async saveSettings() {
        try {
            // Đọc từ UI (đã loại bỏ minSpeakerDuration)
            const targetLanguage = this.container.querySelector('#targetLang').value;
            const maxBufferAge = parseInt(this.container.querySelector('#maxBufferAge').value);
            const autosaveHistory = this.container.querySelector('#autosaveHistory').checked;
            const fontSize = this.container.querySelector('#fontSize').value;
            const showTimestamps = this.container.querySelector('#showTimestamps').checked;
            
            // Cập nhật settings
            this.settings = {
                ...this.settings,
                targetLanguage: targetLanguage,
                // ĐÃ XÓA minSpeakerDuration
                maxBufferAge: maxBufferAge,
                saveHistory: autosaveHistory,
                fontSize: fontSize,
                showTimestamps: showTimestamps
            };

            // Chỉ gửi cài đặt "CÓ ẢNH HƯỞNG" (maxBufferAge) đến HistoryManager
            if (this.historyManager) {
                this.historyManager.updateSettings({
                    maxLiveBufferAge: maxBufferAge
                });
            }

            // Lưu vào storage
            await chrome.storage.local.set({
                pipSettings: this.settings
            });

            // Áp dụng
            this.applySettings();
            this.showNotification('✓ Đã lưu cài đặt');
            console.log('[TranslationPiP] ✓ Settings saved (đã dọn dẹp):', this.settings);

        } catch (error) {
            console.error('[TranslationPiP] ✗ Error saving settings:', error);
            this.showNotification('✗ Lỗi khi lưu cài đặt', 'error');
        }
    }

    /**
     * Apply settings to UI
     */
    applySettings() {
        if (!this.container) return;

        // Áp dụng Cỡ chữ
        const pipBody = this.container.querySelector('.pip-body');
        if (pipBody) {
            // Xóa các class cũ
            pipBody.classList.remove('font-small', 'font-medium', 'font-large');
            // Thêm class mới
            if (this.settings.fontSize === 'small') pipBody.classList.add('font-small');
            else if (this.settings.fontSize === 'large') pipBody.classList.add('font-large');
            else pipBody.classList.add('font-medium'); // Mặc định
        }
        
        // Áp dụng Hiển thị timestamp (nếu logic này tồn tại trong CSS)
        this.container.classList.toggle('show-timestamps', this.settings.showTimestamps);

        // Cập nhật ngôn ngữ (không còn hiển thị trên UI chính)
        // const targetLangDisplay = this.container.querySelector('#targetLanguage');
        // ...
    }

    /**
     * Apply theme
     */
    async applyTheme() {
        try {
            const data = await chrome.storage.local.get('theme');
            const theme = (data.theme === 'dark') ? 'dark' : 'light';

            if (this.container) {
                this.container.setAttribute('data-theme', theme);
                console.log('[TranslationPiP] ✓ Theme applied:', theme);
            }
        } catch (error) {
            console.error('[TranslationPiP] ✗ Error applying theme:', error);
            if (this.container) {
                this.container.setAttribute('data-theme', 'light');
            }
        }
    }

	/**
     * ═══════════════════════════════════════════════════════════════
     * MODEL WINNER UPDATES
     * ═══════════════════════════════════════════════════════════════
     */
    
    /**
     * Update winner model display in status bar
     * @param {string} fullModelId - Tên model đầy đủ (e.g., "openai/gpt-4o-mini")
     */
    updateWinnerModel(fullModelId) {
        // 1. Tìm element (mà chúng ta đã thêm trong pip-window.html)
        const modelEl = this.container?.querySelector('#modelWinnerDisplay');
        if (!modelEl) return;
        
        if (fullModelId) {
            // 2. (ĐÃ SỬA) Không lấy tên ngắn gọn nữa
            // const shortName = fullModelId.split('/').pop(); // BỎ DÒNG NÀY
            
            // 3. (ĐÃ SỬA) Cập nhật nội dung bằng TÊN ĐẦY ĐỦ
            modelEl.textContent = `⚡ ${fullModelId}`;
            
            // 4. Apply style (nhỏ, mờ, in nghiêng, lệch phải)
            modelEl.style.cssText = `
                margin-left: auto !important; /* Đẩy sang phải */
                font-size: var(--font-xs) !important;
                font-style: italic !important;
                opacity: 0.6 !important; /* Mờ */
                display: inline !important;
                padding-left: 10px;
                color: var(--text-secondary);
            `;
        } else {
            // Ẩn đi nếu không có model
            modelEl.textContent = '';
            modelEl.style.display = 'none';
            modelEl.removeAttribute('style');
        }
        console.log(`[TranslationPiP] Updated winner model display: ${fullModelId || 'None'}`);
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * DRAG & RESIZE
     * ═══════════════════════════════════════════════════════════════
     */

    makeDraggable() {
        const header = this.container.querySelector('.pip-header');
        if (!header) return;

        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('.control-btn')) return;
            
            this.isDragging = true;
            const rect = this.container.getBoundingClientRect();
            this.dragOffset = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            
            document.addEventListener('mousemove', this.handleDrag);
            document.addEventListener('mouseup', this.handleDragEnd);
        });
    }

    handleDrag = (e) => {
        if (!this.isDragging) return;
        
        const x = e.clientX - this.dragOffset.x;
        const y = e.clientY - this.dragOffset.y;

        // --- BẮT ĐẦU SỬA LỖI (BẢN VÁ CUỐI) ---
        // Chúng ta phải dùng setProperty với '!important'
        // để "thắng" được các quy tắc !important trong file CSS.
        
        // Ghi đè TOP
        this.container.style.setProperty('top', `${y}px`, 'important');
        
        // Ghi đè LEFT
        this.container.style.setProperty('left', `${x}px`, 'important');
        
        // Hủy bỏ RIGHT và BOTTOM để cửa sổ không bị kẹt
        this.container.style.setProperty('right', 'auto', 'important');
        this.container.style.setProperty('bottom', 'auto', 'important');
        
        // Hủy bỏ TRANSFORM (để chắc chắn)
        this.container.style.setProperty('transform', 'none', 'important');
        // --- KẾT THÚC SỬA LỖI ---
    }

    handleDragEnd = () => {
        this.isDragging = false;
        document.removeEventListener('mousemove', this.handleDrag);
        document.removeEventListener('mouseup', this.handleDragEnd);
    }

    makeResizable() {
        const handle = this.container.querySelector('.pip-resize-handle');
        if (!handle) {
            console.warn('[TranslationPiP] ⚠️ Không tìm thấy .pip-resize-handle');
            return;
        }

        let isResizing = false;
        let startX, startY, startWidth, startHeight;

        handle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = this.container.offsetWidth;
            startHeight = this.container.offsetHeight;
            
            document.addEventListener('mousemove', handleResize);
            document.addEventListener('mouseup', handleResizeEnd);
            e.preventDefault();
        });

        const handleResize = (e) => {
            if (!isResizing) return;
            
            const width = startWidth + (e.clientX - startX);
            const height = startHeight + (e.clientY - startY);

            // --- BẮT ĐẦU SỬA LỖI (QUAN TRỌNG) ---
            // Phải dùng setProperty với !important để thắng file CSS
            const newWidth = Math.max(350, width);
            const newHeight = Math.max(300, height);
            
            this.container.style.setProperty('width', `${newWidth}px`, 'important');
            this.container.style.setProperty('height', `${newHeight}px`, 'important');
            
            // (SỬA LỖI MỚI) Ghi đè cả max-width và max-height
            this.container.style.setProperty('max-width', `${newWidth}px`, 'important');
            this.container.style.setProperty('max-height', 'none', 'important');
            // --- KẾT THÚC SỬA LỖI ---
        };

        const handleResizeEnd = () => {
            isResizing = false;
            document.removeEventListener('mousemove', handleResize);
            document.removeEventListener('mouseup', handleResizeEnd);
        };
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * UTILITIES
     * ═══════════════════════════════════════════════════════════════
     */

    toggleMinimize() {
        this.isMinimized = !this.isMinimized;
        
        if (this.isMinimized) {
            this.container.classList.add('minimized');
        } else {
            this.container.classList.remove('minimized');
        }
        
        console.log('[TranslationPiP] Minimized:', this.isMinimized);
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'error' ? '#ea4335' : '#34a853'};
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000000;
            font-family: var(--font-family-google, 'Google Sans', 'Roboto', Arial, sans-serif);
            font-size: var(--font-base);
            font-weight: 500;
            animation: slideDown 0.3s ease-out;
        `;
        notification.textContent = message;

        // ✅ Append notification vào shadow container hoặc body
        if (this.shadowContainer && this.shadowContainer.container) {
            this.shadowContainer.container.appendChild(notification);
        } else {
            document.body.appendChild(notification);
        }

        setTimeout(() => {
            notification.style.animation = 'slideUp 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }
	
	/**
     * Cập nhật thanh trạng thái chính (ở dưới cùng của PiP)
     * @param {string} text - Nội dung hiển thị
     * @param {string} type - 'info', 'loading', 'success', 'error'
     */
    setMainStatus(text, type = 'info') {
        if (!this.container) return;

        const statusTextEl = this.container.querySelector('#statusText');
        const statusIndicatorEl = this.container.querySelector('#statusIndicator');

        if (statusTextEl) {
            statusTextEl.textContent = text;
        }

        if (statusIndicatorEl) {
            // Cập nhật màu của chấm tròn
            // (Bạn có thể dùng các biến CSS trong pip-window.css nếu muốn)
            let color = '#5f6368'; // Mặc định (info)
            if (type === 'loading') {
                color = '#fbbc04'; // Vàng (Warning)
            } else if (type === 'success') {
                color = '#34a853'; // Xanh lá
            } else if (type === 'error') {
                color = '#ea4335'; // Đỏ
            }
            statusIndicatorEl.style.background = color;
        }
    }

    hide() {
    // ✅ Check if container exists in shadow DOM or body
    const containerExists = this.shadowContainer 
        ? this.shadowContainer.container.contains(this.container)
        : (this.container && document.body.contains(this.container));
    
    if (containerExists) {
        this.container.style.setProperty('display', 'none', 'important');
        console.log('[TranslationPiP] ✓ Window hidden (translation still running)');
    }
}

isVisible() {
    // ✅ Check if container exists in shadow DOM or body
    const containerExists = this.shadowContainer 
        ? this.shadowContainer.container.contains(this.container)
        : (this.container && document.body.contains(this.container));
    
    return containerExists && this.container.style.display !== 'none';
}

    remove() {
        if (this.container) {
            this.container.remove();
            this.container = null;
            console.log('[TranslationPiP] ✓ Window removed');
        }
        // ✅ Cleanup shadow container nếu có
        if (this.shadowContainer && this.shadowContainer.host && this.shadowContainer.host.parentNode) {
            this.shadowContainer.host.parentNode.removeChild(this.shadowContainer.host);
            this.shadowContainer = null;
        }

        if (this.themeChangeListener) {
            chrome.storage.onChanged.removeListener(this.themeChangeListener);
            this.themeChangeListener = null;
        }
    }

    onClose(callback) {
        this.closeCallback = callback;
    }

    destroy() {
        this.remove();
        console.log('[TranslationPiP] ✓ Destroyed');
    }

    getSettings() {
        return { ...this.settings };
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TranslationPiPWindow;
}

window.TranslationPiPWindow = TranslationPiPWindow;
console.log('[TranslationPiP] ✓ Module loaded');
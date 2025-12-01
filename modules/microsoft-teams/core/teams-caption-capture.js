/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  TEAMS CAPTION CAPTURE - PHIÊN BẢN SỬA LỖI (21/10/2025)         │
 * │  Đã sửa lỗi logic buffer và cập nhật selectors V2                │
 * └─────────────────────────────────────────────────────────────────┘
 */

class TeamsCaptionCapture {
    constructor() {
        this.isCapturing = false;
        this.captions = [];
        this.captionObserver = null;
        this.lastCaptionText = '';
        this.callbacks = {
            onCaption: null,
            onSpeakerChange: null
        };
        this.currentSpeaker = null;
        this.captionObserverTarget = null;
        
        // --- SỬA LỖI: BỘ ĐỆM (BUFFER) ---
        // Chúng ta không dùng logic buffer phức tạp nữa.
        // Chúng ta sẽ dùng logic "chờ 1.5s rồi đọc text cuối cùng".
        this.debounceTimer = null;
        this.debounceTime = 500; // Chờ 0.5 giây sau lần thay đổi cuối cùng
        this.lastProcessedNode = null; // Node (span) cuối cùng đã thay đổi

        // --- SỬA LỖI: SELECTORS V2 ---
        // (Sử dụng selector từ file constants.js)
        this.SELECTORS = window.TeamsConstants?.selectors || {
            // Selector cho container chứa toàn bộ các dòng phụ đề
            captionContainer: 'div[data-tid="captions-container"], div[data-tid="closed-caption-v2-virtual-list-content"]', 
            
            // Selector cho tên người nói (bên trong một dòng phụ đề)
            speakerName: '[data-tid="caption-speaker-name"], [data-tid="author"]', 
            
            // Selector cho văn bản phụ đề (bên trong một dòng phụ đề)
            captionText: '[data-tid="caption-text"], [data-tid="closed-caption-text"]',
            
            // (Giữ lại để kiểm tra)
            ccButton: '[data-tid="toggle-captions-button"]'
        };
    }

    /**
     * Bắt đầu capture captions
     */
    async start() {
        if (this.isCapturing) {
            console.log('[TeamsCaptionCapture] Already capturing');
            return { success: true };
        }
        console.log('[TeamsCaptionCapture] Starting capture...');

        const captionsEnabled = await this.checkCaptionsEnabled();
        
        if (!captionsEnabled) {
            console.log('[TeamsCaptionCapture] ⚠️ Captions not enabled or container not found');
            // (Lưu ý: 'Captions not enabled' được coi là error code, không phải văn bản dịch)
            return { success: false, error: 'Captions not enabled', waitForCaptions: true };
        }

        this.observeCaptions();
        this.isCapturing = true;
        console.log('[TeamsCaptionCapture] Capture started ✅');
        return { success: true };
    }

    /**
     * Dừng capture
     */
    stop() {
        if (!this.isCapturing) return;
        console.log('[TeamsCaptionCapture] Stopping capture...');

        if (this.captionObserver) {
            this.captionObserver.disconnect();
            this.captionObserver = null;
        }
        clearTimeout(this.debounceTimer); // Xóa timer
        this.captionObserverTarget = null;
        this.isCapturing = false;
        console.log('[TeamsCaptionCapture] Capture stopped');
    }

    /**
     * Kiểm tra xem phụ đề đã được bật chưa
     */
    async checkCaptionsEnabled() {
        console.log('[TeamsCaptionCapture] 🔍 Checking captions...');
        const container = document.querySelector(this.SELECTORS.captionContainer);
        if (container) {
            console.log('[TeamsCaptionCapture] ✅ Caption container found.');
            return true;
        }
        console.log('[TeamsCaptionCapture] ⚠️ Caption container NOT found.');
        return false;
    }

    /**
     * Tìm container chứa phụ đề
     */
    findCaptionContainer() {
        console.log('[TeamsCaptionCapture] 🔍 Searching for caption container...');
        const element = document.querySelector(this.SELECTORS.captionContainer);
        
        if (element) {
            console.log(`[TeamsCaptionCapture] ✅ Found primary container: ${this.SELECTORS.captionContainer}`);
            return element;
        }
        
        console.log('[TeamsCaptionCapture] ❌ No caption container found');
        return null;
    }

    /**
     * Bắt đầu theo dõi container phụ đề
     */
    observeCaptions() {
        const captionContainer = this.findCaptionContainer();

        if (!captionContainer) {
            console.error('[TeamsCaptionCapture] ❌ Caption container not found, will retry...');
            setTimeout(() => {
                if (this.isCapturing && !this.captionObserver) {
                    this.observeCaptions();
                }
            }, 2000); // Thử lại sau 2s
            return;
        }
        
        this.captionObserverTarget = captionContainer;
        console.log('[TeamsCaptionCapture] ✅ Observing container:', captionContainer);

        // --- LOGIC OBSERVER MỚI ---
        this.captionObserver = new MutationObserver((mutations) => {
            let captionChanged = false;
            
            for (const mutation of mutations) {
                // 1. Khi text BÊN TRONG một span thay đổi (ví dụ: "Play." -> "Play. OK.")
                if (mutation.type === 'characterData') {
                    // target là text node, parentElement là <span>
                    if (mutation.target.parentElement?.matches(this.SELECTORS.captionText)) {
                        this.lastProcessedNode = mutation.target.parentElement;
                        captionChanged = true;
                    }
                } 
                // 2. Khi một dòng (node) MỚI được thêm vào
                else if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    const lastNode = this.findLastCaptionNode(mutation.addedNodes);
                    if (lastNode) {
                        this.lastProcessedNode = lastNode;
                        captionChanged = true;
                    }
                }
            }

            // Nếu có thay đổi, reset bộ đếm thời gian
            if (captionChanged) {
                this.debounceProcessNode();
            }
        });

        // SỬA LỖI: Phải theo dõi `characterData`
        this.captionObserver.observe(captionContainer, {
            childList: true, 
            subtree: true,
            characterData: true // <-- RẤT QUAN TRỌNG
        });

        // Xử lý các phụ đề đã có sẵn khi load
        const existingNodes = captionContainer.querySelectorAll(this.SELECTORS.captionText);
        if (existingNodes.length > 0) {
            console.log(`[TeamsCaptionCapture] Found ${existingNodes.length} existing captions. Processing last one.`);
            this.lastProcessedNode = existingNodes[existingNodes.length - 1];
            this.debounceProcessNode(); // Xử lý node cuối cùng
        }
    }

    /**
     * HÀM MỚI: Tìm node phụ đề cuối cùng trong danh sách
     */
    findLastCaptionNode(nodeList) {
        let lastNode = null;
        for (let i = nodeList.length - 1; i >= 0; i--) {
            const node = nodeList[i];
            if (node.nodeType !== Node.ELEMENT_NODE) continue;
            
            if (node.matches && node.matches(this.SELECTORS.captionText)) {
                lastNode = node;
                break;
            }
            if (node.querySelector) {
                const allFound = node.querySelectorAll(this.SELECTORS.captionText);
                if (allFound.length > 0) {
                    lastNode = allFound[allFound.length - 1];
                    // (Không break, tiếp tục tìm để đảm bảo lấy node mới nhất)
                }
            }
        }
        return lastNode;
    }

    /**
     * HÀM MỚI: Reset bộ đếm thời gian (debounce)
     */
    debounceProcessNode() {
        clearTimeout(this.debounceTimer);
        
        this.debounceTimer = setTimeout(() => {
            if (this.lastProcessedNode) {
                this.parseAndSubmit(this.lastProcessedNode);
                this.lastProcessedNode = null; 
            }
        }, this.debounceTime);
    }

    /**
     * HÀM MỚI (THAY THẾ): Xử lý Nút DOM cuối cùng
     * (Đã cập nhật để dùng Lang.get)
     */
    parseAndSubmit(captionTextNode) {
        const text = captionTextNode.textContent.trim();

        // 1. Validate
        if (!this.isValidCaptionText(text) || text === this.lastCaptionText) {
            console.log(`[TeamsCaptionCapture] ⏭️ Skipping caption (invalid or duplicate): "${text}"`);
            return; 
        }

        // (Helper function to get language safely)
        const getLang = (key) => (window.Lang ? window.Lang.get(key) : `[${key}]`);
        const unknownSpeaker = getLang('speakerUnknown');

        // 2. Tìm người nói
        let speaker = unknownSpeaker;
        // Dùng class từ HTML bạn gửi: fui-ChatMessageCompact__body
        const chatMessageBody = captionTextNode.closest('.fui-ChatMessageCompact__body'); 
        
        if (chatMessageBody) {
            const speakerEl = chatMessageBody.querySelector(this.SELECTORS.speakerName);
            if(speakerEl) {
                speaker = this.extractSpeaker(speakerEl.textContent);
            }
        }

        // 3. Cập nhật text cuối cùng
        this.lastCaptionText = text;

        if (speaker && speaker !== this.currentSpeaker) {
            this.currentSpeaker = speaker;
            if (this.callbacks.onSpeakerChange) {
                this.callbacks.onSpeakerChange(speaker);
            }
        }

        // 4. Gửi dữ liệu
        const caption = {
            text: text,
            speaker: speaker || this.currentSpeaker || unknownSpeaker,
            timestamp: Date.now()
        };

        this.captions.push(caption);

        if (this.callbacks.onCaption) {
            this.callbacks.onCaption(caption);
        }

        console.log('[TeamsCaptionCapture] 📝✅ FLUSHED Caption:', caption);
    }

    /**
     * Validate văn bản (tái sử dụng từ Meet)
     */
    isValidCaptionText(text) {
        if (!text || text.length < 1) return false; // Giảm xuống 1 (cho "OK.")
        
        const uiPatterns = [
            /^\s*$/,
            /^(unknown|speaker|none|n\/a)$/i
        ];
        if (uiPatterns.some(pattern => pattern.test(text))) {
            return false;
        }
        
        // Cho phép gần như mọi ký tự
        if (!/[a-zA-Z0-9\u00C0-\u1EF9.,?!]/.test(text)) {
            return false;
        }
        return true;
    }
    
    /**
     * Validate tên người nói (tái sử dụng từ Meet)
     */
    isValidSpeakerName(name) {
        if (!name || typeof name !== 'string') return false;
        const trimmed = name.trim();
        if (trimmed.length === 0 || trimmed.length > 50) return false;
        
        const uiPatterns = [
            /^\s*$/,
            /^(unknown|speaker|none|n\/a)$/i
        ];
        if (uiPatterns.some(p => p.test(trimmed))) return false;
        if (!/[a-zA-Z\u00C0-\u1EF9]/.test(trimmed)) return false; // Thêm tiếng Việt
        
        return true;
    }
	
	/**
     * Trích xuất tên người nói (HÀM BỊ THIẾU)
     * (Tái sử dụng từ Meet)
     */
    extractSpeaker(text) {
        if (!this.isValidSpeakerName(text)) {
            return null;
        }
        
        let speakerName = text.trim();
        
        // (Bạn có thể thêm các logic lọc tên cụ thể của Teams ở đây nếu cần)
        // Ví dụ:
        // speakerName = speakerName.replace(' (Guest)', '');
        
        return speakerName;
    }

    /**
     * Đăng ký callback khi có phụ đề mới
     */
    onCaption(callback) {
        this.callbacks.onCaption = callback;
    }

    /**
     * Dọn dẹp
     */
    destroy() {
        this.stop();
        this.clearCaptions();
        this.callbacks = {};
        console.log('[TeamsCaptionCapture] Destroyed');
    }

    /**
     * Xóa bộ nhớ đệm
     */
    clearCaptions() {
        this.captions = [];
        this.lastCaptionText = '';
        this.currentSpeaker = null;
        console.log('[TeamsCaptionCapture] Captions cleared');
    }
}

// Export (để teams-content.js có thể sử dụng)
window.TeamsCaptionCapture = TeamsCaptionCapture;
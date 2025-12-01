/**
 * Caption Capture - FINAL VERSION WITH EXACT SELECTORS
 * ✅ Based on actual HTML inspection: jsname="dsyhDe", class="ygjcle", class="NwpYId"
 * Bắt captions từ Google Meet để dịch và tóm tắt
 */

class CaptionCapture {
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
        this.translatorUI = null;
        this.captionObserverTarget = null;
    }

    cleanCaptionText(element) {
        if (!element) return '';

        // ✅ SỬA LỖI: Dùng querySelectorAll để tìm TẤT CẢ
        const captionTextSelectors = [
            '.ygjcle.VbkSUe',
            '.ygjcle'
        ];

        let captionEl = null;

        for (const selector of captionTextSelectors) {
            // ✅ SỬA LỖI: Lấy TẤT CẢ...
            const elements = element.querySelectorAll(selector);
            if (elements.length > 0) {
                // ...và chọn cái CUỐI CÙNG (mới nhất)
                captionEl = elements[elements.length - 1]; 
                break; // Tìm thấy, không cần lặp nữa
            }
        }

        // Nếu tìm thấy cái cuối cùng
        if (captionEl) {
            const text = captionEl.textContent.trim();
            if (text.length > 0 && !this.containsUIText(text)) {
                // console.log(`[CaptionCapture] ✅ Clean caption (Last): ${text}`);
                return text;
            }
        }

        // Logic fallback (giữ nguyên)
        if (element.classList && element.classList.contains('ygjcle')) {
            const text = element.textContent.trim();
            if (!this.containsUIText(text)) {
                return text;
            }
        }
        
        // --- BẮT ĐẦU SỬA LỖI TREEWALKER ---
        // Logic TreeWalker (ĐÃ SỬA LỖI)
        
        const filter = {
            acceptNode: (node) => {
                if (node.nodeType === Node.TEXT_NODE) {
                    const text = node.textContent.trim();
                    if (text && !this.containsUIText(text)) {
                        return NodeFilter.FILTER_ACCEPT; // Chấp nhận node này
                    }
                }
                return NodeFilter.FILTER_REJECT; // Bỏ qua node này
            }
        };

        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            filter // Sử dụng filter object đã sửa
        );
        
        let cleanText = '';
        let node;
        while (node = walker.nextNode()) {
            cleanText += node.textContent.trim() + ' ';
        }
        // --- KẾT THÚC SỬA LỖI TREEWALKER ---
        
        return cleanText.trim();
    }

// ✅ HÀM MỚI: Kiểm tra có chứa UI text không
containsUIText(text) {
    const uiKeywords = [
        'arrow_downward',
        'arrow_upward', 
        'Jump to bottom',
        'Jump to top',
        'expand_more',
        'expand_less',
        'keyboard_',
        'menu',
        'close',
        'more_vert'
    ];
    
    return uiKeywords.some(keyword => text.includes(keyword));
}

    /**
     * ✅ EXACT: Validate caption text
     */
    isValidCaptionText(text) {
    if (!text || text.length < 2) return false;
    
    // ✅ ENHANCED: Check UI patterns ở BẤT KỲ vị trí nào
    const uiPatterns = [
        /arrow_/i,          // Không cần ^ (đầu dòng)
        /expand_/i,
        /keyboard_/i,
        /jump to/i,         // Thêm
        /\bmenu\b/i,        // Thêm
        /\bclose\b/i,       // Thêm
        /^[A-Z_]+$/,        // ALL_CAPS
        /^\s*$/
    ];
    
    if (uiPatterns.some(pattern => pattern.test(text))) {
        console.log('[CaptionCapture] ⏭️ Filtered UI text:', text.substring(0, 50));
        return false;
    }
    
    // ✅ Phải chứa ít nhất 1 chữ cái hoặc số
    if (!/[a-zA-Z0-9\u00C0-\u1EF9]/.test(text)) {
        return false;
    }
    
    // ✅ Không quá nhiều ký tự đặc biệt liên tiếp
    if (/[^a-zA-Z0-9\s]{4,}/.test(text)) {
        return false;
    }
    
    return true;
}

    /**
     * Bắt đầu capture captions
     */
    async start() {
    if (this.isCapturing) {
        console.log('[CaptionCapture] Already capturing');
        return { success: true };
    }

    console.log('[CaptionCapture] Starting capture...');

    const captionsEnabled = await this.checkCaptionsEnabled();
    
    if (!captionsEnabled) {
        // ✅ Không show guide nữa, để polling tự xử lý
        console.log('[CaptionCapture] ⚠️ Captions not ready yet');
        return { success: false, error: 'Captions not enabled', waitForCaptions: true };
    }

    this.observeCaptions();
    this.isCapturing = true;

    console.log('[CaptionCapture] Capture started ✅');
    return { success: true };
}

    /**
     * Dừng capture
     */
    stop() {
        if (!this.isCapturing) {
            return;
        }

        console.log('[CaptionCapture] Stopping capture...');

        if (this.captionObserver) {
            this.captionObserver.disconnect();
            this.captionObserver = null;
        }
        this.captionObserverTarget = null;

        this.isCapturing = false;
        console.log('[CaptionCapture] Capture stopped');
    }

    /**
     * ✅ FIXED: Check captions enabled with exact selectors
     */
    async checkCaptionsEnabled() {
    console.log('[CaptionCapture] 🔍 Checking captions...');
    
    // ✅ PRIORITY 1: Check CC button state FIRST
    const ccButtonSelectors = [
        '[aria-label*="caption" i]',
        '[aria-label*="phụ đề" i]',
        '[aria-label*="Turn on captions" i]',
        '[aria-label*="Bật phụ đề" i]'
    ];
    
    for (const selector of ccButtonSelectors) {
        const ccButton = document.querySelector(selector);
        if (ccButton) {
            const isPressed = ccButton.getAttribute('aria-pressed') === 'true';
            const ariaLabel = ccButton.getAttribute('aria-label') || '';
            
            console.log(`[CaptionCapture] CC button found:`, {
                selector,
                isPressed,
                ariaLabel: ariaLabel.substring(0, 50)
            });
            
            // Nếu button ở trạng thái "ON"
            if (isPressed || ariaLabel.toLowerCase().includes('turn off') || ariaLabel.includes('Tắt')) {
                console.log('[CaptionCapture] ✅ CC is ENABLED (button check)');
                return true;
            }
        }
    }
    
    // ✅ PRIORITY 2: Check for caption container
    const captionSelectors = [
        '[jsname="dsyhDe"]',
        '.iOzk7',
        '[jscontroller="qW5N0c"]'
    ];
    
    for (const selector of captionSelectors) {
        const element = document.querySelector(selector);
        if (element) {
            console.log(`[CaptionCapture] ✅ Caption container found: ${selector}`);
            return true;
        }
    }
    
    // ✅ Check "turned off" message LAST (not first)
    const bodyText = document.body.textContent;
    const turnedOffIndicators = [
        'Live captions have been turned off',
        'Chủ thích trực tiếp đã bị tắt'
    ];
    
    for (const indicator of turnedOffIndicators) {
        if (bodyText.includes(indicator)) {
            console.log('[CaptionCapture] ❌ Captions explicitly turned OFF');
            return false;
        }
    }

    console.log('[CaptionCapture] ⚠️ Captions status unclear');
    return false;
}

    /**
     * Hiển thị hướng dẫn bật captions
     * (Đã cập nhật để dùng Lang.get)
     */
    showCaptionsGuide() {
        console.log('[CaptionCapture] Showing captions guide...');
        
        // Kiểm tra Lang service đã sẵn sàng chưa
        const getLang = (key) => (window.Lang ? window.Lang.get(key) : `[${key}]`);

        try {
            if (typeof TranslatorUI !== 'undefined') {
                if (!this.translatorUI) {
                    this.translatorUI = new TranslatorUI();
                }
                // Giả sử TranslatorUI.showCaptionsGuidance() đã được i18n
                this.translatorUI.showCaptionsGuidance();
                return;
            }
        } catch (e) {
            console.error('[CaptionCapture] TranslatorUI failed:', e);
        }

        // Fallback UI
        const existingGuide = document.getElementById('meetCaptionsGuide');
        if (existingGuide) return;

        const guide = document.createElement('div');
        guide.id = 'meetCaptionsGuide';
        guide.innerHTML = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 24px;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                z-index: 10000;
                max-width: 400px;
                font-family: 'Google Sans', Arial, sans-serif;
            ">
                <h3 style="margin: 0 0 16px 0; font-size: 20px; color: #202124;">
                    ${getLang('guideCaptionTitle')}
                </h3>
                <p style="margin: 0 0 16px 0; font-size: 14px; color: #5f6368; line-height: 1.5;">
                    ${getLang('guideCaptionDesc')}
                </p>
                <ol style="margin: 0 0 16px 0; padding-left: 20px; font-size: 14px; color: #202124;">
                    <li style="margin-bottom: 8px;">${getLang('guideCaptionStep1')}</li>
                    <li style="margin-bottom: 8px;">${getLang('guideCaptionStep2')}</li>
                    <li>${getLang('guideCaptionStep3')}</li>
                </ol>
                <button onclick="document.getElementById('meetCaptionsGuide').remove()" style="
                    background: #f86a01;
                    color: white;
                    border: none;
                    padding: 10px 24px;
                    border-radius: 4px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    width: 100%;
                ">
                    ${getLang('guideCaptionButton')}
                </button>
            </div>
            <div onclick="document.getElementById('meetCaptionsGuide').remove()" style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                z-index: 9999;
            "></div>
        `;

        document.body.appendChild(guide);
    }

    /**
     * Observe captions
     */
    observeCaptions() {
    const captionContainer = this.findCaptionContainer();

    if (!captionContainer) {
        console.error('[CaptionCapture] ❌ Caption container not found, will retry...');
        
        // ✅ Retry sau 1 giây nếu không tìm thấy
        setTimeout(() => {
            if (this.isCapturing && !this.captionObserver) {
                console.log('[CaptionCapture] 🔄 Retrying to find caption container...');
                this.observeCaptions();
            }
        }, 1000);
        
        return;
    }
    
    this.captionObserverTarget = captionContainer;
    console.log('[CaptionCapture] ✅ Observing container:', captionContainer);

    this.captionObserver = new MutationObserver((mutations) => {
        this.processCaptionMutations(mutations);
    });

    this.captionObserver.observe(captionContainer, {
        childList: true,
        subtree: true,
        characterData: true
    });

    this.processCaptionElement(captionContainer);
}

    /**
     * ✅ EXACT: Find caption container with verification
     */
    findCaptionContainer() {
    console.log('[CaptionCapture] 🔍 Searching for caption container...');
    
    // ✅ PRIORITY 1: Tìm container theo jsname (chính xác nhất)
    const primarySelectors = [
        '[jsname="dsyhDe"]',
        'div[jsname="dsyhDe"]'
    ];
    
    for (const selector of primarySelectors) {
        const element = document.querySelector(selector);
        if (element) {
            console.log(`[CaptionCapture] ✅ Found primary container: ${selector}`);
            return element;
        }
    }
    
    // ✅ PRIORITY 2: Tìm theo class và controller
    const secondarySelectors = [
        '.iOzk7',
        'div.iOzk7',
        '[jscontroller="qW5N0c"]'
    ];
    
    for (const selector of secondarySelectors) {
        const element = document.querySelector(selector);
        if (element) {
            // Kiểm tra xem có phải là caption container không
            const hasJsName = element.hasAttribute('jsname');
            const hasAriaLive = element.hasAttribute('aria-live');
            
            if (hasJsName || hasAriaLive) {
                console.log(`[CaptionCapture] ✅ Found secondary container: ${selector}`);
                return element;
            }
        }
    }
    
    // ✅ PRIORITY 3: Tìm theo aria-live (fallback)
    const fallbackSelectors = [
        '[aria-live="polite"][jsname]',
        '[aria-live="polite"]'
    ];
    
    for (const selector of fallbackSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
            // Kiểm tra xem có phải container caption không
            const hasJsName = element.hasAttribute('jsname');
            const hasCaptionClass = element.className.includes('iOzk7') || 
                                   element.querySelector('[class*="ygjcle"]');
            
            if (hasJsName || hasCaptionClass) {
                console.log(`[CaptionCapture] ✅ Found fallback container: ${selector}`);
                return element;
            }
        }
    }
    
    // ✅ PRIORITY 4: Tìm bất kỳ element nào có .ygjcle bên trong
    console.log('[CaptionCapture] 🔍 Searching by caption text elements...');
    const captionTextElements = document.querySelectorAll('.ygjcle');
    
    if (captionTextElements.length > 0) {
        // Lấy container cha gần nhất
        let container = captionTextElements[0].parentElement;
        while (container && !container.hasAttribute('jsname')) {
            container = container.parentElement;
            if (container === document.body) break;
        }
        
        if (container && container !== document.body) {
            console.log('[CaptionCapture] ✅ Found container via caption text element');
            return container;
        }
    }

    console.log('[CaptionCapture] ❌ No caption container found');
    return null;
}

    /**
     * Process mutations
     */
    processCaptionMutations(mutations) {
        for (const mutation of mutations) {
            if (mutation.target.nodeType === Node.TEXT_NODE) {
                this.processCaptionElement(mutation.target.parentElement);
            } else {
                this.processCaptionElement(mutation.target);
            }
        }
    }

    /**
     * ✅ FIXED: Process caption element with cleaned text
     * (Đã cập nhật để dùng Lang.get)
     */
    processCaptionElement(element) {
        if (!element) return;

        const observedContainer = this.captionObserverTarget;
        if (!observedContainer || !observedContainer.contains(element)) {
            return;
        }

        // ✅ Use cleaned text from .ygjcle
        const text = this.cleanCaptionText(element);

        if (!this.isValidCaptionText(text)) {
            return;
        }

        if (text === this.lastCaptionText) {
            return;
        }

        // Extract speaker
        const speaker = this.extractSpeaker(element);

        if (speaker && speaker !== this.currentSpeaker) {
            this.currentSpeaker = speaker;
            if (this.callbacks.onSpeakerChange) {
                this.callbacks.onSpeakerChange(speaker);
            }
        }
        
        // Kiểm tra Lang service đã sẵn sàng chưa
        const getLang = (key) => (window.Lang ? window.Lang.get(key) : `[${key}]`);
        const unknownSpeaker = getLang('speakerUnknown');

        // Save caption
        const caption = {
            text: text,
            speaker: speaker || this.currentSpeaker || unknownSpeaker,
            timestamp: Date.now(),
            time: new Date().toISOString()
        };

        this.captions.push(caption);
        this.lastCaptionText = text;

        if (this.callbacks.onCaption) {
            this.callbacks.onCaption(caption);
        }

        console.log('[CaptionCapture] 📝 Caption:', caption);
    }

    /**
     * ✅ FIXED: Selector chính xác là .NMpYId (chữ M không phải w)
     */

    extractSpeaker(element) {
        if (!element) return null;
        
        try {
            const speakerSelectors = [
                '.NWpY1d',
                'span.NWpY1d',
                '[class*="NWpY1d"]'
            ];
            
            // --- BẮT ĐẦU METHOD 1 (FIXED v4) ---
            // Logic mới: Tìm speaker CUỐI CÙNG trong container
            
            let speakerEl = null;
            
            for (const selector of speakerSelectors) {
                // ✅ SỬA LỖI: Lấy TẤT CẢ...
                const elements = element.querySelectorAll(selector);
                if (elements.length > 0) {
                     // ...và chọn cái CUỐI CÙNG (mới nhất)
                    speakerEl = elements[elements.length - 1];
                    // (Không break, để lặp qua các selector khác nếu cần)
                }
            }
            
            if (speakerEl) {
                const name = speakerEl.textContent.trim();
                if (this.isValidSpeakerName(name)) {
                    console.log(`[CaptionCapture] ✅ Speaker (Last): "${name}"`);
                    return name;
                }
            }
            // --- KẾT THÚC METHOD 1 (FIXED v4) ---
            
            // --- METHOD 2 (ARIA-LABEL) ---
            // Logic này vẫn quan trọng để bắt "You"
            let parent = element.parentElement; // (Giả sử element là text span)
            
            // Nếu Method 1 thất bại, thử tìm từ aria-label
            // (Đi lên 5 cấp từ chính element được mutate)
            for (let i = 0; i < 5 && parent; i++) {
                const ariaLabel = parent.getAttribute('aria-label');
                if (ariaLabel) {
                    const match = ariaLabel.match(/^(.+?)\s+(?:said|nói|says):/i);
                    if (match && this.isValidSpeakerName(match[1].trim())) {
                        console.log(`[CaptionCapture] ✅ Speaker via aria: "${match[1].trim()}"`);
                        return match[1].trim();
                    }
                }
                parent = parent.parentElement;
            }

        } catch (error) {
            console.error('[CaptionCapture] ❌ Error:', error);
        }
        
        console.warn('[CaptionCapture] ⚠️ Speaker not found, using current:', this.currentSpeaker);
        return null; // Trả về null để dùng this.currentSpeaker
    }
    
    /**
     * Validate speaker name (filter UI elements)
     */
    isValidSpeakerName(name) {
        if (!name || typeof name !== 'string') return false;
        
        const trimmed = name.trim();
        
        // Quá ngắn hoặc quá dài
        if (trimmed.length === 0 || trimmed.length > 50) return false;
        
        // UI text patterns cần bỏ qua
        const uiPatterns = [
            /^(arrow_|expand_|keyboard_|jump to|close|more|settings)/i,
            /^[A-Z_]{3,}$/,  // ALL_CAPS_WITH_UNDERSCORES
            /^\s*$/,
            /^(unknown|speaker|none|n\/a)$/i
        ];
        
        if (uiPatterns.some(p => p.test(trimmed))) return false;
        
        // Phải chứa ít nhất 1 chữ cái
        if (!/[a-zA-Z]/.test(trimmed)) return false;
        
        return true;
    }
    


    /**
     * Get all captions
     */
    getCaptions() {
        return [...this.captions];
    }

    /**
     * Get captions in time range
     */
    getCaptionsInRange(startTime, endTime) {
        return this.captions.filter(caption => {
            return caption.timestamp >= startTime && caption.timestamp <= endTime;
        });
    }

    /**
     * Clear captions
     */
    clearCaptions() {
        this.captions = [];
        this.lastCaptionText = '';
        this.currentSpeaker = null;
        console.log('[CaptionCapture] Captions cleared');
    }

    /**
     * Export as text
     */
    exportAsText() {
        let text = '';
        let currentSpeaker = null;

        this.captions.forEach(caption => {
            if (caption.speaker !== currentSpeaker) {
                currentSpeaker = caption.speaker;
                text += `\n[${caption.speaker}]:\n`;
            }
            text += `${caption.text}\n`;
        });

        return text.trim();
    }

    /**
     * Export as JSON
     */
    exportAsJSON() {
        return JSON.stringify(this.captions, null, 2);
    }

    /**
     * Register callbacks
     */
    onCaption(callback) {
        this.callbacks.onCaption = callback;
    }

    onSpeakerChange(callback) {
        this.callbacks.onSpeakerChange = callback;
    }

    /**
     * Cleanup
     */
    destroy() {
        this.stop();
        this.clearCaptions();
        this.callbacks = {};
        console.log('[CaptionCapture] Destroyed');
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CaptionCapture;
}

window.CaptionCapture = CaptionCapture;

console.log('[CaptionCapture] 📹 Module loaded (EXACT SELECTORS VERSION) ✅');
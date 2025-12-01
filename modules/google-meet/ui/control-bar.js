/**
 * GOOGLE MEET TRANSLATE BUTTON - FINAL STABLE VERSION
 * - No monitoring loop (prevent re-injection)
 * - Improved CC auto-enable with retry
 * - Gradient style + State preservation
 */

class MeetControlBar {
    constructor() {
        this.element = null;
        this.isTranslating = false;
        this.eventHandlers = {};
        this.retryCount = 0;
        this.maxRetries = 10;
        this.injected = false;

        // Helper function để lấy ngôn ngữ an toàn
        this.getLang = (key, replaces = null) => {
            if (window.Lang && typeof window.Lang.get === 'function') {
                return window.Lang.get(key, replaces);
            }
            return `[${key}]`; // Fallback
        };
        
        console.log('[TranslateButton] Instance created');
    }

    async inject() {
        if (this.injected && this.element && document.body.contains(this.element)) {
            console.log('[TranslateButton] Already injected and visible');
            return;
        }
        
        console.log('[TranslateButton] Starting injection...');
        
        try {
            const oldButton = document.getElementById('meetTranslateButton');
            if (oldButton) {
                oldButton.remove();
            }

            const targetContainer = this.findButtonContainer();
            
            if (!targetContainer) {
                throw new Error('Cannot find button container');
            }

            this.element = this.createTranslateButton();
            targetContainer.appendChild(this.element);
            this.setupEventListeners();
            this.setupLanguageListener();
            
            this.injected = true;
            this.retryCount = 0;
            
            console.log('[TranslateButton] ✓ Injected successfully');
            
        } catch (error) {
            console.error('[TranslateButton] ✗ Injection failed:', error);
            
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                const delay = Math.min(1000 * Math.pow(2, this.retryCount), 10000);
                console.log(`[TranslateButton] Retrying in ${delay}ms...`);
                setTimeout(() => this.inject(), delay);
            }
        }
    }

// [SỬA ĐỔI] Thay thế HOÀN TOÀN hàm cũ bằng hàm này

findButtonContainer() {
    console.log('[TranslateButton] Finding button container (Right of End Call)...');

    /**
     * Danh sách các bộ chọn (selector) ưu tiên để tìm thanh công cụ.
     * Chúng ta sẽ tìm container cha chứa cả nút mic/cam VÀ nút "Rời khỏi".
     */
    const selectorsToTry = [
        // Ưu tiên 1: Dùng 'jsname' (Rất ổn định)
        // Đây là div (class R5ccN) chứa CẢ nhóm nút trung tâm VÀ nút "Rời khỏi".
        // appendChild vào đây sẽ đặt nút ở cuối cùng, bên phải nút "Rời khỏi".
        '[jsname="x2XZJc"]', 
        
        // Ưu tiên 2: (Dự phòng) Tìm cha của nút "Rời khỏi cuộc gọi"
        () => {
            // Tìm container của nút "Rời khỏi" bằng jscontroller
            const endCallButtonContainer = document.querySelector('[jscontroller="m1IMT"]');
            if (endCallButtonContainer) {
                // Trả về cha của nó (chính là div [jsname="x2XZJc"])
                return endCallButtonContainer.parentElement;
            }

            // (Dự phòng sâu hơn) Tìm bằng aria-label
            const endCallButton = document.querySelector('[aria-label*="Rời khỏi cuộc gọi"]');
            if (endCallButton) {
                // Đi ngược lên tìm container cha chung
                let parent = endCallButton.parentElement;
                while(parent && !parent.querySelector('[jscontroller="eB6kvd"]') && parent.tagName !== 'BODY') {
                    parent = parent.parentElement;
                }
                return (parent && parent.tagName !== 'BODY') ? parent : null;
            }
            return null;
        }
    ];

    // Lặp qua danh sách selector để tìm
    for (const selector of selectorsToTry) {
        let container = null;

        if (typeof selector === 'function') {
            // Trường hợp selector là một hàm (logic dự phòng)
            container = selector();
        } else {
            // Trường hợp selector là một string
            container = document.querySelector(selector);
        }

        if (container) {
            console.log(`[TranslateButton] ✓ Found container via: ${selector.toString()}`);
            // Lần này, chúng ta *muốn* container cha này, KHÔNG đi sâu hơn.
            return container; // Trả về container tìm được
        }
    }

    console.warn('[TranslateButton] ✗ All selectors failed. Cannot find injection point.');
    return null; // Thất bại
}


// [SỬA ĐỔI] Thay thế TOÀN BỘ hàm này
// (Đã cập nhật)
createTranslateButton() {
    const sampleButton = document.querySelector('[aria-label*="microphone"]') || 
                        document.querySelector('[aria-label*="camera"]') ||
                        document.querySelector('[role="button"]');
    
    const button = document.createElement('div');
    button.id = 'meetTranslateButton';
    button.setAttribute('role', 'button');
    // (Đã cập nhật)
    button.setAttribute('aria-label', this.getLang('translateButtonLabel'));
    button.setAttribute('tabindex', '0');
    button.setAttribute('data-is-translate', String(this.isTranslating));
    
    // Tạo style cơ bản
    const baseStyle = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '48px',
        height: '48px',
        margin: '0 4px', // Giá trị an toàn
        padding: '0',
        borderRadius: '50%', // LUÔN LUÔN là hình tròn
        color: 'white',
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        border: 'none',
        outline: 'none',
        position: 'relative',
        flexShrink: '0',
    };

    // Lấy style từ nút mẫu (chỉ lấy margin và kích thước)
    if (sampleButton) {
    const computed = window.getComputedStyle(sampleButton);
    // KHÔNG sao chép width và height, để giữ nguyên 48px
    baseStyle.margin = computed.margin || '0 4px'; // Chỉ sao chép margin
    
    baseStyle.borderRadius = '50%'; 
}
    
    // Áp dụng style gradient với màu chủ đạo
    const gradientStyle = this.isTranslating ? {
        background: 'linear-gradient(135deg, #f86a01 0%, #d45a01 100%)',
        boxShadow: '0 6px 25px rgba(248, 106, 1, 0.6), 0 0 0 4px rgba(248, 106, 1, 0.2)',
    } : {
        background: 'linear-gradient(135deg, #f86a01 0%, #d45a01 100%)',
        boxShadow: '0 4px 15px rgba(248, 106, 1, 0.4)',
    };
    
    Object.assign(button.style, baseStyle, gradientStyle);

    // Thêm animation nếu đang dịch
    if (this.isTranslating) {
        button.style.animation = 'pulse-translate 2s ease-in-out infinite';
    }

    // Thêm icon Forward.svg từ Panel
    const iconContainer = document.createElement('div');
    iconContainer.style.cssText = 'display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));';
    const iconImg = document.createElement('img');
    iconImg.src = chrome.runtime.getURL('icons/svg/icon/Messages, Conversation/Forward.svg');
    iconImg.style.cssText = 'width: 24px; height: 24px; filter: brightness(0) invert(1); pointer-events: none;';
    iconImg.alt = 'Translate';
    iconContainer.appendChild(iconImg);
    button.appendChild(iconContainer);

    // Thêm lại hàm tương tác
    this.setupButtonInteractions(button);

    return button;
}

// [THÊM LẠI HÀM NÀY]
// Dán hàm này vào bên trong class MeetControlBar
setupButtonInteractions(button) {
    button.addEventListener('mouseenter', () => {
        if (!this.isTranslating) {
            button.style.background = 'linear-gradient(135deg, #ff7a1a 0%, #f86a01 100%)';
            button.style.boxShadow = '0 6px 20px rgba(248, 106, 1, 0.6)';
            button.style.transform = 'translateY(-2px)';
        }
    });

    button.addEventListener('mouseleave', () => {
        if (!this.isTranslating) {
            button.style.background = 'linear-gradient(135deg, #f86a01 0%, #d45a01 100%)';
            button.style.boxShadow = '0 4px 15px rgba(248, 106, 1, 0.4)';
            button.style.transform = 'translateY(0)';
        }
    });

    button.addEventListener('mousedown', () => {
        button.style.transform = this.isTranslating ? 'scale(0.95)' : 'translateY(-2px) scale(0.95)';
    });

    button.addEventListener('mouseup', () => {
        button.style.transform = this.isTranslating ? 'scale(1)' : 'translateY(-2px)';
    });

    button.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.toggleTranslation();
        }
    });
}

// [THÊM LẠI HÀM NÀY]
// Dán luôn hàm này vào (vì hàm toggleTranslation cũng gọi nó)
addPulseAnimation() {
    if (!document.getElementById('translate-pulse-animation')) {
        const style = document.createElement('style');
        style.id = 'translate-pulse-animation';
        style.textContent = `
            @keyframes pulse-translate {
                0%, 100% {
                    box-shadow: 0 6px 25px rgba(0, 153, 255, 0.6), 0 0 0 4px rgba(0, 153, 255, 0.2);
                }
                50% {
                    box-shadow: 0 6px 30px rgba(0, 153, 255, 0.8), 0 0 0 8px rgba(0, 153, 255, 0.3);
                }
            }
        `;
        document.head.appendChild(style);
    }
}

    setupEventListeners() {
        if (!this.element) return;

        this.element.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.toggleTranslation();
        });

        console.log('[TranslateButton] Event listeners attached');
    }

    /**
     * Improved CC enable logic with retry and wait
     */
    async ensureCaptionsEnabled() {
        console.log('[TranslateButton] Ensuring CC is enabled...');
        
        // Check if already ON
        const ccOnSelectors = [
            '[aria-label*="Turn off captions"]',
            '[aria-label*="Tắt phụ đề"]',
        ];
        
        for (const selector of ccOnSelectors) {
            if (document.querySelector(selector)) {
                console.log('[TranslateButton] ✓ CC already ON');
                return true;
            }
        }
        
        // Try to find and click OFF button
        const ccOffSelectors = [
            '[aria-label*="Turn on captions"]',
            '[aria-label*="Turn on live captions"]',
            '[aria-label*="Bật phụ đề"]',
        ];
        
        let ccButton = null;
        for (const selector of ccOffSelectors) {
            ccButton = document.querySelector(selector);
            if (ccButton) {
                console.log('[TranslateButton] Found CC button (OFF), clicking...');
                ccButton.click();
                
                // Wait for CC to actually turn on
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                // Verify it turned on
                for (const onSelector of ccOnSelectors) {
                    if (document.querySelector(onSelector)) {
                        console.log('[TranslateButton] ✓ CC enabled successfully');
                        return true;
                    }
                }
                
                console.warn('[TranslateButton] ⚠️ CC button clicked but not confirmed ON');
                return false;
            }
        }
        
        console.warn('[TranslateButton] ✗ Cannot find CC button');
        return false;
    }

// [SỬA ĐỔI] Thay thế TOÀN BỘ hàm này
toggleTranslation() {
    this.isTranslating = !this.isTranslating;
    console.log('[TranslateButton] Translation toggled:', this.isTranslating);

    // Cập nhật giao diện (Bây giờ hàm này sẽ set gradient)
    this.setTranslating(this.isTranslating);
    
    // Kích hoạt/Tắt
    if (this.isTranslating) {
        // Enable CC BEFORE emitting event
        this.ensureCaptionsEnabled().then(() => {
            this.emit('translate', { 
                active: true,
                action: 'show'
            });
        });
    } else {
        this.emit('translate', { 
            active: false,
            action: 'hide'
        });
    }
    
    // Thêm lại hàm animation (quan trọng)
    this.addPulseAnimation();
}


    setStatus(text, state) {
        console.log('[TranslateButton] setStatus (stub):', text, state);
    }

    setRecording(isRecording) {
        console.log('[TranslateButton] setRecording (stub):', isRecording);
    }

// [SỬA ĐỔI] Thay thế TOÀN BỘ hàm này
setTranslating(isTranslating) {
    this.isTranslating = isTranslating;
    if (this.element) {
        if (isTranslating) {
            this.element.style.background = 'linear-gradient(135deg, #f86a01 0%, #d45a01 100%)';
            this.element.style.boxShadow = '0 6px 25px rgba(248, 106, 1, 0.6), 0 0 0 4px rgba(248, 106, 1, 0.2)';
            this.element.style.animation = 'pulse-translate 2s ease-in-out infinite';
        } else {
            this.element.style.background = 'linear-gradient(135deg, #f86a01 0%, #d45a01 100%)';
            this.element.style.boxShadow = '0 4px 15px rgba(248, 106, 1, 0.4)';
            this.element.style.animation = 'none';
        }
        this.element.setAttribute('data-is-translate', String(isTranslating));
    }
}

    setSummarizing(isSummarizing) {
        console.log('[TranslateButton] setSummarizing (stub):', isSummarizing);
    }

    get recording() {
        return false;
    }

    get summarizing() {
        return false;
    }

    show() {
        if (this.element) {
            this.element.style.display = 'inline-flex';
        }
    }

    hide() {
        if (this.element) {
            this.element.style.display = 'none';
        }
    }

    remove() {
        if (this.element) {
            this.element.remove();
            this.element = null;
            this.injected = false;
        }
    }

    /**
     * Lắng nghe thay đổi ngôn ngữ và cập nhật button
     */
    setupLanguageListener() {
        chrome.storage.onChanged.addListener(async (changes, namespace) => {
            if (namespace === 'sync' && changes.userLang && window.Lang && this.element) {
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
                        
                        // Cập nhật aria-label của button
                        if (this.element) {
                            this.element.setAttribute('aria-label', this.getLang('translateButtonLabel'));
                        }
                        
                        console.log(`[TranslateButton] Ngôn ngữ đã được cập nhật sang ${newLangCode}`);
                    } catch (error) {
                        console.error('[TranslateButton] Lỗi khi cập nhật ngôn ngữ:', error);
                    }
                }
            }
        });
    }

    on(event, handler) {
        if (!this.eventHandlers[event]) {
            this.eventHandlers[event] = [];
        }
        this.eventHandlers[event].push(handler);
    }

    emit(event, ...args) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].forEach(handler => {
                try {
                    handler(...args);
                } catch (error) {
                    console.error(`[TranslateButton] Error in ${event}:`, error);
                }
            });
        }
    }

    get translating() {
        return this.isTranslating;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MeetControlBar;
}

window.MeetControlBar = MeetControlBar;
console.log('[TranslateButton] Module loaded ✓');
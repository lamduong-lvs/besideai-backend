/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  TEAMS CONTROL BAR                                              │
 * │  Tiêm và quản lý nút "Dịch" vào thanh điều khiển của Teams.      │
 * └─────────────────────────────────────────────────────────────────┘
 * * Chiến lược:
 * Giao diện Teams (React) liên tục re-render thanh điều khiển.
 * Chúng ta phải sử dụng một vòng lặp (Interval) để kiểm tra
 * và tiêm lại nút của mình nếu nó bị xóa.
 */

class TeamsControlBar {
    constructor() {
        this.button = null;
        this.targetBar = null;
        this.isTranslating = false;
        this.eventHandlers = {};
        this.injectionInterval = null;

        // ID duy nhất cho nút của chúng ta
        this.BUTTON_ID = 'teams-translate-ext-btn';
        
        // (Sử dụng selector từ file constants.js mà chúng ta sẽ tạo)
        this.SELECTORS = window.TeamsConstants?.selectors || {
            // Thanh điều khiển chính của Teams
            nativeControlBar: '[data-tid="call-controls"]'
        };

        // Helper function để lấy ngôn ngữ an toàn
        this.getLang = (key, replaces = null) => {
            if (window.Lang && typeof window.Lang.get === 'function') {
                return window.Lang.get(key, replaces);
            }
            return `[${key}]`; // Fallback
        };
    }

    /**
     * Bắt đầu quá trình tiêm nút.
     * Hàm này sẽ chạy một vòng lặp liên tục.
     */
    async inject() {
        console.log('[TeamsControlBar] Bắt đầu tiêm nút (sử dụng Polling)...');

        if (this.injectionInterval) {
            clearInterval(this.injectionInterval);
        }

        // Chạy một vòng lặp kiểm tra mỗi 1 giây
        this.injectionInterval = setInterval(() => {
            this.ensureButtonInjected();
        }, 1000); // 1000ms = 1 giây

        // Chạy ngay lần đầu tiên
        this.ensureButtonInjected();
    }

    /**
     * Hàm này được gọi 1 lần/giây để đảm bảo nút luôn tồn tại.
     * Sửa đổi: Hàm này cũng chịu trách nhiệm KÍCH HOẠT
     * phần còn lại của extension khi tìm thấy UI lần đầu.
     */
    ensureButtonInjected() {
        // 1. Tìm thanh điều khiển của Teams ([data-tid="call-controls"])
        this.targetBar = document.querySelector(this.SELECTORS.nativeControlBar);

        // Nếu KHÔNG tìm thấy thanh điều khiển (do nó tự ẩn hoặc chưa vào họp)
        if (!this.targetBar) {
            // Nếu nút của chúng ta đang tồn tại (nhưng bị "mồ côi"), hãy xóa nó
            // Điều này cho phép nút được tiêm lại ở đúng vị trí khi thanh bar xuất hiện trở lại
            if (this.button) {
                console.warn('[TeamsControlBar] Thanh điều khiển gốc biến mất (tạm ẩn?), xóa nút mồ côi.');
                this.button.remove();
                this.button = null;
            }
            
            // --- XÓA LOGIC 'ui_lost' ---
            // Chỉ cần return. Chúng ta không muốn dừng toàn bộ extension
            // chỉ vì thanh điều khiển tạm thời bị ẩn.
            return;
        }
        
        // 2. KÍCH HOẠT (Nếu tìm thấy thanh điều khiển VÀ chưa khởi tạo)
        if (!this.isInitialized) {
            console.log('[TeamsControlBar] ✅ Đã tìm thấy thanh điều khiển cuộc họp! Kích hoạt extension...');
            this.isInitialized = true;
            this.emit('ui_ready', this.targetBar); // Gửi tín hiệu "Sẵn sàng"
        }

        // 3. Tìm nút của chúng ta
        this.button = document.getElementById(this.BUTTON_ID);

        // 4. Kiểm tra: Nút đã tồn tại VÀ nằm đúng vị trí
        if (this.button && this.targetBar.contains(this.button)) {
            // Nút vẫn ở đây. Không cần làm gì cả.
            return;
        }

        // 5. Kiểm tra: Nút tồn tại nhưng nằm sai chỗ (bị mồ côi)
        if (this.button) {
            console.warn('[TeamsControlBar] Nút bị mồ côi, đang xóa...');
            this.button.remove();
            this.button = null;
        }

        // 6. Tiêm nút (vì nút chưa tồn tại)
        console.log('[TeamsControlBar] Đang tiêm nút vào thanh điều khiển...');
        this.button = this.createButton();
        
        // Tiêm vào vị trí cuối cùng trên thanh điều khiển
        this.targetBar.appendChild(this.button);
        
        // Thiết lập listener cho thay đổi ngôn ngữ
        this.setupLanguageListener();
    }
    /**
     * Tạo đối tượng DOM cho nút "Dịch"
     * (Đã cập nhật)
     */
    createButton() {
        const button = document.createElement('button');
        button.id = this.BUTTON_ID;
        button.type = 'button';
        
        // Chúng ta sẽ dùng class riêng (định nghĩa trong teams-control-bar.css)
        // để không bị ảnh hưởng bởi CSS của Teams
        button.className = 'teams-ext-control-btn'; 
        button.setAttribute('aria-label', this.getLang('translateButtonLabelStart'));
        button.setAttribute('data-state', 'false'); // 'false' = Tắt

        // Sử dụng icon Forward.svg từ Panel (giống chức năng dịch trong Panel)
        const iconImg = document.createElement('img');
        iconImg.src = chrome.runtime.getURL('icons/svg/icon/Messages, Conversation/Forward.svg');
        iconImg.style.cssText = 'width: 20px; height: 20px; filter: brightness(0) invert(1); pointer-events: none;';
        iconImg.alt = 'Translate';
        button.appendChild(iconImg);

        this.setupEventListeners(button);
        return button;
    }

    /**
     * Gán sự kiện click cho nút
     */
    setupEventListeners(button) {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleTranslation();
        });
    }

    /**
     * Xử lý khi nhấn nút (bật/tắt)
     */
    toggleTranslation() {
        this.isTranslating = !this.isTranslating;
        this.setTranslating(this.isTranslating); // Cập nhật UI

        // Gửi sự kiện cho teams-content.js
        this.emit('translate', { 
            active: this.isTranslating, 
            action: this.isTranslating ? 'show' : 'hide' 
        });
    }

    /**
     * Cập nhật giao diện của nút (trạng thái bật/tắt)
     * (Đã cập nhật)
     */
    setTranslating(isTranslating) {
        this.isTranslating = isTranslating;
        if (this.button) {
            this.button.setAttribute('data-state', isTranslating ? 'true' : 'false');
            this.button.classList.toggle('active', isTranslating); // Class 'active' sẽ đổi màu
            
            if (isTranslating) {
                this.button.setAttribute('aria-label', this.getLang('translateButtonLabelStop'));
            } else {
                this.button.setAttribute('aria-label', this.getLang('translateButtonLabelStart'));
            }
        }
    }

    /**
     * Gỡ bỏ nút và dừng vòng lặp
     */
    remove() {
        if (this.injectionInterval) {
            clearInterval(this.injectionInterval);
            this.injectionInterval = null;
        }
        if (this.button) {
            this.button.remove();
            this.button = null;
        }
        console.log('[TeamsControlBar] Đã gỡ bỏ');
    }

    /**
     * Lắng nghe thay đổi ngôn ngữ và cập nhật button
     */
    setupLanguageListener() {
        chrome.storage.onChanged.addListener(async (changes, namespace) => {
            if (namespace === 'sync' && changes.userLang && window.Lang && this.button) {
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
                        
                        // Cập nhật aria-label của button dựa trên trạng thái hiện tại
                        if (this.button) {
                            const isTranslating = this.isTranslating;
                            this.button.setAttribute('aria-label', 
                                isTranslating 
                                    ? this.getLang('translateButtonLabelStop')
                                    : this.getLang('translateButtonLabelStart')
                            );
                        }
                        
                        console.log(`[TeamsControlBar] Ngôn ngữ đã được cập nhật sang ${newLangCode}`);
                    } catch (error) {
                        console.error('[TeamsControlBar] Lỗi khi cập nhật ngôn ngữ:', error);
                    }
                }
            }
        });
    }

    // --- Các hàm quản lý sự kiện (để giao tiếp với teams-content.js) ---

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
                    console.error(`[TeamsControlBar] Lỗi khi emit sự kiện ${event}:`, error);
                }
            });
        }
    }
}

// Export (để teams-content.js có thể sử dụng)
window.TeamsControlBar = TeamsControlBar;
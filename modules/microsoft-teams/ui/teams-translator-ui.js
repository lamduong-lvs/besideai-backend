/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  TEAMS TRANSLATOR UI (PHIÊN BẢN HOÀN CHỈNH)                     │
 * │  Quản lý các thành phần UI (popup, thông báo) cho Teams.         │
 * └─────────────────────────────────────────────────────────────────┘
 */

class TeamsTranslatorUI {
    constructor() {
        this.guidancePopup = null;
        this.settingsPanel = null;
        
        // (Sử dụng selector từ file constants.js)
        this.SELECTORS = window.TeamsConstants?.selectors || {
            ccButton: '[data-tid="toggle-captions-button"]',
            moreOptionsButton: '[data-tid="flyout-menu-trigger-button"]'
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
     * Hiển thị popup hướng dẫn bật Live Captions
     * (Đã cập nhật)
     */
    async showCaptionsGuidance() {
        if (this.guidancePopup && document.body.contains(this.guidancePopup)) {
            this.guidancePopup.style.display = 'flex';
            return;
        }

        console.log('[TeamsTranslatorUI] Showing captions guidance...');

        try {
            // Load HTML
            const html = await this.loadGuidanceHTML();
            
            // Create popup
            const wrapper = document.createElement('div');
            wrapper.innerHTML = html;
            
            // ✅ Load shadow-dom-helper nếu chưa có
            if (typeof window.createShadowContainer !== 'function') {
                const script = document.createElement('script');
                script.src = chrome.runtime.getURL('utils/shadow-dom-helper.js');
                document.head.appendChild(script);
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // ✅ Tạo Shadow DOM container
            let shadowContainer = null;
            if (typeof window.createShadowContainer === 'function') {
                shadowContainer = window.createShadowContainer({
                    id: 'teams-translator-guidance-shadow',
                    className: 'teams-translator-guidance-shadow-container',
                    stylesheets: ['modules/microsoft-teams/ui/teams-translator-popup.css']
                });
                
                // Setup theme observer
                if (typeof window.setupThemeObserver === 'function') {
                    window.setupThemeObserver(shadowContainer.shadowRoot);
                }
                
                // Append to shadow container
                shadowContainer.container.appendChild(wrapper.firstElementChild);
            } else {
                // Fallback: append to body
                document.body.appendChild(wrapper.firstElementChild);
            }
            
            // Get reference
            this.guidancePopup = document.getElementById('teamsCaptionsGuidancePopup'); // ID mới
            
            if (!this.guidancePopup) {
                throw new Error('Failed to create guidance popup');
            }

            // Load CSS
            await this.loadGuidanceCSS();
            
            // Setup event listeners
            this.setupGuidanceListeners();

            // ✅ QUAN TRỌNG: Áp dụng ngôn ngữ cho HTML vừa tải
            if (window.Lang && typeof window.Lang.applyToDOM === 'function') {
                window.Lang.applyToDOM(this.guidancePopup);
            }

            console.log('[TeamsTranslatorUI] Guidance shown');

        } catch (error) {
            console.error('[TeamsTranslatorUI] Error showing guidance:', error);
            // Fallback to simple alert
            this.showSimpleGuidance();
        }
    }

    /**
     * Load guidance HTML
     */
    async loadGuidanceHTML() {
        const url = chrome.runtime.getURL('modules/microsoft-teams/ui/teams-translator-popup.html');
        const response = await fetch(url);
        return await response.text();
    }

    /**
     * Load guidance CSS
     */
    async loadGuidanceCSS() {
        const cssUrl = chrome.runtime.getURL('modules/microsoft-teams/ui/teams-translator-popup.css');
        
        if (document.querySelector(`link[href="${cssUrl}"]`)) {
            return;
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = cssUrl;
        document.head.appendChild(link);
    }

    /**
     * Setup guidance listeners
     */
    setupGuidanceListeners() {
        const closeBtn = this.guidancePopup.querySelector('#closeGuidanceBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideGuidance());
        }

        const gotItBtn = this.guidancePopup.querySelector('#gotItBtn');
        if (gotItBtn) {
            gotItBtn.addEventListener('click', () => this.hideGuidance());
        }

        const tryEnableBtn = this.guidancePopup.querySelector('#tryEnableBtn');
        if (tryEnableBtn) {
            tryEnableBtn.addEventListener('click', () => this.tryEnableCaptions());
        }

        const backdrop = this.guidancePopup.querySelector('.guidance-backdrop');
        if (backdrop) {
            backdrop.addEventListener('click', (e) => this.hideGuidance());
        }
    }

    /**
     * (HÀM MỚI - LÕI)
     * Logic cốt lõi: Tự động nhấn nút "..." và "Bật phụ đề"
     * Trả về true nếu thành công, false nếu thất bại.
     */
    clickEnableCaptionsLogic() {
        console.log('[TeamsTranslatorUI] Running click logic...');
        
        // 1. Tìm nút "..."
        const moreBtn = document.querySelector(this.SELECTORS.moreOptionsButton);
        if (!moreBtn) {
            console.warn('[TeamsTranslatorUI] More options button not found');
            return false;
        }
        
        // 2. Nhấn nút "..."
        moreBtn.click();

        // 3. Đợi menu và nhấn nút CC
        setTimeout(() => {
            const ccButton = document.querySelector(this.SELECTORS.ccButton); 
            
            if (ccButton && ccButton.getAttribute('aria-checked') !== 'true') {
                ccButton.click();
                console.log('[TeamsTranslatorUI] Clicked CC button');
            } else if (ccButton) {
                console.log('[TeamsTranslatorUI] CC button already active.');
            } else {
                console.warn('[TeamsTranslatorUI] CC button not found in menu');
                return false; // Báo lỗi (nhưng không hiển thị UI)
            }
        }, 500); // Đợi 0.5s

        return true;
    }

    /**
     * (HÀM CŨ - ĐÃ SỬA)
     * Thử bật phụ đề (được gọi từ popup hướng dẫn)
     * (Đã cập nhật)
     */
    tryEnableCaptions() {
        console.log('[TeamsTranslatorUI] Trying to enable captions (from popup)...');
        
        // Gọi hàm lõi mới
        const success = this.clickEnableCaptionsLogic(); 
        
        if (success) {
            this.showSuccessMessage(this.getLang('guideTeamsEnableSuccess'));
            this.hideGuidance();
        } else {
            this.showErrorMessage(this.getLang('guideTeamsEnableError'));
        }
    }

    /**
     * Hide guidance popup
     */
    hideGuidance() {
        if (this.guidancePopup) {
            this.guidancePopup.style.display = 'none';
        }
    }

    /**
     * Remove guidance popup
     */
    removeGuidance() {
        if (this.guidancePopup) {
            this.guidancePopup.remove();
            this.guidancePopup = null;
        }
    }

    /**
     * Fallback simple guidance (dành cho Teams)
     * (Đã cập nhật)
     */
    showSimpleGuidance() {
        const message = `
${this.getLang('simpleGuideTeamsDesc')}

${this.getLang('simpleGuideTeamsStep1')}
${this.getLang('simpleGuideTeamsStep2')}
${this.getLang('simpleGuideTeamsStep3')}
${this.getLang('simpleGuideTeamsStep4')}
        `.trim();
        
        alert(message);
    }

    // ===================================================================
    // CÁC HÀM TIỆN ÍCH UI (Thông báo, Dialog)
    // (Tái sử dụng từ translator-ui.js của Meet)
    // ===================================================================

    showSuccessMessage(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #34a853;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 2147483647;
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 14px;
            font-weight: 500;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

    showErrorMessage(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #ea4335;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 2147483647;
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 14px;
            font-weight: 500;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 4000);
    }

    showInfoMessage(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #f86a01; /* Màu chủ đạo */
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 2147483647;
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 14px;
            font-weight: 500;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

    /**
     * (Đã cập nhật)
     */
    async showConfirmDialog(title, message) {
        return new Promise((resolve) => {
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 2147483647;
                font-family: 'Segoe UI', Arial, sans-serif;
            `;
            dialog.innerHTML = `
                <div style="
                    background: white;
                    padding: 24px;
                    border-radius: 8px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                    max-width: 400px;
                    width: 90%;
                ">
                    <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #202124;">
                        ${title}
                    </h3>
                    <p style="margin: 0 0 24px 0; font-size: 14px; color: #605E5C; line-height: 1.5;">
                        ${message}
                    </p>
                    <div style="display: flex; gap: 12px; justify-content: flex-end;">
                        <button id="dialogCancelBtn" style="
                            padding: 8px 20px;
                            background: #ffffff;
                            border: 1px solid #8A8886;
                            border-radius: 4px;
                            font-size: 14px;
                            font-weight: 600;
                            color: #605E5C;
                            cursor: pointer;
                        ">${this.getLang('cancelBtn')}</button>
                        <button id="dialogConfirmBtn" style="
                            padding: 8px 20px;
                            background: #f86a01;
                            border: 1px solid #f86a01;
                            border-radius: 4px;
                            font-size: 14px;
                            font-weight: 600;
                            color: white;
                            cursor: pointer;
                        ">${this.getLang('confirmBtn')}</button>
                    </div>
                </div>
            `;
            document.body.appendChild(dialog);

            const cancelBtn = dialog.querySelector('#dialogCancelBtn');
            const confirmBtn = dialog.querySelector('#dialogConfirmBtn');
            const cleanup = () => dialog.remove();

            cancelBtn.addEventListener('click', () => { cleanup(); resolve(false); });
            confirmBtn.addEventListener('click', () => { cleanup(); resolve(true); });
            dialog.addEventListener('click', (e) => {
                if (e.target === dialog) { cleanup(); resolve(false); }
            });
        });
    }

    /**
     * Destroy UI
     */
    destroy() {
        this.removeGuidance();
        console.log('[TeamsTranslatorUI] Destroyed');
    }
}

// Export
window.TeamsTranslatorUI = TeamsTranslatorUI;
/**
 * Translator UI
 * UI components và helpers cho translator
 */

class TranslatorUI {
    constructor() {
        this.guidancePopup = null;
        this.notificationShadowContainer = null; // ✅ Shared shadow container for notifications
        this.overlayShadowContainer = null; // ✅ Shadow container for loading overlay
        this.dialogShadowContainer = null; // ✅ Shadow container for dialog
        this.settingsPanel = null;
        
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
     */
    async showCaptionsGuidance() {
        if (this.guidancePopup) {
            this.guidancePopup.style.display = 'flex';
            return;
        }

        console.log('[TranslatorUI] Showing captions guidance...');

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
                    id: 'meet-translator-guidance-shadow',
                    className: 'meet-translator-guidance-shadow-container',
                    stylesheets: ['modules/google-meet/ui/translator-popup.css']
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
            this.guidancePopup = document.getElementById('captionsGuidancePopup');
            
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

            console.log('[TranslatorUI] Guidance shown');

        } catch (error) {
            console.error('[TranslatorUI] Error showing guidance:', error);
            // Fallback to simple alert
            this.showSimpleGuidance();
        }
    }

    /**
     * Load guidance HTML
     */
    async loadGuidanceHTML() {
        const url = chrome.runtime.getURL('modules/google-meet/ui/translator-popup.html');
        const response = await fetch(url);
        return await response.text();
    }

    /**
     * Load guidance CSS
     */
    async loadGuidanceCSS() {
        const cssUrl = chrome.runtime.getURL('modules/google-meet/ui/translator-popup.css');
        
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
        // Close button
        const closeBtn = this.guidancePopup.querySelector('#closeGuidanceBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideGuidance();
            });
        }

        // Got it button
        const gotItBtn = this.guidancePopup.querySelector('#gotItBtn');
        if (gotItBtn) {
            gotItBtn.addEventListener('click', () => {
                this.hideGuidance();
            });
        }

        // Try enable button (nếu có)
        const tryEnableBtn = this.guidancePopup.querySelector('#tryEnableBtn');
        if (tryEnableBtn) {
            tryEnableBtn.addEventListener('click', () => {
                this.tryEnableCaptions();
            });
        }

        // Click backdrop to close
        this.guidancePopup.addEventListener('click', (e) => {
            if (e.target === this.guidancePopup) {
                this.hideGuidance();
            }
        });
    }

    /**
     * Try to enable captions programmatically
     * (Đã cập nhật)
     */
    tryEnableCaptions() {
        console.log('[TranslatorUI] Trying to enable captions...');

        // Find CC button
        const ccButtons = [
            document.querySelector('[aria-label*="caption"]'),
            document.querySelector('[aria-label*="phụ đề"]'),
            document.querySelector('[data-tooltip*="caption"]'),
            document.querySelector('[jsname="r8qRAd"]') // Meet CC button
        ];

        for (const btn of ccButtons) {
            if (btn && btn.getAttribute('aria-pressed') !== 'true') {
                btn.click();
                console.log('[TranslatorUI] Clicked CC button');
                
                // Show success message (Đã cập nhật)
                this.showSuccessMessage(this.getLang('guideCaptionEnableSuccess'));
                this.hideGuidance();
                return true;
            }
        }

        console.warn('[TranslatorUI] CC button not found');
        return false;
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
     * Fallback simple guidance
     * (Đã cập nhật)
     */
    showSimpleGuidance() {
        const message = `
${this.getLang('simpleGuideDesc')}

${this.getLang('simpleGuideStep1')}
${this.getLang('simpleGuideStep2')}
${this.getLang('simpleGuideStep3')}

${this.getLang('simpleGuideNote')}
        `.trim();
        
        alert(message);
    }

    /**
     * Get or create shared shadow container for notifications
     */
    getNotificationShadowContainer() {
        if (this.notificationShadowContainer) {
            return this.notificationShadowContainer;
        }
        
        if (typeof window.createShadowContainer !== 'function') {
            return null;
        }
        
        this.notificationShadowContainer = window.createShadowContainer({
            id: 'meet-translator-notifications-shadow',
            className: 'meet-translator-notifications-shadow-container',
            stylesheets: ['modules/google-meet/ui/translator-popup.css']
        });
        
        if (typeof window.setupThemeObserver === 'function') {
            window.setupThemeObserver(this.notificationShadowContainer.shadowRoot);
        }
        
        return this.notificationShadowContainer;
    }

    /**
     * Show success message
     * ✅ UPDATED: Sử dụng Shadow DOM
     */
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
            z-index: 10000000;
            font-family: var(--font-family-google, 'Google Sans', 'Roboto', Arial, sans-serif);
            font-size: var(--font-base);
            font-weight: 500;
            animation: slideDown 0.3s ease-out;
        `;
        notification.textContent = message;

        // ✅ Append vào Shadow DOM container hoặc body (fallback)
        const shadowContainer = this.getNotificationShadowContainer();
        if (shadowContainer && shadowContainer.container) {
            shadowContainer.container.appendChild(notification);
        } else {
            document.body.appendChild(notification);
        }

        setTimeout(() => {
            notification.style.animation = 'slideUp 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * Show error message
     */
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
            z-index: 10000000;
            font-family: var(--font-family-google, 'Google Sans', 'Roboto', Arial, sans-serif);
            font-size: var(--font-base);
            font-weight: 500;
            animation: slideDown 0.3s ease-out;
        `;
        notification.textContent = message;

        // ✅ Append vào Shadow DOM container hoặc body (fallback)
        const shadowContainer = this.getNotificationShadowContainer();
        if (shadowContainer && shadowContainer.container) {
            shadowContainer.container.appendChild(notification);
        } else {
            document.body.appendChild(notification);
        }

        setTimeout(() => {
            notification.style.animation = 'slideUp 0.3s ease-out';
            setTimeout(() => notification.remove(), 4000);
        }, 4000);
    }

    /**
     * Show info message
     * ✅ UPDATED: Sử dụng Shadow DOM
     */
    showInfoMessage(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #f86a01;
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

        // ✅ Append vào Shadow DOM container hoặc body (fallback)
        const shadowContainer = this.getNotificationShadowContainer();
        if (shadowContainer && shadowContainer.container) {
            shadowContainer.container.appendChild(notification);
        } else {
            document.body.appendChild(notification);
        }

        setTimeout(() => {
            notification.style.animation = 'slideUp 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * Show loading overlay
     * ✅ UPDATED: Sử dụng Shadow DOM
     */
    showLoadingOverlay(message = null) {
        // Remove existing overlay
        this.hideLoadingOverlay();
        
        // (Đã cập nhật)
        const loadingMessage = message || this.getLang('loadingText');

        const overlay = document.createElement('div');
        overlay.id = 'translatorLoadingOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000000;
            font-family: var(--font-family-google, 'Google Sans', 'Roboto', Arial, sans-serif);
        `;

        overlay.innerHTML = `
            <div style="
                background: white;
                padding: 32px;
                border-radius: 16px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                text-align: center;
            ">
                <div style="
                    width: 48px;
                    height: 48px;
                    border: 4px solid rgba(248, 106, 1, 0.2);
                    border-top-color: #f86a01;
                    border-radius: 50%;
                    margin: 0 auto 16px;
                    animation: spin 0.8s linear infinite;
                "></div>
                <div style="
                    font-size: 16px;
                    font-weight: 500;
                    color: #202124;
                ">${loadingMessage}</div>
            </div>
        `;

        // ✅ Get or create shadow container for overlay
        if (!this.overlayShadowContainer && typeof window.createShadowContainer === 'function') {
            this.overlayShadowContainer = window.createShadowContainer({
                id: 'meet-translator-overlay-shadow',
                className: 'meet-translator-overlay-shadow-container',
                stylesheets: ['modules/google-meet/ui/translator-popup.css']
            });
            
            if (typeof window.setupThemeObserver === 'function') {
                window.setupThemeObserver(this.overlayShadowContainer.shadowRoot);
            }
        }
        
        // ✅ Append vào Shadow DOM container hoặc body (fallback)
        if (this.overlayShadowContainer && this.overlayShadowContainer.container) {
            this.overlayShadowContainer.container.appendChild(overlay);
        } else {
            document.body.appendChild(overlay);
        }
    }

    /**
     * Hide loading overlay
     */
    hideLoadingOverlay() {
        const overlay = document.getElementById('translatorLoadingOverlay');
        if (overlay) {
            overlay.remove();
        }
    }

    /**
     * Confirm dialog
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
                z-index: 10000000;
                font-family: var(--font-family-google, 'Google Sans', 'Roboto', Arial, sans-serif);
            `;

            dialog.innerHTML = `
                <div style="
                    background: white;
                    padding: 24px;
                    border-radius: 16px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                    max-width: 400px;
                    width: 90%;
                ">
                    <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #202124;">
                        ${title}
                    </h3>
                    <p style="margin: 0 0 24px 0; font-size: 14px; color: #5f6368; line-height: 1.5;">
                        ${message}
                    </p>
                    <div style="display: flex; gap: 12px; justify-content: flex-end;">
                        <button id="dialogCancelBtn" style="
                            padding: 10px 24px;
                            background: transparent;
                            border: 1px solid #dadce0;
                            border-radius: 4px;
                            font-size: var(--font-base);
                            font-weight: 500;
                            color: #f86a01;
                            cursor: pointer;
                        ">${this.getLang('cancelBtn')}</button>
                        <button id="dialogConfirmBtn" style="
                            padding: 10px 24px;
                            background: #f86a01;
                            border: none;
                            border-radius: 4px;
                            font-size: var(--font-base);
                            font-weight: 500;
                            color: white;
                            cursor: pointer;
                        ">${this.getLang('confirmBtn')}</button>
                    </div>
                </div>
            `;

            // ✅ Get or create shadow container for dialog
            if (!this.dialogShadowContainer && typeof window.createShadowContainer === 'function') {
                this.dialogShadowContainer = window.createShadowContainer({
                    id: 'meet-translator-dialog-shadow',
                    className: 'meet-translator-dialog-shadow-container',
                    stylesheets: ['modules/google-meet/ui/translator-popup.css']
                });
                
                if (typeof window.setupThemeObserver === 'function') {
                    window.setupThemeObserver(this.dialogShadowContainer.shadowRoot);
                }
            }
            
            // ✅ Append vào Shadow DOM container hoặc body (fallback)
            if (this.dialogShadowContainer && this.dialogShadowContainer.container) {
                this.dialogShadowContainer.container.appendChild(dialog);
            } else {
                document.body.appendChild(dialog);
            }

            const cancelBtn = dialog.querySelector('#dialogCancelBtn');
            const confirmBtn = dialog.querySelector('#dialogConfirmBtn');

            const cleanup = () => {
                dialog.remove();
            };

            cancelBtn.addEventListener('click', () => {
                cleanup();
                resolve(false);
            });

            confirmBtn.addEventListener('click', () => {
                cleanup();
                resolve(true);
            });

            dialog.addEventListener('click', (e) => {
                if (e.target === dialog) {
                    cleanup();
                    resolve(false);
                }
            });
        });
    }

    /**
     * Destroy UI
     */
    destroy() {
        this.removeGuidance();
        this.hideLoadingOverlay();
        console.log('[TranslatorUI] Destroyed');
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TranslatorUI;
}

// Make available globally
window.TranslatorUI = TranslatorUI;
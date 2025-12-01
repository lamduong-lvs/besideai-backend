/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  MICROSOFT TEAMS CONSTANTS (PHIÊN BẢN HOÀN CHỈNH)               │
 * │  Các hằng số, selectors (bộ chọn) DOM cụ thể cho Teams           │
 * └─────────────────────────────────────────────────────────────────┘
 * * Ghi chú:
 * Các selector DOM ở đây dựa trên các thuộc tính 'data-tid' (Test ID)
 * để đảm bảo tính ổn định khi giao diện Teams cập nhật.
 */

const TeamsConstants = {
    /**
     * URLs và Patterns
     */
    urls: {
        teamsBase: 'https://teams.microsoft.com',
        teamsLiveBase: 'https://teams.live.com',
        
        // Regex này sẽ khớp với 1 trong 2 domain
        teamsPattern: /(teams\.microsoft\.com\/_#\/l\/meetup-join|teams\.live\.com\/l\/meetup-join)/
    },

    /**
     * DOM Selectors (CỤ THỂ CHO TEAMS)
     * Đây là các selector data-tid ổn định
     */
    selectors: {
        // --- Phụ đề (Captions) ---
        
        /**
         * 1. Vùng chứa TẤT CẢ các dòng phụ đề.
         * SỬA ĐỔI: Thêm 'v2-virtual-list-content' (từ HTML mới)
         */
        captionContainer: 'div[data-tid="captions-container"], div[data-tid="closed-caption-v2-virtual-list-content"]',
        
        /**
         * 2. Tên người nói (bên trong một dòng phụ đề).
         * SỬA ĐỔI: Thêm 'author' (từ HTML mới)
         */
        speakerName: '[data-tid="caption-speaker-name"], [data-tid="author"]',
        
        /**
         * 3. Văn bản phụ đề (bên trong một dòng phụ đề).
         * SỬA ĐỔI: Thêm 'closed-caption-text' (từ HTML mới)
         */
        captionText: '[data-tid="caption-text"], [data-tid="closed-caption-text"]',

        // --- Thanh điều khiển (Control Bar) ---
        // (Giữ nguyên các selector thanh điều khiển đã sửa ở lần trước)
        
        /**
         * 4. Thanh điều khiển chính của Teams (nơi chứa nút Mute, Camera).
         */
        nativeControlBar: '[data-tid="call-controls"], [data-tid="call-controls-layout"], [data-tid="ubar-horizontal-middle-end"]',

        /**
         * 5. Nút bật/tắt phụ đề gốc của Teams (Dấu ... > Bật phụ đề).
         */
        ccButton: '[data-tid="toggle-captions-button"]',

        /**
         * 6. Nút "Dấu ba chấm" (...) để mở thêm menu.
         */
        moreOptionsButton: '[data-tid="flyout-menu-trigger-button"]'
    },

    /**
     * Class Names (dành riêng cho extension)
     */
    classNames: {
        extensionPrefix: 'teams-ext-',
        controlBar: 'teams-ext-control-bar',
        guidancePopup: 'teams-ext-guidance'
    },

    /**
     * Storage Keys
     */
    storageKeys: {
        teamsSettings: 'teams_settings',
        lastMeetingId: 'teams_last_meeting_id'
    },
    
    /**
     * Debug
     */
    debug: {
        logPrefix: '[TeamsExt]',
        enableLogs: true
    }
};

/**
 * Get selector
 */
function getTeamsSelector(name) {
    return TeamsConstants.selectors[name];
}

/**
 * Get storage key
 */
function getTeamsStorageKey(name) {
    return TeamsConstants.storageKeys[name];
}

// Export (để teams-content.js và các file khác có thể sử dụng)
window.TeamsConstants = TeamsConstants;
window.getTeamsSelector = getTeamsSelector;
window.getTeamsStorageKey = getTeamsStorageKey;
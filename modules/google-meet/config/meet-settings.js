/**
 * Google Meet Settings
 * Cấu hình mặc định cho Google Meet module
 */

const MeetSettings = {
    /**
     * Control Bar Settings
     */
    controlBar: {
        // Hiển thị control bar khi vào Meet
        show: true,
        
        // Vị trí mặc định
        position: {
            top: 20,
            right: 20
        },
        
        // Theme (light, dark, auto)
        theme: 'auto',
        
        // Compact mode (ẩn labels)
        compact: false,
        
        // Các nút hiển thị
        buttons: {
            record: true,
            translate: true,
            summary: true,
            settings: true,
            close: true
        }
    },

    /**
     * Recording Settings
     */
    recording: {
        // Tự động ghi khi vào meeting
        autoStart: false,
        
        // Chất lượng ghi hình
        quality: 'medium', // 'low', 'medium', 'high'
        
        // Video bitrate (bps)
        videoBitrate: {
            low: 1000000,      // 1 Mbps
            medium: 2500000,   // 2.5 Mbps
            high: 8000000      // 8 Mbps
        },
        
        // Audio bitrate (bps)
        audioBitrate: 128000, // 128 kbps
        
        // Ghi âm thanh hệ thống
        systemAudio: true,
        
        // Ghi microphone
        microphone: true,
        
        // Camera overlay
        camera: {
            enabled: false,
            position: 'bottom-right', // 'top-left', 'top-right', 'bottom-left', 'bottom-right'
            size: 'medium' // 'small', 'medium', 'large'
        },
        
        // Hiển thị click effects
        showClicks: true,
        
        // Annotations
        annotations: {
            enabled: false,
            defaultTool: 'pen',
            defaultColor: '#ff0000'
        },
        
        // Tên file mặc định
        fileNameTemplate: 'Meet_{meetingId}_{timestamp}',
        
        // Định dạng file
        format: 'webm', // 'webm', 'mp4' (mp4 cần encoding)
        
        // Tự động dừng sau (phút, 0 = không giới hạn)
        maxDuration: 0
    },

    /**
     * Translation Settings
     */
    translation: {
        // Tự động dịch khi vào meeting
        autoStart: false,
        
        // Provider mặc định
        provider: 'google', // 'google' (free), 'gemini', 'openai'
        
        // Ngôn ngữ nguồn
        sourceLanguage: 'auto',
        
        // Ngôn ngữ đích
        targetLanguage: 'vi',
        
        // Danh sách ngôn ngữ hỗ trợ (Lưu ý: 'name' là CÁC KEY i18n)
        supportedLanguages: [
            { code: 'vi', name: 'transLangVi', flag: '🇻🇳' },
            { code: 'en', name: 'transLangEn', flag: '🇺🇸' },
            { code: 'ja', name: 'transLangJa', flag: '🇯🇵' },
            { code: 'ko', name: 'transLangKo', flag: '🇰🇷' },
            { code: 'zh', name: 'transLangZh', flag: '🇨🇳' },
            { code: 'fr', name: 'transLangFr', flag: '🇫🇷' },
            { code: 'de', name: 'transLangDe', flag: '🇩🇪' },
            { code: 'es', name: 'transLangEs', flag: '🇪🇸' }
        ],
        
        // PiP Window settings
        pipWindow: {
            // Hiển thị phụ đề gốc
            showOriginal: true,
            
            // Kích thước chữ
            fontSize: 'medium', // 'small', 'medium', 'large'
            
            // Tự động cuộn
            autoScroll: true,
            
            // Vị trí mặc định
            position: {
                bottom: 80,
                right: 20
            },
            
            // Kích thước mặc định
            size: {
                width: 400,
                minWidth: 300,
                maxWidth: 600
            }
        },
        
        // Cache translations
        enableCache: true,
        
        // Thời gian cache (ms)
        cacheTimeout: 3600000 // 1 hour
    },

    /**
     * Summary Settings
     */
    summary: {
        // Tự động tạo tóm tắt khi kết thúc meeting
        autoGenerate: true,
        
        // Provider mặc định
        provider: 'gemini', // 'gemini', 'openai'
        
        // Model mặc định
        model: 'gemini-1.5-flash',
        
        // Ngôn ngữ tóm tắt
        language: 'vi', // 'vi', 'en'
        
        // Style tóm tắt
        style: 'detailed', // 'brief', 'detailed', 'bullet-points'
        
        // Bao gồm timestamps
        includeTimestamps: true,
        
        // Bao gồm tên người nói
        includeSpeakers: true,
        
        // Bao gồm full transcript
        includeFullTranscript: true,
        
        // Tự động mở Google Doc sau khi tạo
        autoOpenDoc: true,
        
        // Lưu captions local
        saveLocal: true,
        
        // Giới hạn số captions lưu
        maxCaptions: 1000,
        
        // Auto-save interval (ms)
        autoSaveInterval: 30000 // 30 seconds
    },

    /**
     * Caption Capture Settings
     */
    captionCapture: {
        // Các selector để tìm captions
        selectors: [
            '[jsname="tgaKEf"]',
            '[data-subtitle-track-kind="captions"]',
            '.iOzk7',
            '.a4cQT',
            '[aria-live="polite"][aria-atomic="true"]'
        ],
        
        // Selector để tìm tên người nói
        speakerSelectors: [
            '[jsname="YSxPC"]',
            '[data-participant-id]'
        ],
        
        // Debounce time cho mutations (ms)
        debounceTime: 100,
        
        // Timeout cho caption detection (ms)
        detectionTimeout: 5000
    },

    /**
     * Performance Settings
     */
    performance: {
        // Throttle UI updates (ms)
        uiThrottle: 100,
        
        // Batch processing size
        batchSize: 10,
        
        // Memory limit (bytes)
        memoryLimit: 50000000, // 50 MB
        
        // Auto cleanup interval (ms)
        cleanupInterval: 300000 // 5 minutes
    },

    /**
     * Debug Settings
     */
    debug: {
        // Enable logging
        enabled: false,
        
        // Log level (error, warn, info, debug)
        level: 'info',
        
        // Show performance metrics
        showMetrics: false,
        
        // Log to console
        logToConsole: true
    },

    /**
     * API Settings
     */
    api: {
        // Timeout cho API calls (ms)
        timeout: 30000,
        
        // Retry attempts
        retryAttempts: 3,
        
        // Retry delay (ms)
        retryDelay: 1000,
        
        // Rate limiting
        rateLimit: {
            maxRequests: 60,
            perMinutes: 1
        }
    },

    /**
     * Storage Settings
     */
    storage: {
        // Prefix cho storage keys
        keyPrefix: 'meet_',
        
        // Sử dụng chrome.storage.local
        useLocal: true,
        
        // Backup to IndexedDB (cho data lớn)
        useIndexedDB: false,
        
        // Auto backup interval (ms)
        backupInterval: 600000 // 10 minutes
    },

    /**
     * Privacy Settings
     */
    privacy: {
        // Không lưu nội dung cuộc họp nhạy cảm
        excludeSensitive: false,
        
        // Xóa data sau khi export
        clearAfterExport: false,
        
        // Encrypt data
        encryptData: false,
        
        // Anonymous analytics
        anonymousAnalytics: true
    },

    /**
     * Experimental Features
     */
    experimental: {
        // Real-time translation streaming
        streamingTranslation: false,
        
        // AI-powered meeting insights
        aiInsights: false,
        
        // Auto-detect action items
        autoActionItems: false,
        
        // Voice commands
        voiceCommands: false
    }
};

/**
 * Get default settings
 */
function getDefaultSettings() {
    return JSON.parse(JSON.stringify(MeetSettings));
}

/**
 * Merge user settings with defaults
 */
function mergeSettings(userSettings) {
    const defaults = getDefaultSettings();
    return deepMerge(defaults, userSettings);
}

/**
 * Deep merge objects
 */
function deepMerge(target, source) {
    const output = { ...target };
    
    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            if (isObject(source[key])) {
                if (!(key in target)) {
                    output[key] = source[key];
                } else {
                    output[key] = deepMerge(target[key], source[key]);
                }
            } else {
                output[key] = source[key];
            }
        });
    }
    
    return output;
}

function isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Validate settings
 * (Đã cập nhật để trả về KEY ngôn ngữ, code UI sẽ dùng Lang.get() để dịch)
 */
function validateSettings(settings) {
    const errors = [];
    
    // Validate recording quality
    if (!['low', 'medium', 'high'].includes(settings.recording?.quality)) {
        errors.push('errorInvalidRecordingQuality');
    }
    
    // Validate translation provider
    if (!['google', 'gemini', 'openai'].includes(settings.translation?.provider)) {
        errors.push('errorInvalidTranslationProvider');
    }
    
    // Validate summary style
    if (!['brief', 'detailed', 'bullet-points'].includes(settings.summary?.style)) {
        errors.push('errorInvalidSummaryStyle');
    }
    
    return {
        valid: errors.length === 0,
        errors: errors
    };
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MeetSettings,
        getDefaultSettings,
        mergeSettings,
        validateSettings
    };
}

// Make available globally
window.MeetSettings = MeetSettings;
window.getDefaultMeetSettings = getDefaultSettings;
window.mergeMeetSettings = mergeSettings;
window.validateMeetSettings = validateSettings;
/**
 * Google Meet Constants
 * Các hằng số, selectors, và cấu hình tĩnh
 */

const MeetConstants = {
    /**
     * URLs và Patterns
     */
    urls: {
        meetBase: 'https://meet.google.com',
        meetPattern: /meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/,
        apiBase: 'https://meet.google.com/_/MeetApi'
    },

    /**
     * Meeting ID Pattern
     */
    meetingIdPattern: /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/,

    /**
     * DOM Selectors
     */
    selectors: {
        // Meeting container
        meetingContainer: '[data-meeting-container]',
        
        // Video grid
        videoGrid: 'div[data-allocation-index]',
        selfVideo: 'div[data-self-name]',
        
        // Control bar (Meet's native)
        nativeControlBar: '[jsname="BOHaEe"]',
        
        // Buttons
        micButton: '[aria-label*="microphone"], [data-tooltip*="microphone"]',
        cameraButton: '[aria-label*="camera"], [data-tooltip*="camera"]',
        ccButton: '[aria-label*="caption"], [jsname="r8qRAd"]',
        moreOptionsButton: '[aria-label*="More options"]',
        leaveButton: '[aria-label*="Leave"], [aria-label*="End"]',
        
        // Captions
        captionContainer: [
            '[jsname="tgaKEf"]',
            '[data-subtitle-track-kind="captions"]',
            '.iOzk7',
            '.a4cQT',
            '[aria-live="polite"][aria-atomic="true"]'
        ],
        
        captionText: '.iOzk7, .a4cQT',
        
        speakerName: [
            '[jsname="YSxPC"]',
            '[data-participant-id]',
            '[data-speaker-name]'
        ],
        
        // Participant info
        participantCount: '[data-participant-count]',
        participantList: '[data-participant-list]',
        
        // Meeting info
        meetingTitle: '[data-meeting-title]',
        meetingCode: '[data-meeting-code]',
        
        // Chat
        chatContainer: '[data-chat-container]',
        chatMessages: '[data-chat-messages]',
        
        // Settings
        settingsButton: '[aria-label*="Settings"]',
        settingsPanel: '[data-settings-panel]'
    },

    /**
     * Class Names
     */
    classNames: {
        // Extension classes (để tránh conflict)
        extensionPrefix: 'meet-ext-',
        controlBar: 'meet-ext-control-bar',
        pipWindow: 'meet-ext-pip-window',
        guidancePopup: 'meet-ext-guidance',
        
        // States
        active: 'meet-ext-active',
        recording: 'meet-ext-recording',
        translating: 'meet-ext-translating',
        summarizing: 'meet-ext-summarizing',
        hidden: 'meet-ext-hidden',
        minimized: 'meet-ext-minimized'
    },

    /**
     * Data Attributes
     */
    dataAttributes: {
        meetingId: 'data-meet-id',
        extensionActive: 'data-meet-ext-active',
        recordingState: 'data-recording-state',
        translationState: 'data-translation-state'
    },

    /**
     * Storage Keys
     */
    storageKeys: {
        // Settings
        meetSettings: 'meet_settings',
        translatorSettings: 'translator_settings',
        summarizerSettings: 'summarizer_settings',
        pipSettings: 'pip_settings',
        
        // Data
        captions: (meetingId) => `meet_captions_${meetingId}`,
        summary: (meetingId) => `meet_summary_${meetingId}`,
        
        // Cache
        translationCache: 'meet_translation_cache',
        
        // API Keys
        geminiApiKey: 'geminiApiKey',
        openaiApiKey: 'openaiApiKey',
        
        // State
        lastMeetingId: 'meet_last_meeting_id',
        activeMeetings: 'meet_active_meetings'
    },

    /**
     * Events
     */
    events: {
        // Custom events
        meetingJoined: 'meet:joined',
        meetingLeft: 'meet:left',
        meetingStateChanged: 'meet:state-changed',
        
        recordingStarted: 'meet:recording-started',
        recordingStopped: 'meet:recording-stopped',
        recordingPaused: 'meet:recording-paused',
        
        translationStarted: 'meet:translation-started',
        translationStopped: 'meet:translation-stopped',
        captionReceived: 'meet:caption-received',
        
        summaryRequested: 'meet:summary-requested',
        summaryGenerated: 'meet:summary-generated',
        summaryFailed: 'meet:summary-failed'
    },

    /**
     * Messages (Chrome Runtime)
     */
    messages: {
        // From content to background
        openRecorderTab: 'openRecorderTab',
        startRecordingSession: 'startRecordingSession',
        stopRecordingSession: 'stopRecordingSession',
        createGoogleDoc: 'createGoogleDoc',
        
        // From background to content
        recordingSessionStarted: 'recordingSessionStarted',
        recordingSessionStopped: 'recordingSessionStopped'
    },

    /**
     * Timeouts và Intervals
     */
    timeouts: {
        // Detection
        meetingDetection: 2000, // Check every 2s
        captionDetection: 5000, // Wait 5s for captions
        
        // Debounce
        captionDebounce: 100,
        uiDebounce: 100,
        
        // API
        apiTimeout: 30000, // 30s
        apiRetryDelay: 1000, // 1s
        
        // Auto-save
        autoSave: 30000, // 30s
        
        // Cleanup
        cleanup: 300000 // 5 minutes
    },

    /**
     * Limits
     */
    limits: {
        // Captions
        maxCaptions: 1000,
        maxCaptionLength: 500,
        
        // Translation
        maxTranslationLength: 5000,
        translationCacheSize: 500,
        
        // Storage
        maxStorageSize: 50000000, // 50 MB
        
        // Queue
        maxQueueSize: 100,
        
        // Retry
        maxRetries: 3
    },

    /**
     * Recording Constants
     */
    recording: {
        // Video constraints
        videoConstraints: {
            low: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 24 }
            },
            medium: {
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                frameRate: { ideal: 30 }
            },
            high: {
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                frameRate: { ideal: 60 }
            }
        },
        
        // Audio constraints
        audioConstraints: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            sampleRate: 48000,
            channelCount: 2
        },
        
        // MIME types
        mimeTypes: [
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm;codecs=h264,opus',
            'video/webm'
        ],
        
        // Chunk interval (ms)
        chunkInterval: 100
    },

    /**
     * Translation Constants
     * Lưu ý: Tên ngôn ngữ (name) là CÁC KEY i18n
     */
    translation: {
        // Supported languages (ISO 639-1 codes)
        languages: {
            'auto': 'transLangAuto',
            'vi': 'transLangVi',
            'en': 'transLangEn',
            'ja': 'transLangJa',
            'ko': 'transLangKo',
            'zh': 'transLangZh',
            'fr': 'transLangFr',
            'de': 'transLangDe',
            'es': 'transLangEs',
            'pt': 'transLangPt',
            'ru': 'transLangRu',
            'ar': 'transLangAr',
            'hi': 'transLangHi',
            'th': 'transLangTh',
            'id': 'transLangId'
        },
        
        // Google Translate API endpoint
        googleTranslateApi: 'https://translate.googleapis.com/translate_a/single',
        
        // Retry on error
        retryOnError: true,
        maxRetries: 3
    },

    /**
     * Summary Constants
     * Lưu ý: Tên style (name) là CÁC KEY i18n
     */
    summary: {
        // Summary styles
        styles: {
            brief: {
                name: 'summaryStyleBrief',
                maxTokens: 500,
                temperature: 0.5
            },
            detailed: {
                name: 'summaryStyleDetailed',
                maxTokens: 2000,
                temperature: 0.5
            },
            'bullet-points': {
                name: 'summaryStyleBullet',
                maxTokens: 1500,
                temperature: 0.3
            }
        },
        
        // Template sections
        sections: [
            'overview',
            'key-points',
            'action-items',
            'participants',
            'transcript'
        ]
    },

    /**
     * UI Constants
     */
    ui: {
        // Z-index values
        zIndex: {
            controlBar: 999999,
            pipWindow: 999998,
            guidancePopup: 10000000,
            progressDialog: 10000001,
            errorDialog: 10000002,
            notification: 10000003
        },
        
        // Animation durations (ms)
        animations: {
            fadeIn: 300,
            fadeOut: 300,
            slideIn: 300,
            slideOut: 300
        },
        
        // Colors
        colors: {
            primary: '#f86a01',
            secondary: '#5f6368',
            success: '#34a853',
            warning: '#fbbc04',
            error: '#ea4335',
            background: '#ffffff',
            backgroundDark: '#292a2d',
            text: '#202124',
            textDark: '#e8eaed'
        },
        
        // Sizes
        sizes: {
            controlBarHeight: 60,
            pipWindowMinWidth: 300,
            pipWindowMaxWidth: 600,
            pipWindowMinHeight: 200
        }
    },

    /**
     * Error Messages (KEYS ONLY)
     */
    errors: {
        captionsNotEnabled: 'errorCaptionsNotEnabled',
        apiKeyMissing: 'errorApiKeyMissing',
        apiError: 'errorApiError',
        networkError: 'errorNetworkError',
        storageError: 'errorStorageError',
        permissionDenied: 'errorPermissionDenied',
        invalidMeetingId: 'errorInvalidMeetingId',
        noCaptionsFound: 'errorNoCaptionsFound',
        translationFailed: 'errorTranslationFailedMeet',
        summaryFailed: 'errorSummaryFailed'
    },

    /**
     * Success Messages (KEYS ONLY)
     */
    success: {
        recordingStarted: 'successRecordingStarted',
        recordingStopped: 'successRecordingStopped',
        translationStarted: 'successTranslationStarted',
        translationStopped: 'successTranslationStopped',
        summaryGenerated: 'successSummaryGenerated',
        settingsSaved: 'successSettingsSaved'
    },

    /**
     * Version
     */
    version: '1.0.0',
    
    /**
     * Debug
     */
    debug: {
        logPrefix: '[MeetExt]',
        enableLogs: true
    }
};

/**
 * Get selector
 */
function getSelector(name) {
    return MeetConstants.selectors[name];
}

/**
 * Get storage key
 */
function getStorageKey(name, ...args) {
    const key = MeetConstants.storageKeys[name];
    return typeof key === 'function' ? key(...args) : key;
}

/**
 * Get error message
 * (Đã cập nhật để dùng Lang.get)
 */
function getErrorMessage(errorType) {
    // Lấy key từ object constants, nếu không thấy thì dùng key lỗi mặc định 'errorTitle'
    const key = MeetConstants.errors[errorType] || 'errorTitle';
    
    // Kiểm tra window.Lang đã tồn tại và được init chưa
    if (window.Lang && typeof window.Lang.get === 'function') {
        return window.Lang.get(key);
    }
    
    // Fallback nếu Lang service chưa sẵn sàng
    return `[${key}]`;
}

/**
 * Get success message
 * (Đã cập nhật để dùng Lang.get)
 */
function getSuccessMessage(successType) {
    // Lấy key từ object constants, nếu không thấy thì dùng key thành công mặc định 'successGeneric'
    const key = MeetConstants.success[successType] || 'successGeneric';
    
    // Kiểm tra window.Lang đã tồn tại và được init chưa
    if (window.Lang && typeof window.Lang.get === 'function') {
        return window.Lang.get(key);
    }
    
    // Fallback nếu Lang service chưa sẵn sàng
    return `[${key}]`;
}

/**
 * Check if URL is Meet page
 */
function isMeetPage(url = window.location.href) {
    return MeetConstants.urls.meetPattern.test(url);
}

/**
 * Extract meeting ID from URL
 */
function extractMeetingId(url = window.location.href) {
    const match = url.match(MeetConstants.urls.meetPattern);
    return match ? match[1] : null;
}

/**
 * Validate meeting ID
 */
function isValidMeetingId(meetingId) {
    return MeetConstants.meetingIdPattern.test(meetingId);
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MeetConstants,
        getSelector,
        getStorageKey,
        getErrorMessage,
        getSuccessMessage,
        isMeetPage,
        extractMeetingId,
        isValidMeetingId
    };
}

// Make available globally
window.MeetConstants = MeetConstants;
window.getSelector = getSelector;
window.getStorageKey = getStorageKey;
window.getErrorMessage = getErrorMessage;
window.getSuccessMessage = getSuccessMessage;
window.isMeetPage = isMeetPage;
window.extractMeetingId = extractMeetingId;
window.isValidMeetingId = isValidMeetingId;
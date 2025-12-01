// screenshot/utils.js - Các hàm tiện ích chung cho Screen Recorder
// (Đã cập nhật i18n)

// ===== I18N LOADER (CHO UTILS) =====
let i18nStrings = {};
let i18nPromise = null;

async function loadI18nForUtils() {
    if (i18nPromise) return i18nPromise;

    i18nPromise = (async () => {
        let targetLang = 'vi';
        try {
            const data = await chrome.storage.sync.get('userLang');
            targetLang = data.userLang || 'vi'; 
        } catch (e) {
            targetLang = 'vi';
        }
        
        const langUrl = chrome.runtime.getURL(`lang/${targetLang}.json`);
        try {
            const response = await fetch(langUrl);
            if (!response.ok) throw new Error(`Không thể tải ${targetLang}.json`);
            i18nStrings = await response.json();
            console.log(`i18n (utils.js): Đã tải ngôn ngữ ${targetLang}`);
        } catch (error) {
            console.error('i18n (utils.js): Lỗi tải file ngôn ngữ!', error);
        }
    })();
    
    return i18nPromise;
}

function getLang(key, fallback = null) {
    const str = i18nStrings[key];
    if (str === undefined) {
        return fallback || `[${key}]`;
    }
    return str;
}
// ======================================


/**
 * Format thời gian từ milliseconds thành mm:ss hoặc hh:mm:ss
 */
function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format kích thước file
 * (Đã cập nhật i18n)
 */
function formatFileSize(bytes) {
    if (bytes === 0) return `0 ${getLang('fileSizeUnitBytes', 'Bytes')}`;
    const k = 1024;
    const sizes = [
        getLang('fileSizeUnitBytes', 'Bytes'), 
        getLang('fileSizeUnitKB', 'KB'), 
        getLang('fileSizeUnitMB', 'MB'), 
        getLang('fileSizeUnitGB', 'GB')
    ];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Lấy theme hiện tại (light/dark) - ĐÃ SỬA LỖI
 * Lấy từ chrome.storage.local để đồng bộ với setting chung
 */
async function getCurrentTheme() {
    try {
        const data = await chrome.storage.local.get('theme');
        let theme = data.theme || 'light';
        
        // Chỉ chấp nhận 'light' hoặc 'dark', mặc định là 'light'
        if (theme !== 'light' && theme !== 'dark') {
            theme = 'light';
        }
        
        return theme;
    } catch (e) {
        console.warn('Error getting theme:', e);
        return 'light';
    }
}

/**
 * Áp dụng theme
 */
async function applyTheme(theme = null) {
    if (!theme) {
        theme = await getCurrentTheme();
    }
    document.documentElement.setAttribute('data-theme', theme);
}

/**
 * Get icon URL from screenshot/icons folder
 */
function getIconUrl(iconName) {
    return chrome.runtime.getURL(`modules/screenshot/icons/${iconName}.svg`);
}

/**
 * Get sound URL from screenshot/sounds folder
 */
function getSoundUrl(soundName) {
    return chrome.runtime.getURL(`modules/screenshot/sounds/${soundName}`);
}

/**
 * Create icon image element
 */
function createIconImg(iconName, className = 'icon') {
    const img = document.createElement('img');
    img.src = getIconUrl(iconName);
    img.className = className;
    img.alt = iconName;
    return img;
}

/**
 * Tạo blob từ data URL
 */
function dataURLToBlob(dataURL) {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

/**
 * Download file
 */
function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

/**
 * Lấy thông tin video quality
 * (Không dùng i18n vì label không được sử dụng)
 */
function getVideoQuality(quality) {
    const qualities = {
        '4k': { width: 3840, height: 2160, label: '4K (3840x2160)' },
        '1440p': { width: 2560, height: 1440, label: '1440p (2560x1440)' },
        '1080p': { width: 1920, height: 1080, label: '1080p (1920x1080)' },
        '720p': { width: 1280, height: 720, label: '720p (1280x720)' },
        '480p': { width: 854, height: 480, label: '480p (854x480)' }
    };
    return qualities[quality] || qualities['1080p'];
}

/**
 * Tạo tên file unique theo format: Video-screenshot-ddmmyyyy-hhmmss
 */
function generateFilename(prefix = 'Video-screenshot', extension = 'webm') {
    const now = new Date();
    
    // Format: ddmmyyyy
    const day = now.getDate().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear();
    const dateStr = `${day}${month}${year}`;
    
    // Format: hhmmss
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const timeStr = `${hours}${minutes}${seconds}`;
    
    return `${prefix}-${dateStr}-${timeStr}.${extension}`;
}

/**
 * Kiểm tra browser support
 */
function checkBrowserSupport() {
    const support = {
        mediaRecorder: typeof MediaRecorder !== 'undefined',
        getDisplayMedia: navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function',
        getUserMedia: navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function'
    };
    
    return {
        supported: support.mediaRecorder && support.getDisplayMedia,
        details: support
    };
}

/**
 * Debounce function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Show notification
 */
function showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `recorder-notification recorder-notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, duration);
}

// Tự động tải ngôn ngữ khi script được load
loadI18nForUtils();

// Export cho sử dụng trong các module khác
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatTime,
        formatFileSize,
        getCurrentTheme,
        applyTheme,
        createSVGIcon,
        dataURLToBlob,
        downloadFile,
        getVideoQuality,
        generateFilename,
        checkBrowserSupport,
        debounce,
        showNotification
    };
}
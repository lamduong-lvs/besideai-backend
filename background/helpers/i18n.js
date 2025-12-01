// background/helpers/i18n.js
// i18n helper functions

let i18nStrings = {};
let currentLang = 'vi'; // Mặc định là 'vi'

export async function loadI18nStrings() {
    let targetLang = 'vi';
    try {
        const data = await chrome.storage.sync.get('userLang');
        if (data.userLang) {
            targetLang = data.userLang;
        } else {
            // Không thể dùng chrome.i18n.getUILanguage() một cách đáng tin cậy ở đây
            // Ưu tiên cài đặt, nếu không thì dùng 'vi'
            targetLang = data.userLang || 'vi'; 
        }
    } catch (e) {
        console.warn('i18n (SW): Không thể đọc chrome.storage.sync, dùng "vi".', e);
        targetLang = 'vi';
    }
    
    currentLang = targetLang;
    const langUrl = chrome.runtime.getURL(`lang/${currentLang}.json`);

    try {
        const response = await fetch(langUrl);
        if (!response.ok) {
            throw new Error(`Không thể tải ${currentLang}.json`);
        }
        i18nStrings = await response.json();
        // Info log - comment out to reduce console noise
        // console.log(`i18n (SW): Đã tải ngôn ngữ ${currentLang}`);
    } catch (error) {
        console.error('i18n (SW): Lỗi nghiêm trọng khi tải file ngôn ngữ!', error);
        // Thử tải 'vi' nếu ngôn ngữ hiện tại thất bại
        if (currentLang !== 'vi') {
            console.warn('i18n (SW): Fallback về ngôn ngữ "vi"');
            currentLang = 'vi';
            const fallbackUrl = chrome.runtime.getURL(`lang/vi.json`);
            try {
                const fallbackResponse = await fetch(fallbackUrl);
                if (fallbackResponse.ok) {
                    i18nStrings = await fallbackResponse.json();
                    console.log('i18n (SW): Đã tải ngôn ngữ fallback "vi"');
                } else {
                    console.error('i18n (SW): Không thể tải cả file fallback vi.json');
                }
            } catch (fallbackError) {
                console.error('i18n (SW): Lỗi khi tải file fallback:', fallbackError);
            }
        } else {
            // Nếu đã là 'vi' mà vẫn lỗi, có thể file không tồn tại
            console.error('i18n (SW): Không thể tải file ngôn ngữ mặc định vi.json');
        }
    }
}

export function getLang(key, replaces = null) {
    let str = i18nStrings[key];
    
    if (str === undefined) {
        console.warn(`i18n (SW): Thiếu key: "${key}"`);
        return `[${key}]`; // Trả về key nếu không tìm thấy
    }
    
    if (replaces) {
        for (const rKey in replaces) {
            str = str.replace(new RegExp(`%${rKey}%`, 'g'), replaces[rKey]);
        }
    }
    return str;
}

export function getCurrentLang() {
    return currentLang;
}


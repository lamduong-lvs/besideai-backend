// screenshot/storage.js - Quản lý lưu trữ settings cho Screen Recorder

/**
 * Default settings
 */
const DEFAULT_SETTINGS = {
    // === Các thay đổi theo yêu cầu ===
    source: 'desktop',              // Nguồn quay: Màn hình
    micEnabled: true,               // MIC: Bật
    cameraEnabled: true,            // Camera: Bật
    cameraShape: 'square',          // Hình dạng camera: Vuông
    videoQuality: '4k',             // Chất lượng: Max nhất (4K)
    frameRate: 60,                  // Tốc độ khung hình: 60 FPS
    clickEffectEnabled: true,       // Hiệu ứng click chuột: Bật
    annotationEnabled: true,        // Vẽ chú thích: Bật
    theme: 'light',                 // Theme: Sáng

    // === Các cài đặt khác giữ nguyên ===
    videoFormat: 'webm',
    systemAudioEnabled: true,
    savePath: null,
    controlBarEnabled: true // Thêm vào để đảm bảo thanh điều khiển luôn được quản lý
};

/**
 * Lấy settings từ storage
 */
async function getSettings() {
    return new Promise((resolve) => {
        chrome.storage.local.get('recorderSettings', (data) => {
            // Merge defaults với settings đã lưu để đảm bảo các key mới được thêm vào
            const mergedSettings = { ...DEFAULT_SETTINGS, ...(data.recorderSettings || {}) };
            resolve(mergedSettings);
        });
    });
}

/**
 * Lưu settings vào storage
 */
async function saveSettings(settings) {
    return new Promise((resolve) => {
        chrome.storage.local.set({ recorderSettings: settings }, () => {
            resolve();
        });
    });
}

/**
 * Update một setting cụ thể
 */
async function updateSetting(key, value) {
    const settings = await getSettings();
    settings[key] = value;
    await saveSettings(settings);
    return settings;
}

/**
 * Reset về settings mặc định
 */
async function resetSettings() {
    await saveSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
}

/**
 * Lưu recording state
 */
async function saveRecordingState(state) {
    return new Promise((resolve) => {
        chrome.storage.local.set({ recordingState: state }, () => {
            resolve();
        });
    });
}

/**
 * Lấy recording state
 */
async function getRecordingState() {
    return new Promise((resolve) => {
        chrome.storage.local.get('recordingState', (data) => {
            resolve(data.recordingState || null);
        });
    });
}

/**
 * Clear recording state
 */
async function clearRecordingState() {
    return new Promise((resolve) => {
        chrome.storage.local.remove('recordingState', () => {
            resolve();
        });
    });
}

/**
 * Lưu video recording vào IndexedDB (cho việc tạm thời)
 */
const RecordingDB = {
    dbName: 'RecorderDB',
    storeName: 'recordings',
    version: 1,

    async open() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'id' });
                }
            };
        });
    },

    async save(id, blob, metadata = {}) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            const data = {
                id,
                blob,
                metadata,
                timestamp: Date.now()
            };
            
            const request = store.put(data);
            request.onsuccess = () => resolve(id);
            request.onerror = () => reject(request.error);
        });
    },

    async get(id) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(id);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async delete(id) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(id);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async getAll() {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async clear() {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.clear();
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
};

/**
 * Lưu lịch sử recording
 */
async function saveRecordingHistory(recordingData) {
    return new Promise((resolve) => {
        chrome.storage.local.get('recordingHistory', (data) => {
            const history = data.recordingHistory || [];
            history.unshift({
                ...recordingData,
                timestamp: Date.now()
            });
            
            // Giới hạn 50 bản ghi gần nhất
            if (history.length > 50) {
                history.splice(50);
            }
            
            chrome.storage.local.set({ recordingHistory: history }, () => {
                resolve();
            });
        });
    });
}

/**
 * Lấy lịch sử recording
 */
async function getRecordingHistory() {
    return new Promise((resolve) => {
        chrome.storage.local.get('recordingHistory', (data) => {
            resolve(data.recordingHistory || []);
        });
    });
}

/**
 * Xóa một item trong lịch sử
 */
async function deleteHistoryItem(timestamp) {
    return new Promise((resolve) => {
        chrome.storage.local.get('recordingHistory', (data) => {
            const history = data.recordingHistory || [];
            const newHistory = history.filter(item => item.timestamp !== timestamp);
            chrome.storage.local.set({ recordingHistory: newHistory }, () => {
                resolve();
            });
        });
    });
}

/**
 * Clear toàn bộ lịch sử
 */
async function clearHistory() {
    return new Promise((resolve) => {
        chrome.storage.local.remove('recordingHistory', () => {
            resolve();
        });
    });
}
/**
 * HistoryManager.js
 * Quản lý lịch sử hội thoại với speaker change detection
 * Version: 2.0.0
 */

class HistoryManager {
    constructor(options = {}) {
        this.settings = {
            minSpeakerDuration: 3000, // 3s minimum
            maxLiveBufferAge: 10000, // 10s max buffer
            speakerChangeThreshold: 0.7, // 70% text overlap = same speaker
            autosaveInterval: 30000, // 30s autosave
            storageKey: 'meetTranslationHistory',
            ...options
        };

        // State
        this.finalizedHistory = []; // Completed entries
        this.liveBuffer = {
            speaker: null,
            original: '',
            translated: '',
            startTime: null,
            lastUpdate: null
        };
        
        this.isDirty = false;
        this.autosaveTimer = null;
        
        // Callbacks
        this.onHistoryUpdate = null;
        this.onLiveBufferUpdate = null;

        console.log('[HistoryManager] 📚 Initialized with settings:', this.settings);
    }

    /**
     * Process new caption
     */
    /**
 * Process new caption - with Vietnamese handling
 */
async processCaption(captionData) {
    const { speaker, original, translated } = captionData;
    const now = Date.now();

    // Detect speaker change
    if (this.shouldFinalizeSpeaker(speaker, now)) {
        this.finalizeLiveBuffer();
    }

    // ✅ CHỈ LƯU TIẾNG VIỆT
    // Nếu original là tiếng Việt, dùng original
    // Nếu không, dùng translated (đã được dịch sang tiếng Việt)
    const isVi = this.isVietnamese(original);
    const vietnameseText = isVi ? original : (translated || original);

    // Update or create buffer
    if (!this.liveBuffer.speaker) {
        this.liveBuffer = {
            speaker,
            original: vietnameseText, // Store Vietnamese as "original"
            translated: vietnameseText, // Same as original (for compatibility)
            startTime: now,
            lastUpdate: now
        };
    } else {
        this.liveBuffer.original = vietnameseText;
        this.liveBuffer.translated = vietnameseText;
        this.liveBuffer.lastUpdate = now;
    }

    // Notify live update
    if (this.onLiveBufferUpdate) {
        this.onLiveBufferUpdate(this.liveBuffer);
    }
}

/**
 * Detect if text is Vietnamese (uses shared utility)
 */
isVietnamese(text) {
    // Import dynamically to avoid circular dependencies
    // For now, use inline import check
    if (typeof window !== 'undefined' && window.LanguageDetection) {
        return window.LanguageDetection.isVietnamese(text);
    }
    // Fallback if utility not available
    if (!text || text.trim().length === 0) return false;
    const vietnameseChars = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
    return vietnameseChars.test(text);
}

    /**
     * Check if should finalize current speaker
     */

    shouldFinalizeSpeaker(newSpeaker, now) {
        // 1. Nếu buffer đang rỗng, không làm gì cả
        if (!this.liveBuffer.speaker) {
            return false;
        }

        // 2. LOGIC DUY NHẤT:
        // Chỉ finalize (lưu lại) khi người nói bị thay đổi.
        // Chúng ta không quan tâm đến thời gian nữa.
        if (this.liveBuffer.speaker !== newSpeaker) {
            return true;
        }
        
        // Cùng speaker, cứ để họ nói, không ngắt
        return false;
    }

    /**
 * Finalize current buffer to history - Vietnamese only
 */
finalizeLiveBuffer() {
    if (!this.liveBuffer.speaker) return;

    const entry = {
        id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        speaker: this.liveBuffer.speaker,
        original: this.liveBuffer.original.trim(), // Vietnamese text
        translated: this.liveBuffer.translated.trim(), // Same as original
        timestamp: this.liveBuffer.startTime,
        duration: this.liveBuffer.lastUpdate - this.liveBuffer.startTime,
        wordCount: this.countWords(this.liveBuffer.original)
    };

    this.finalizedHistory.push(entry);
    this.isDirty = true;

    console.log(`[HistoryManager] ✓ Finalized (Vietnamese): ${entry.speaker} (${entry.wordCount} words)`);

    // Reset buffer
    this.resetLiveBuffer();

    // Notify update
    if (this.onHistoryUpdate) {
        this.onHistoryUpdate(this.finalizedHistory);
    }

    // Schedule autosave
    this.scheduleAutosave();
}

    /**
     * Reset live buffer
     */
    resetLiveBuffer() {
        this.liveBuffer = {
            speaker: null,
            original: '',
            translated: '',
            startTime: null,
            lastUpdate: null
        };
    }

    /**
     * Count words
     */
    countWords(text) {
        return text.trim().split(/\s+/).length;
    }

    /**
     * Get finalized history
     */
    getHistory() {
        return this.finalizedHistory;
    }

    /**
     * Get live buffer
     */
    getLiveBuffer() {
        return this.liveBuffer;
    }

    /**
     * Save to storage
     */
    async saveToStorage() {
        if (!this.isDirty) return;

        try {
            const data = {
                history: this.finalizedHistory,
                savedAt: Date.now(),
                version: '2.0.0'
            };

            localStorage.setItem(this.settings.storageKey, JSON.stringify(data));
            this.isDirty = false;
            
            console.log(`[HistoryManager] 💾 Saved ${this.finalizedHistory.length} entries`);
        } catch (error) {
            console.error('[HistoryManager] ❌ Save failed:', error);
        }
    }

    /**
     * Load from storage
     */
    async loadFromStorage() {
        try {
            const data = localStorage.getItem(this.settings.storageKey);
            if (!data) return false;

            const parsed = JSON.parse(data);
            this.finalizedHistory = parsed.history || [];
            
            console.log(`[HistoryManager] 📥 Loaded ${this.finalizedHistory.length} entries`);
            
            if (this.onHistoryUpdate) {
                this.onHistoryUpdate(this.finalizedHistory);
            }
            
            return true;
        } catch (error) {
            console.error('[HistoryManager] ❌ Load failed:', error);
            return false;
        }
    }

    /**
     * Schedule autosave
     */
    scheduleAutosave() {
        if (this.autosaveTimer) {
            clearTimeout(this.autosaveTimer);
        }

        this.autosaveTimer = setTimeout(() => {
            this.saveToStorage();
        }, this.settings.autosaveInterval);
    }

    /**
     * Stop autosave
     */
    stopAutoSave() {
        if (this.autosaveTimer) {
            clearTimeout(this.autosaveTimer);
            this.autosaveTimer = null;
        }
    }

    /**
     * Clear all history
     */
    async clearHistory() {
        console.log('[HistoryManager] 🗑️ Clearing history...');
        
        this.finalizedHistory = [];
        this.resetLiveBuffer();
        this.isDirty = true;
        
        await this.saveToStorage();
        
        if (this.onHistoryUpdate) {
            this.onHistoryUpdate([]);
        }
        
        console.log('[HistoryManager] ✓ History cleared');
    }

    /**
     * Force finalize (when leaving meeting)
     */
    forceFinalize() {
        console.log('[HistoryManager] 🔚 Force finalizing...');
        
        if (this.liveBuffer.speaker) {
            const originalMin = this.settings.minSpeakerDuration;
            this.settings.minSpeakerDuration = 0;
            
            this.finalizeLiveBuffer();
            
            this.settings.minSpeakerDuration = originalMin;
        }
        
        this.saveToStorage();
    }

    /**
     * Export history
     */
    exportHistory(format = 'json') {
        if (format === 'json') {
            return JSON.stringify(this.finalizedHistory, null, 2);
        } else if (format === 'text') {
            return this.finalizedHistory.map(entry => {
                return `[${new Date(entry.timestamp).toLocaleTimeString()}] ${entry.speaker}:\n${entry.original}\n→ ${entry.translated}\n`;
            }).join('\n');
        }
    }

    /**
     * Set callbacks
     */
    setOnHistoryUpdate(callback) {
        this.onHistoryUpdate = callback;
    }

    setOnLiveBufferUpdate(callback) {
        this.onLiveBufferUpdate = callback;
    }

    /**
     * Update settings
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        console.log('[HistoryManager] ⚙️ Settings updated:', this.settings);
    }

    /**
     * Destroy
     */
    async destroy() {
        console.log('[HistoryManager] 🔚 Destroying...');
        
        this.forceFinalize();
        this.stopAutoSave();
        await this.saveToStorage();
        
        console.log('[HistoryManager] ✓ Destroyed');
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HistoryManager;
}

window.HistoryManager = HistoryManager;
console.log('[HistoryManager] 📚 Module loaded ✓');

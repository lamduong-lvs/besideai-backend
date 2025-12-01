/**
 * Google Meet Recorder
 * Wrapper cho screen recorder, tích hợp với Google Meet
 */

class MeetRecorder {
    constructor() {
        this.isRecording = false;
        this.recorderTabId = null;
        this.meetingId = null;
        this.startTime = null;
    }

    /**
     * Bắt đầu ghi cuộc họp
     */
    async start() {
        if (this.isRecording) {
            console.log('[MeetRecorder] Already recording');
            return;
        }

        console.log('[MeetRecorder] Starting recording...');

        try {
            // Lấy meeting ID
            this.meetingId = this.extractMeetingId();
            
            // Load settings
            const settings = await this.getRecordingSettings();

            // Gửi message đến background để mở recorder tab
            const response = await chrome.runtime.sendMessage({
                action: 'openRecorderTab',
                settings: settings,
                context: 'google-meet',
                meetingId: this.meetingId
            });

            if (response && response.success) {
                this.recorderTabId = response.tabId;
                this.isRecording = true;
                this.startTime = Date.now();

                console.log('[MeetRecorder] Recording started, tab:', this.recorderTabId);

                // Lắng nghe khi recording dừng
                this.listenForStop();

                return { success: true };
            } else {
                throw new Error('Failed to open recorder tab');
            }

        } catch (error) {
            console.error('[MeetRecorder] Error starting recording:', error);
            throw error;
        }
    }

    /**
     * Dừng ghi cuộc họp
     */
    async stop() {
        if (!this.isRecording) {
            console.log('[MeetRecorder] Not recording');
            return;
        }

        console.log('[MeetRecorder] Stopping recording...');

        try {
            // Gửi message đến recorder tab
            if (this.recorderTabId) {
                await chrome.tabs.sendMessage(this.recorderTabId, {
                    action: 'stopRecording'
                });
            }

            this.isRecording = false;
            const duration = Date.now() - this.startTime;

            console.log('[MeetRecorder] Recording stopped, duration:', duration);

            return { success: true, duration };

        } catch (error) {
            console.error('[MeetRecorder] Error stopping recording:', error);
            throw error;
        }
    }

    /**
     * Lắng nghe khi recording dừng từ recorder tab
     */
    listenForStop() {
        const listener = (message, sender) => {
            if (message.action === 'recordingStopped' && sender.tab?.id === this.recorderTabId) {
                console.log('[MeetRecorder] Recording stopped by recorder tab');
                this.isRecording = false;
                chrome.runtime.onMessage.removeListener(listener);
            }
        };

        chrome.runtime.onMessage.addListener(listener);
    }

    /**
     * Lấy cài đặt ghi hình
     */
    async getRecordingSettings() {
        try {
            const result = await chrome.storage.local.get(['meetSettings', 'recordingSettings']);
            
            const meetSettings = result.meetSettings || {};
            const recordingSettings = result.recordingSettings || {};

            // Merge settings, ưu tiên meet-specific settings
            return {
                // Recording quality
                videoBitsPerSecond: meetSettings.recordingQuality === 'high' ? 8000000 : 2500000,
                audioBitsPerSecond: 128000,

                // Audio settings
                audioEnabled: meetSettings.recordAudio !== false,
                microphoneEnabled: meetSettings.recordMicrophone !== false,
                systemAudioEnabled: meetSettings.recordSystemAudio !== false,

                // Camera overlay
                cameraEnabled: recordingSettings.cameraEnabled || false,
                cameraPosition: recordingSettings.cameraPosition || 'bottom-right',

                // Annotations
                showClicks: recordingSettings.showClicks !== false,
                annotationsEnabled: recordingSettings.annotationsEnabled || false,

                // File settings
                fileName: `Meet_${this.meetingId}_${this.getTimestamp()}`,
                format: 'webm',

                // Meet-specific
                context: 'google-meet',
                meetingId: this.meetingId
            };

        } catch (error) {
            console.error('[MeetRecorder] Error getting settings:', error);
            return this.getDefaultSettings();
        }
    }

    /**
     * Default settings
     */
    getDefaultSettings() {
        return {
            videoBitsPerSecond: 2500000,
            audioBitsPerSecond: 128000,
            audioEnabled: true,
            microphoneEnabled: true,
            systemAudioEnabled: true,
            cameraEnabled: false,
            showClicks: true,
            annotationsEnabled: false,
            fileName: `Meet_${this.meetingId}_${this.getTimestamp()}`,
            format: 'webm',
            context: 'google-meet',
            meetingId: this.meetingId
        };
    }

    /**
     * Extract meeting ID từ URL
     */
    extractMeetingId() {
        const url = window.location.href;
        const match = url.match(/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/);
        return match ? match[1] : 'unknown';
    }

    /**
     * Lấy timestamp cho tên file
     */
    getTimestamp() {
        const now = new Date();
        return now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
    }

    /**
     * Kiểm tra trạng thái
     */
    getStatus() {
        return {
            isRecording: this.isRecording,
            meetingId: this.meetingId,
            startTime: this.startTime,
            duration: this.startTime ? Date.now() - this.startTime : 0
        };
    }

    /**
     * Pause recording (nếu recorder hỗ trợ)
     */
    async pause() {
        if (!this.isRecording || !this.recorderTabId) {
            return;
        }

        try {
            await chrome.tabs.sendMessage(this.recorderTabId, {
                action: 'pauseRecording'
            });
            console.log('[MeetRecorder] Recording paused');
        } catch (error) {
            console.error('[MeetRecorder] Error pausing recording:', error);
        }
    }

    /**
     * Resume recording
     */
    async resume() {
        if (!this.isRecording || !this.recorderTabId) {
            return;
        }

        try {
            await chrome.tabs.sendMessage(this.recorderTabId, {
                action: 'resumeRecording'
            });
            console.log('[MeetRecorder] Recording resumed');
        } catch (error) {
            console.error('[MeetRecorder] Error resuming recording:', error);
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.isRecording) {
            this.stop().catch(err => {
                console.error('[MeetRecorder] Error stopping on destroy:', err);
            });
        }
        console.log('[MeetRecorder] Destroyed');
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MeetRecorder;
}
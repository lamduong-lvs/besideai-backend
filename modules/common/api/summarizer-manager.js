/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  SUMMARIZER MANAGER - WITH SETTINGS INTEGRATION               │
 * │  Generates meeting summaries using configured models           │
 * └─────────────────────────────────────────────────────────────────┘
 */

// Simple stub for RacingHelper (removed, using single mode)
class RacingHelper {
    constructor() {
        this.enabled = false;
    }
    
    async init() {
        this.enabled = false;
    }
    
    isRacingEnabled() {
        return false;
    }
    
    buildSummaryPrompt(captions, options) {
        const { language = 'vi', style = 'detailed', includeTimestamps = true, includeSpeakers = true } = options;
        
        let prompt = `Hãy tạo một bản tóm tắt cuộc họp từ các đoạn caption sau đây.\n\n`;
        
        if (style === 'detailed') {
            prompt += `Yêu cầu:\n`;
            prompt += `1. Tóm tắt chính: Mô tả ngắn gọn nội dung cuộc họp\n`;
            prompt += `2. Điểm chính: Liệt kê các điểm quan trọng được thảo luận\n`;
            prompt += `3. Quyết định: Các quyết định đã được đưa ra\n`;
            prompt += `4. Hành động: Các công việc cần thực hiện (nếu có)\n\n`;
        }
        
        prompt += `Captions:\n`;
        captions.forEach((caption, index) => {
            let line = '';
            if (includeSpeakers && caption.speaker) {
                line += `[${caption.speaker}] `;
            }
            if (includeTimestamps && caption.timestamp) {
                line += `(${caption.timestamp}) `;
            }
            line += caption.text;
            prompt += `${index + 1}. ${line}\n`;
        });
        
        prompt += `\nHãy trả về kết quả dưới dạng JSON với cấu trúc:\n`;
        prompt += `{\n`;
        prompt += `  "main": "Tóm tắt chính",\n`;
        prompt += `  "keyPoints": ["Điểm 1", "Điểm 2"],\n`;
        prompt += `  "decisions": ["Quyết định 1"],\n`;
        prompt += `  "actionItems": [{"task": "Công việc", "assignee": "Người phụ trách", "deadline": "Hạn chót"}]\n`;
        prompt += `}`;
        
        return prompt;
    }
    
    async sendSingle(prompt, options) {
        // Use message passing to background for summarization via processAction
        try {
            const messages = [
                { role: 'system', content: 'You are a professional meeting summarizer. Return only valid JSON, no additional text.' },
                { role: 'user', content: prompt }
            ];
            
            // Get AI config
            const configResponse = await chrome.runtime.sendMessage({ action: 'getAIConfig' });
            if (!configResponse?.success || !configResponse.config) {
                throw new Error('Failed to get AI config');
            }
            
            const response = await chrome.runtime.sendMessage({
                action: 'processAction',
                messages: messages,
                config: configResponse.config
            });
            
            if (!response || !response.success) {
                throw new Error(response?.error?.message || 'Summarization failed');
            }
            
            return {
                response: response.result || '',
                cached: false,
                modelId: response.usedFullModelId || 'unknown',
                provider: response.providerUsed || 'unknown'
            };
        } catch (error) {
            console.error('[SummarizerManager] Summarization via message failed:', error);
            throw error;
        }
    }
    
    getRacingStats() {
        return { enabled: false };
    }
    
    clearCache() {
        // No-op
    }
}

class SummarizerManager {
    constructor() {
        this.racingHelper = null;
        this.captions = [];
        this.settings = {
            language: 'vi',
            style: 'detailed',
            includeTimestamps: true,
            includeSpeakers: true,
            autoSave: true,
            maxCaptions: 1000
        };
        
        // Callbacks
        this.onCaptionAdded = null;
        this.onSummaryGenerated = null;
        this.onError = null;
        
        // Auto-save timer
        this.autoSaveTimer = null;
        
        console.log('[SummarizerManager] 📝 Instance created');
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * INITIALIZATION
     * ═══════════════════════════════════════════════════════════════
     */

    async init() {
        console.log('[SummarizerManager] 📥 Initializing...');
        
        try {
            // Initialize racing helper
            this.racingHelper = new RacingHelper();
            await this.racingHelper.init();
            
            // Load settings
            await this.loadSettings();
            
            // Setup auto-save
            if (this.settings.autoSave) {
                this.startAutoSave();
            }
            
            console.log('[SummarizerManager] ✓ Initialized:', {
                language: this.settings.language,
                style: this.settings.style,
                maxCaptions: this.settings.maxCaptions
            });

        } catch (error) {
            console.error('[SummarizerManager] ✗ Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Load settings from storage
     */
    async loadSettings() {
        try {
            const result = await chrome.storage.local.get(['summarizerSettings']);
            
            if (result.summarizerSettings) {
                this.settings = {
                    ...this.settings,
                    ...result.summarizerSettings
                };
            }

            console.log('[SummarizerManager] ✓ Settings loaded:', this.settings);

        } catch (error) {
            console.error('[SummarizerManager] ✗ Failed to load settings:', error);
        }
    }
	
    /**
     * Phân tích chuỗi JSON một cách an toàn, có dự phòng
     */
    _safeParseSummaryJSON(jsonString) {
    const fallbackJSON = {
        main: "Không thể tạo tóm tắt. AI đã trả về dữ liệu không hợp lệ.",
        keyPoints: [`Lỗi: ${jsonString.substring(0, 100)}...`],
        decisions: [],
        actionItems: []
    };

    if (typeof jsonString !== 'string') {
        console.error('[SummarizerManager] ✗ Response không phải string:', typeof jsonString);
        return fallbackJSON;
    }

    // STRATEGY 1: Direct JSON parse
    try {
        const parsed = JSON.parse(jsonString);
        console.log('[SummarizerManager] ✓ Strategy 1: Direct parse success');
        return parsed;
    } catch (e1) {
        console.warn('[SummarizerManager] ⚠ Strategy 1 failed, trying next...');
    }

    // STRATEGY 2: Extract from markdown code block ```json ... ```
    const codeBlockMatch = jsonString.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
        try {
            const parsed = JSON.parse(codeBlockMatch[1].trim());
            console.log('[SummarizerManager] ✓ Strategy 2: Code block extraction success');
            return parsed;
        } catch (e2) {
            console.warn('[SummarizerManager] ⚠ Strategy 2 failed, trying next...');
        }
    }

    // STRATEGY 3: Find first { ... } object
    const objectMatch = jsonString.match(/\{[\s\S]*\}/);
    if (objectMatch && objectMatch[0]) {
        try {
            const parsed = JSON.parse(objectMatch[0]);
            console.log('[SummarizerManager] ✓ Strategy 3: Object extraction success');
            return parsed;
        } catch (e3) {
            console.warn('[SummarizerManager] ⚠ Strategy 3 failed, trying next...');
        }
    }

    // STRATEGY 4: Parse markdown as structure
    console.warn('[SummarizerManager] ⚠ All JSON strategies failed, parsing markdown...');
    try {
        const markdownParsed = this._parseMarkdownToJSON(jsonString);
        if (markdownParsed) {
            console.log('[SummarizerManager] ✓ Strategy 4: Markdown parsing success');
            return markdownParsed;
        }
    } catch (e4) {
        console.warn('[SummarizerManager] ⚠ Strategy 4 failed');
    }

    // FALLBACK: Return error structure
    console.error('[SummarizerManager] ✗ All strategies failed, using fallback');
    fallbackJSON.keyPoints[0] = `Không thể parse response. Preview: ${jsonString.substring(0, 200)}...`;
    return fallbackJSON;
}

_parseMarkdownToJSON(markdown) {
    const result = {
        main: '',
        keyPoints: [],
        decisions: [],
        actionItems: []
    };

    // Extract main summary (first paragraph or ### 1.)
    const mainMatch = markdown.match(/###\s*1\.\s*[^#\n]*\n([^#]+)/i) || 
                      markdown.match(/^([^\n#]+(?:\n(?!\n|#)[^\n]+)*)/);
    if (mainMatch) {
        result.main = mainMatch[1].trim().replace(/^-\s*/, '');
    }

    // Extract key points (### 2. or bullet points)
    const keyPointsSection = markdown.match(/###\s*2\.\s*[^#\n]*\n([\s\S]*?)(?=###|$)/i);
    if (keyPointsSection) {
        const bullets = keyPointsSection[1].match(/^[-*]\s*(.+)$/gm);
        if (bullets) {
            result.keyPoints = bullets.map(b => b.replace(/^[-*]\s*/, '').trim());
        }
    }

    // Extract decisions (### 3.)
    const decisionsSection = markdown.match(/###\s*3\.\s*[^#\n]*\n([\s\S]*?)(?=###|$)/i);
    if (decisionsSection) {
        const bullets = decisionsSection[1].match(/^[-*]\s*(.+)$/gm);
        if (bullets) {
            result.decisions = bullets.map(b => b.replace(/^[-*]\s*/, '').trim());
        }
    }

    // Extract action items (### 4.)
    const actionSection = markdown.match(/###\s*4\.\s*[^#\n]*\n([\s\S]*?)(?=###|$)/i);
    if (actionSection) {
        const bullets = actionSection[1].match(/^[-*]\s*(.+)$/gm);
        if (bullets) {
            result.actionItems = bullets.map(b => {
                const text = b.replace(/^[-*]\s*/, '').trim();
                // Try to extract assignee and deadline
                const assigneeMatch = text.match(/\*\*(.+?)\*\*:\s*(.+)/);
                if (assigneeMatch) {
                    const deadlineMatch = assigneeMatch[2].match(/\(Hạn:\s*(.+?)\)/);
                    return {
                        assignee: assigneeMatch[1],
                        task: assigneeMatch[2].replace(/\(Hạn:.*?\)/, '').trim(),
                        deadline: deadlineMatch ? deadlineMatch[1] : null
                    };
                }
                return { task: text, assignee: null, deadline: null };
            });
        }
    }

    // Validate result has content
    if (result.main || result.keyPoints.length > 0) {
        return result;
    }

    return null;
}

    /**
     * ═══════════════════════════════════════════════════════════════
     * CAPTION MANAGEMENT
     * ═══════════════════════════════════════════════════════════════
     */

    /**
     * Add caption text
     */
    addText(text, speaker = null, timestamp = null) {
        if (!text || !text.trim()) {
            return;
        }

        const caption = {
            text: text.trim(),
            speaker: speaker,
            timestamp: timestamp || new Date().toISOString(),
            addedAt: Date.now()
        };

        this.captions.push(caption);

        // Trim if exceeded max
        if (this.captions.length > this.settings.maxCaptions) {
            const removed = this.captions.shift();
            console.log('[SummarizerManager] 🗑️ Removed old caption');
        }

        console.log('[SummarizerManager] ➕ Caption added:', {
            text: text.substring(0, 50) + '...',
            speaker: speaker,
            total: this.captions.length
        });

        // Callback
        if (this.onCaptionAdded) {
            this.onCaptionAdded(caption);
        }
    }

    /**
     * Add multiple captions
     */
    addBatch(captions) {
        console.log('[SummarizerManager] 📦 Adding batch:', captions.length);
        
        captions.forEach(caption => {
            this.addText(caption.text, caption.speaker, caption.timestamp);
        });
    }

    /**
     * Get all captions
     */
    getCaptions() {
        return [...this.captions];
    }

    /**
     * Get captions count
     */
    getCaptionsCount() {
        return this.captions.length;
    }

    /**
     * Clear all captions
     */
    clearCaptions() {
        const count = this.captions.length;
        this.captions = [];
        console.log('[SummarizerManager] 🗑️ Cleared', count, 'captions');
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * SUMMARY GENERATION
     * ═══════════════════════════════════════════════════════════════
     */

    /**
     * Generate summary from current captions
     * ✅ PHIÊN BẢN MỚI: Chấp nhận 'captions' làm tham số
     */
    async generateSummary(captions, options = {}) { // <--- THAY ĐỔI 1
        console.log('[SummarizerManager] 📝 Generating summary...');
        
        // THAY ĐỔI 2: Kiểm tra 'captions' truyền vào, không phải 'this.captions'
        if (!captions || captions.length === 0) {
            const errorMsg = 'Không có phụ đề để tóm tắt (tham số rỗng)';
            console.warn(`[SummarizerManager] ⚠ ${errorMsg}`);
            
            // Trả về cấu trúc lỗi mà summaryrenderer.js hiểu được
            return {
                main: "Chưa có nội dung tóm tắt.",
                keyPoints: [errorMsg],
                decisions: [],
                actionItems: [],
                modelId: "N/A"
            };
        }

        const summaryOptions = {
            language: options.language || this.settings.language,
            style: options.style || this.settings.style,
            includeTimestamps: options.includeTimestamps ?? this.settings.includeTimestamps,
            includeSpeakers: options.includeSpeakers ?? this.settings.includeSpeakers
        };

        console.log('[SummarizerManager] 📊 Options:', summaryOptions);

        try {
            // THAY ĐỔI 3: Dùng 'captions' truyền vào, không phải 'this.captions'
            const prompt = this.racingHelper.buildSummaryPrompt(captions, summaryOptions);
            
            const result = await this.racingHelper.sendSingle(prompt, {
                temperature: 0.5,
                maxTokens: 2000,
                ...options,
                jsonResponse: true
            });

            console.log('[SummarizerManager] ✓ Raw response received:', result.response);

            const parsedSummary = this._safeParseSummaryJSON(result.response);

            const finalSummaryObject = {
                ...parsedSummary,
                model: result.modelId,
                provider: result.provider,
                generatedAt: new Date().toISOString(),
                // THAY ĐỔI 4: Đếm 'captions' truyền vào
                captionsCount: captions.length 
            };

            console.log('[SummarizerManager] ✓ Summary parsed:', finalSummaryObject);

            if (this.onSummaryGenerated) {
                this.onSummaryGenerated(finalSummaryObject);
            }

            return finalSummaryObject;

        } catch (error) {
            console.error('[SummarizerManager] ✗ Summary generation failed:', error);
            
            if (this.onError) {
                this.onError(error);
            }
            
            return {
                main: "Lỗi khi tạo tóm tắt.",
                keyPoints: [error.message],
                decisions: [],
                actionItems: [],
                modelId: "Error"
            };
        }
    }

    /**
     * Generate and export summary
     */
    async generateAndExport(format = 'text') {
        console.log('[SummarizerManager] 📤 Generating and exporting...');
        
        try {
            const summary = await this.generateSummary();
            
            // Format summary
            let exportContent;
            
            switch (format) {
                case 'text':
                    exportContent = this.formatAsText(summary);
                    break;
                case 'markdown':
                    exportContent = this.formatAsMarkdown(summary);
                    break;
                case 'json':
                    exportContent = JSON.stringify(summary, null, 2);
                    break;
                default:
                    exportContent = this.formatAsText(summary);
            }

            // Download
            this.downloadSummary(exportContent, format);
            
            console.log('[SummarizerManager] ✓ Exported:', format);

            return summary;

        } catch (error) {
            console.error('[SummarizerManager] ✗ Export failed:', error);
            throw error;
        }
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * FORMATTING
     * ═══════════════════════════════════════════════════════════════
     */

    /**
     * Format summary as plain text
     */
    formatAsText(summary) {
        const header = `
═══════════════════════════════════════════════════
MEETING SUMMARY
Generated: ${new Date(summary.generatedAt).toLocaleString()}
Captions: ${summary.captionsCount}
Model: ${summary.modelId}
═══════════════════════════════════════════════════

`;

        return header + summary.content + '\n\n' + this.formatCaptionsAsText();
    }

    /**
     * Format summary as Markdown
     */
    formatAsMarkdown(summary) {
        const header = `# Meeting Summary

**Generated:** ${new Date(summary.generatedAt).toLocaleString()}  
**Captions:** ${summary.captionsCount}  
**Model:** ${summary.modelId}

---

`;

        const captionsSection = `

---

## Full Transcript

${this.formatCaptionsAsMarkdown()}
`;

        return header + summary.content + captionsSection;
    }

    /**
     * Format captions as text
     */
    formatCaptionsAsText() {
        let text = 'FULL TRANSCRIPT\n' + '='.repeat(50) + '\n\n';
        
        this.captions.forEach((caption, index) => {
            let line = `[${index + 1}] `;
            
            if (this.settings.includeTimestamps) {
                line += `${caption.timestamp} `;
            }
            
            if (this.settings.includeSpeakers && caption.speaker) {
                line += `${caption.speaker}: `;
            }
            
            line += caption.text;
            text += line + '\n';
        });

        return text;
    }

    /**
     * Format captions as Markdown
     */
    formatCaptionsAsMarkdown() {
        let markdown = '';
        
        this.captions.forEach((caption, index) => {
            let line = `${index + 1}. `;
            
            if (this.settings.includeTimestamps) {
                line += `*${caption.timestamp}* `;
            }
            
            if (this.settings.includeSpeakers && caption.speaker) {
                line += `**${caption.speaker}:** `;
            }
            
            line += caption.text;
            markdown += line + '\n';
        });

        return markdown;
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * EXPORT
     * ═══════════════════════════════════════════════════════════════
     */

    /**
     * Download summary as file
     */
    downloadSummary(content, format = 'text') {
        const extensions = {
            text: 'txt',
            markdown: 'md',
            json: 'json'
        };

        const mimeTypes = {
            text: 'text/plain',
            markdown: 'text/markdown',
            json: 'application/json'
        };

        const filename = `meeting-summary-${Date.now()}.${extensions[format] || 'txt'}`;
        const blob = new Blob([content], { type: mimeTypes[format] || 'text/plain' });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        
        URL.revokeObjectURL(url);
        
        console.log('[SummarizerManager] 💾 Downloaded:', filename);
    }

    /**
     * Create Google Doc (via background)
     */
    async createGoogleDoc(summary) {
        console.log('[SummarizerManager] 📄 Creating Google Doc...');
        
        try {
            const content = this.formatAsText(summary);
            
            const response = await chrome.runtime.sendMessage({
                action: 'createGoogleDoc',
                title: `Meeting Summary - ${new Date().toLocaleDateString()}`,
                content: content
            });

            if (response.success) {
                console.log('[SummarizerManager] ✓ Google Doc created');
                return response;
            } else {
                throw new Error(response.error || 'Failed to create Google Doc');
            }

        } catch (error) {
            console.error('[SummarizerManager] ✗ Google Doc creation failed:', error);
            throw error;
        }
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * AUTO-SAVE
     * ═══════════════════════════════════════════════════════════════
     */

    /**
     * Start auto-save
     */
    startAutoSave(interval = 30000) {
        console.log('[SummarizerManager] 💾 Auto-save started:', interval, 'ms');
        
        this.stopAutoSave();
        
        this.autoSaveTimer = setInterval(() => {
            this.saveCaptions();
        }, interval);
    }

    /**
     * Stop auto-save
     */
    stopAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
            console.log('[SummarizerManager] 💾 Auto-save stopped');
        }
    }

    /**
     * Save captions to storage
     */
    async saveCaptions() {
        try {
        // ✅ ADD THIS CHECK
        if (!chrome.runtime?.id) {
            console.warn('[SummarizerManager] ⚠️ Extension context invalidated');
            return;
        }
            const meetingId = this.getCurrentMeetingId();
            
            await chrome.storage.local.set({
                [`meet_captions_${meetingId}`]: {
                    captions: this.captions,
                    savedAt: Date.now()
                }
            });

            console.log('[SummarizerManager] 💾 Captions saved:', this.captions.length);

        } catch (error) {
            console.error('[SummarizerManager] ✗ Save failed:', error);
        }
    }

    /**
     * Load captions from storage
     */
    async loadCaptions() {
        try {
        // ✅ ADD THIS CHECK
        if (!chrome.runtime?.id) {
            console.warn('[SummarizerManager] ⚠️ Extension context invalidated');
            return;
        }
            const meetingId = this.getCurrentMeetingId();
            const result = await chrome.storage.local.get([`meet_captions_${meetingId}`]);
            
            const data = result[`meet_captions_${meetingId}`];
            
            if (data && data.captions) {
                this.captions = data.captions;
                console.log('[SummarizerManager] 💾 Captions loaded:', this.captions.length);
            }

        } catch (error) {
            console.error('[SummarizerManager] ✗ Load failed:', error);
        }
    }

    /**
     * Get current meeting ID from URL
     */
    getCurrentMeetingId() {
        const match = window.location.pathname.match(/\/([a-z]{3}-[a-z]{4}-[a-z]{3})/);
        return match ? match[1] : 'unknown';
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * SETTINGS
     * ═══════════════════════════════════════════════════════════════
     */

    /**
     * Update settings
     */
    updateSettings(newSettings) {
        this.settings = {
            ...this.settings,
            ...newSettings
        };
        
        console.log('[SummarizerManager] ⚙️ Settings updated:', this.settings);
    }

    /**
     * Get current settings
     */
    getSettings() {
        return { ...this.settings };
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * CALLBACKS
     * ═══════════════════════════════════════════════════════════════
     */

    /**
     * Set callbacks
     */
    setOnCaptionAdded(callback) {
        this.onCaptionAdded = callback;
    }

    setOnSummaryGenerated(callback) {
        this.onSummaryGenerated = callback;
    }

    setOnError(callback) {
        this.onError = callback;
    }

    /**
     * ═══════════════════════════════════════════════════════════════
     * DEBUG
     * ═══════════════════════════════════════════════════════════════
     */

    /**
     * Log current status
     */
    logStatus() {
        console.log('[SummarizerManager] 📊 Status:', {
            captions: this.captions.length,
            settings: this.settings,
            autoSave: this.autoSaveTimer !== null
        });
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SummarizerManager;
}

// Make available globally
window.SummarizerManager = SummarizerManager;

console.log('[SummarizerManager] 📝 Module loaded ✓');
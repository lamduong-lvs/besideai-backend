/**
 * Google Docs Exporter
 * Tạo và chia sẻ Google Docs từ summary
 *
 * *** PHIÊN BẢN CẬP NHẬT (i18n) ***
 * - Thay thế tất cả các chuỗi văn bản (Error, Tiêu đề) bằng window.Lang.get()
 * - Lấy ngôn ngữ hiện tại để định dạng ngày giờ
 */

class GoogleDocsExporter {
    constructor() {
        this.cachedDocLinks = new Map(); // Cache links theo meeting ID
        this.currentMeetingId = this.getMeetingId();
    }

    /**
     * Get meeting ID from URL
     */
    getMeetingId() {
        const match = window.location.pathname.match(/\/([a-z]{3}-[a-z]{4}-[a-z]{3})/);
        return match ? match[1] : 'unknown';
    }

    /**
     * Get auth token
     * (Cập nhật i18n)
     */
    async getAuthToken() {
        console.log('[GoogleDocsExporter] Đang yêu cầu token từ background script...');
        
        // Thoát sớm nếu i18n.js chưa sẵn sàng
        if (!window.Lang) {
            console.error("GoogleDocsExporter: window.Lang (i18n.js) is not ready.");
            throw new Error("i18n service not loaded.");
        }
        
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ action: "auth_get_token" }, (response) => {
                
                if (chrome.runtime.lastError) {
                    console.error('[GoogleDocsExporter] Lỗi khi gửi tin nhắn:', chrome.runtime.lastError.message);
                    // Dịch lỗi
                    return reject(new Error(window.Lang.get('errorConnectionRetry')));
                }
                
                if (response && response.success && response.token) {
                    console.log('[GoogleDocsExporter] Đã nhận được token.');
                    resolve(response.token);
                } else {
                    // Dịch lỗi
                    const errorMsg = response?.error || window.Lang.get('errorAuthNoLogin');
                    console.error('[GoogleDocsExporter] Không lấy được token:', errorMsg);
                    reject(new Error(errorMsg));
                }
            });
        });
    }

    /**
     * Export summary to Google Doc
     * (Cập nhật i18n)
     */
    async exportToGoogleDoc(summary, meetingId = null) {
        // Thoát sớm nếu i18n.js chưa sẵn sàng
        if (!window.Lang) throw new Error("i18n service not loaded.");
        
        const id = meetingId || this.currentMeetingId;
        
        if (this.cachedDocLinks.has(id)) {
            console.log('[GoogleDocsExporter] Using cached link');
            return this.cachedDocLinks.get(id);
        }

        try {
            console.log('[GoogleDocsExporter] Creating new Google Doc...');

            const token = await this.getAuthToken();

            // Dịch tiêu đề (dùng key + biến)
            const title = window.Lang.get('docTitleMeetingSummary', { 
                date: new Date().toLocaleDateString(window.Lang.getCurrentLanguage()) 
            });
            const docId = await this.createDocument(token, title);

            await this.addContent(token, docId, summary);
            await this.shareDocument(token, docId);

            const link = `https://docs.google.com/document/d/${docId}/edit`;
            this.cachedDocLinks.set(id, link);

            console.log('[GoogleDocsExporter] ✓ Document created:', link);
            return link;

        } catch (error) {
            console.error('[GoogleDocsExporter] ✗ Export failed:', error);
            throw error;
        }
    }

    /**
     * Create empty document
     * (Không thay đổi)
     */
    async createDocument(token, title) { 
        const response = await fetch('https://docs.googleapis.com/v1/documents', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: title 
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to create document: ${error}`);
        }

        const data = await response.json();
        return data.documentId;
    }

    /**
     * Add content to document
     * (Không thay đổi)
     */
    async addContent(token, docId, summary) {
        const requests = this.buildContentRequests(summary);

        const response = await fetch(
            `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ requests })
            }
        );

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to add content: ${error}`);
        }

        return await response.json();
    }

    /**
     * Build content requests for batch update
     * (Cập nhật i18n)
     */
    buildContentRequests(summary) {
        // Thoát sớm nếu i18n.js chưa sẵn sàng
        if (!window.Lang) throw new Error("i18n service not loaded.");
        
        const requests = [];
        let index = 1;

        const addText = (text, style = {}) => {
            requests.push({
                insertText: {
                    location: { index },
                    text: text
                }
            });

            if (style.bold || style.fontSize || style.namedStyle) {
                const endIndex = index + text.length;
                const textStyle = {};

                if (style.bold) textStyle.bold = true;
                if (style.fontSize) textStyle.fontSize = { magnitude: style.fontSize, unit: 'PT' };

                requests.push({
                    updateTextStyle: {
                        range: { startIndex: index, endIndex: endIndex },
                        textStyle: textStyle,
                        fields: Object.keys(textStyle).join(',')
                    }
                });

                if (style.namedStyle) {
                    requests.push({
                        updateParagraphStyle: {
                            range: { startIndex: index, endIndex: endIndex },
                            paragraphStyle: { namedStyleType: style.namedStyle },
                            fields: 'namedStyleType'
                        }
                    });
                }
            }
            index += text.length;
        };

        // Lấy ngôn ngữ hiện tại
        const langCode = window.Lang.getCurrentLanguage();

        // Title (Đã dịch)
        addText(window.Lang.get('docHeaderSummary') + '\n', { bold: true, fontSize: 18, namedStyle: 'HEADING_1' });
        addText(`\n📅 ${new Date().toLocaleString(langCode)}\n\n`, { fontSize: 10 });

        // Main summary (Đã dịch)
        addText(window.Lang.get('docHeaderMain') + '\n', { bold: true, fontSize: 14, namedStyle: 'HEADING_2' });
        addText(`${summary.main}\n\n`);

        // Key points (Đã dịch)
        if (summary.keyPoints?.length) {
            addText(window.Lang.get('docHeaderKeyPoints') + '\n', { bold: true, fontSize: 14, namedStyle: 'HEADING_2' });
            summary.keyPoints.forEach((point, i) => {
                addText(`${i + 1}. ${point}\n`);
            });
            addText('\n');
        }

        // Action items (Đã dịch)
        if (summary.actionItems?.length) {
            addText(window.Lang.get('docHeaderActions') + '\n', { bold: true, fontSize: 14, namedStyle: 'HEADING_2' });
            summary.actionItems.forEach((item, i) => {
                // Dịch "Chưa phân công"
                const assignee = item.assignee || window.Lang.get('docActionUnassigned');
                // Dịch "(Hạn: ...)"
                const deadline = item.deadline ? ` ${window.Lang.get('docActionDeadline', { deadline: item.deadline })}` : '';
                addText(`${i + 1}. `);
                addText(`${assignee}: `, { bold: true });
                addText(`${item.task}${deadline}\n`);
            });
            addText('\n');
        }

        // Decisions (Đã dịch)
        if (summary.decisions?.length) {
            addText(window.Lang.get('docHeaderDecisions') + '\n', { bold: true, fontSize: 14, namedStyle: 'HEADING_2' });
            summary.decisions.forEach((decision, i) => {
                addText(`${i + 1}. ${decision}\n`);
            });
        }

        return requests;
    }

    /**
     * Share document
     * (Không thay đổi)
     */
    async shareDocument(token, docId) {
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${docId}/permissions`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    role: 'reader',
                    type: 'anyone'
                })
            }
        );

        if (!response.ok) {
            console.warn('[GoogleDocsExporter] Failed to share document (may need Drive API)');
        }

        return await response.json();
    }

    /**
     * Clear cache
     * (Không thay đổi)
     */
    clearCache(meetingId = null) {
        const id = meetingId || this.currentMeetingId;
        this.cachedDocLinks.delete(id);
        console.log('[GoogleDocsExporter] Cache cleared for:', id);
    }

    /**
     * Clear all cache
     * (Không thay đổi)
     */
    clearAllCache() {
        this.cachedDocLinks.clear();
        console.log('[GoogleDocsExporter] All cache cleared');
    }
    
    /**
     * Add raw text content to document
     * (Không thay đổi)
     */
    async addRawTextContent(token, docId, rawText) {
        const requests = [
            {
                insertText: {
                    location: { index: 1 },
                    text: rawText
                }
            }
        ];

        const response = await fetch(
            `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ requests })
            }
        );

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to add raw text content: ${error}`);
        }

        return await response.json();
    }

    /**
     * Export raw text to Google Doc (cho Lịch sử hội thoại)
     * (Cập nhật i18n)
     */
    async exportRawTextToGoogleDoc(rawText, title = null) {
        // Thoát sớm nếu i18n.js chưa sẵn sàng
        if (!window.Lang) throw new Error("i18n service not loaded.");

        try {
            console.log('[GoogleDocsExporter] Creating new Google Doc for raw text...');
            
            const token = await this.getAuthToken();

            // Dịch tiêu đề mặc định
            const docTitle = title || window.Lang.get('docTitleTranscript');
            const docId = await this.createDocument(token, docTitle); 

            await this.addRawTextContent(token, docId, rawText); 
            await this.shareDocument(token, docId);

            const link = `https://docs.google.com/document/d/${docId}/edit`;

            console.log('[GoogleDocsExporter] ✓ Document created from raw text:', link);
            return link;

        } catch (error) {
            console.error('[GoogleDocsExporter] ✗ Raw text export failed:', error);
            // Cập nhật console.error
            if (error.message.includes("cache") && window.Lang) {
                console.error(window.Lang.get('errorCacheWinnerUpdate'), error);
            }
            throw error;
        }
    }
    
} // <-- Dấu } cuối cùng của LỚP (CLASS)

// Export
window.GoogleDocsExporter = GoogleDocsExporter;
console.log('[GoogleDocsExporter] 📄 Module loaded ✓');
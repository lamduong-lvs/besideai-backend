/**
 * SummaryRenderer.js
 * Render summary tab với integration SummarizerManager
 * Version: 2.0.0
 */

class SummaryRenderer {
    constructor(containerId, summarizerManager, pipWindow = null) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.summarizerManager = summarizerManager;
        this.pipWindow = pipWindow; // <-- DÒNG MỚI ĐỂ LƯU THAM CHIẾU
        
        // State
        this.currentSummary = null;
        this.isGenerating = false;
        
        console.log('[SummaryRenderer] 📄 Initialized');
        
        // Only render if container exists
        if (this.container) {
            this.render();
        } else {
            console.warn(`[SummaryRenderer] ⚠ Container '${containerId}' not found yet`);
        }
    }
	
	/**
     * (HÀM MỚI) Cập nhật thanh trạng thái chính (ở dưới cùng) một cách an toàn
     */
    updateMainStatus(text, type = 'info') {
        if (this.pipWindow && typeof this.pipWindow.setMainStatus === 'function') {
            // Dùng hàm setMainStatus của pipWindow (thanh trạng thái chính)
            this.pipWindow.setMainStatus(text, type);
        } else {
            // Fallback: Nếu không có pipWindow, tự cập nhật status của riêng nó
            this.showStatus(text, type);
        }
    }

	/**
     * Ensure container exists
     */
    ensureContainer() {
        if (!this.container) {
            this.container = document.getElementById(this.containerId);
        }
        return this.container !== null;
    }

    /**
     * Render initial UI
     */
    render() {
        if (!this.ensureContainer()) {
            console.warn('[SummaryRenderer] ⚠ Cannot render - container not found');
            return;
        }
        
        this.container.innerHTML = `
            <div class="summary-container">
                <div class="summary-header">
                    <h3>Tóm tắt cuộc họp</h3>
                    <div class="summary-actions">
                        <button id="generateSummaryBtn" class="btn btn-primary">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                            Tạo tóm tắt
                        </button>
                        <button id="exportSummaryBtn" class="btn btn-secondary" disabled>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M8 12V2m0 10l-4-4m4 4l4-4M2 14h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            </svg>
                            Xuất file
                        </button>
                    </div>
                </div>

                <div id="summaryContent" class="summary-content">
                    <div class="summary-empty">
                        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                            <path d="M16 8h32v48H16z" stroke="currentColor" stroke-width="2"/>
                            <path d="M24 20h16M24 28h16M24 36h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        <p>Chưa có tóm tắt</p>
                        <p class="text-small">Nhấn "Tạo tóm tắt" để bắt đầu</p>
                    </div>
                </div>

                <div id="summaryStatus" class="summary-status" style="display: none;">
                    <div class="status-indicator"></div>
                    <span class="status-text">Đang tạo tóm tắt...</span>
                </div>
            </div>
        `;

        this.attachEventListeners();
    }

 /**
 * Attach event listeners
 */
attachEventListeners() {
    this.reattachEventListeners();
}

/**
 * Reattach event listeners (call after re-render)
 */
reattachEventListeners() {
    const generateBtn = document.getElementById('generateSummaryBtn');
    const exportBtn = document.getElementById('exportSummaryBtn');

    if (generateBtn) {
        // Remove old listener to avoid duplicates
        const newGenerateBtn = generateBtn.cloneNode(true);
        generateBtn.parentNode.replaceChild(newGenerateBtn, generateBtn);
        
        newGenerateBtn.addEventListener('click', () => {
            console.log('[SummaryRenderer] 🖱️ Generate button clicked!');
            this.generateSummary();
        });
    }

    if (exportBtn) {
        // Remove old listener to avoid duplicates
        const newExportBtn = exportBtn.cloneNode(true);
        exportBtn.parentNode.replaceChild(newExportBtn, exportBtn);
        
        newExportBtn.addEventListener('click', () => {
            console.log('[SummaryRenderer] 🖱️ Export button clicked!');
            this.exportSummary();
        });
    }
}

    /**
     * Generate summary
     */
    async generateSummary() {
        if (this.isGenerating) return;

        console.log('[SummaryRenderer] 🔄 Generating summary...');
        
        this.isGenerating = true;
        
        // ===================================================================
        // ✅ SỬA ĐỔI: Dùng updateMainStatus
        // ===================================================================
        this.disableButton('generateSummaryBtn');
        // Lấy trạng thái gốc để khôi phục
        const originalStatus = this.pipWindow?.container.querySelector('#statusText').textContent || 'Đã sẵn sàng';
        // Cập nhật trạng thái chính
        this.updateMainStatus('Đang tạo tóm tắt...', 'loading');
        // ===================================================================

        try {
            const history = window.historyManager?.getHistory() || [];
            
            if (history.length === 0) {
                throw new Error('Không có lịch sử để tóm tắt');
            }

            const captionsForSummarizer = history.map(entry => ({
                text: entry.original,
                speaker: entry.speaker,
                timestamp: entry.timestamp
            }));

            const summary = await this.summarizerManager.generateSummary(captionsForSummarizer);
            
            if (summary.modelId === 'Error') {
                throw new Error(summary.keyPoints[0] || 'Lỗi không xác định từ manager');
            }

            this.currentSummary = summary;
            this.renderSummary(summary);
            
            // ===================================================================
            // ✅ SỬA ĐỔI: Dùng updateMainStatus
            // ===================================================================
            this.updateMainStatus('✓ Tóm tắt thành công', 'success');
            this.enableButton('exportSummaryBtn');
            
            const exportBtn = document.getElementById('exportSummaryBtn');
            console.log('[SummaryRenderer] Export button state:', {
                exists: !!exportBtn,
                disabled: exportBtn?.disabled,
                summary: !!this.currentSummary
            });
            
            // Reset trạng thái sau 3s
            setTimeout(() => this.updateMainStatus(originalStatus, 'success'), 3000);
            // ===================================================================

        } catch (error) {
            console.error('[SummaryRenderer] ❌ Generate failed:', error);
            
            const errorMessage = error.message || (error.keyPoints ? error.keyPoints[0] : 'Lỗi không xác định');
            
            // ===================================================================
            // ✅ SỬA ĐỔI: Dùng updateMainStatus
            // ===================================================================
            this.updateMainStatus(`Lỗi: ${errorMessage}`, 'error');
            
            if (typeof error === 'object' && error.main) {
                this.renderSummary(error);
            }

            // Reset trạng thái sau 5s
            setTimeout(() => this.updateMainStatus(originalStatus, 'error'), 5000);
            // ===================================================================
            
        } finally {
            this.isGenerating = false;
            this.enableButton('generateSummaryBtn');
            this.reattachEventListeners();
        }
    }

    /**
     * Render summary content
     */
    renderSummary(summary) {
        const content = document.getElementById('summaryContent');
        
        content.innerHTML = `
            <div class="summary-result">
                <div class="summary-section">
                    <h4>📋 Tóm tắt chính</h4>
                    <p>${this.formatText(summary.main || 'Không có thông tin')}</p>
                </div>

                ${summary.keyPoints && summary.keyPoints.length > 0 ? `
                    <div class="summary-section">
                        <h4>🎯 Các điểm chính</h4>
                        <ul>
                            ${summary.keyPoints.map(point => `<li>${this.formatText(point)}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}

                ${summary.actionItems && summary.actionItems.length > 0 ? `
                    <div class="summary-section">
                        <h4>✅ Hành động cần làm</h4>
                        <ul class="action-items">
                            ${summary.actionItems.map(item => `
                                <li>
                                    <strong>${item.assignee || 'Chưa phân công'}:</strong> ${this.formatText(item.task)}
                                    ${item.deadline ? `<span class="deadline">(Hạn: ${item.deadline})</span>` : ''}
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}

                ${summary.decisions && summary.decisions.length > 0 ? `
                    <div class="summary-section">
                        <h4>💡 Quyết định</h4>
                        <ul>
                            ${summary.decisions.map(decision => `<li>${this.formatText(decision)}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}

                <div class="summary-meta">
                    <small>Tạo lúc: ${new Date().toLocaleString('vi-VN')}</small>
                    <small>Model: ${summary.model || 'Unknown'}</small>
                </div>
            </div>
        `;
    }

    /**
     * Format text (handle markdown-like formatting)
     */
    formatText(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }

    /**
 * Export summary
 */
exportSummary() {
    console.log('[SummaryRenderer] 📤 exportSummary() called');
    console.log('[SummaryRenderer] Current summary:', this.currentSummary);
    
    if (!this.currentSummary) {
        console.error('[SummaryRenderer] ❌ No summary to export!');
        alert('Không có tóm tắt để xuất. Vui lòng tạo tóm tắt trước.');
        return;
    }

    const formats = [
        { label: '📄 Google Doc', value: 'gdoc' },
        { label: '📋 JSON', value: 'json' },
        { label: '📝 Markdown', value: 'md' },
        { label: '📃 Text', value: 'txt' }
    ];

    console.log('[SummaryRenderer] Showing format dialog...');
    
    this.showFormatDialog(formats, async (format) => {
        console.log('[SummaryRenderer] Format selected:', format);
        if (format === 'gdoc') {
            await this.exportToGoogleDoc();
        } else {
            this.downloadSummary(format);
        }
    });
}

    /**
     * Show format selection dialog
     */
    showFormatDialog(formats, callback) {
    console.log('[SummaryRenderer] 🎨 Creating dialog...');
    
    // Remove existing dialog if any
    const existing = document.querySelector('.format-dialog');
    if (existing) {
        existing.remove();
    }
    
    // Create dialog container
    const dialog = document.createElement('div');
    dialog.className = 'format-dialog';
    dialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    overlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
    `;
    
    // Create content
    const content = document.createElement('div');
    content.className = 'dialog-content';
    content.style.cssText = `
        position: relative;
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        z-index: 1;
    `;
    
    // Create title
    const title = document.createElement('h4');
    title.textContent = 'Chọn định dạng xuất';
    title.style.cssText = 'margin: 0 0 16px 0; color: #333;';
    
    // Create format options container
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'format-options';
    optionsContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 16px;
    `;
    
    // Create format buttons
    formats.forEach(f => {
        const btn = document.createElement('button');
        btn.className = 'format-option';
        btn.dataset.format = f.value;
        btn.textContent = f.label;
        btn.style.cssText = `
            padding: 12px 16px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            background: white;
            cursor: pointer;
            font-size: 14px;
            text-align: left;
            transition: all 0.2s;
        `;
        
        btn.addEventListener('mouseover', () => {
            btn.style.background = '#f5f5f5';
            btn.style.borderColor = '#f86a01';
        });
        
        btn.addEventListener('mouseout', () => {
            btn.style.background = 'white';
            btn.style.borderColor = '#e0e0e0';
        });
        
        btn.addEventListener('click', () => {
            console.log('[SummaryRenderer] Format selected:', f.value);
            callback(f.value);
            dialog.remove();
        });
        
        optionsContainer.appendChild(btn);
    });
    
    // Create cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-cancel';
    cancelBtn.textContent = 'Hủy';
    cancelBtn.style.cssText = `
        width: 100%;
        padding: 10px;
        border: none;
        border-radius: 8px;
        background: #f5f5f5;
        cursor: pointer;
        font-size: 14px;
    `;
    
    cancelBtn.addEventListener('mouseover', () => {
        cancelBtn.style.background = '#e0e0e0';
    });
    
    cancelBtn.addEventListener('mouseout', () => {
        cancelBtn.style.background = '#f5f5f5';
    });
    
    cancelBtn.addEventListener('click', () => {
        console.log('[SummaryRenderer] Dialog cancelled');
        dialog.remove();
    });
    
    // Assemble dialog
    content.appendChild(title);
    content.appendChild(optionsContainer);
    content.appendChild(cancelBtn);
    dialog.appendChild(overlay);
    dialog.appendChild(content);
    
    // Add click on overlay to close
    overlay.addEventListener('click', () => {
        console.log('[SummaryRenderer] Dialog closed via overlay');
        dialog.remove();
    });
    
    // Append to body
    console.log('[SummaryRenderer] Appending dialog to body...');
    document.body.appendChild(dialog);
    
    console.log('[SummaryRenderer] ✅ Dialog setup complete');
}

    /**
     * Download summary in specified format
     */
    downloadSummary(format) {
    let content, filename, mimeType;

    const timestamp = new Date().toISOString().split('T')[0];

    switch (format) {
        case 'json':
            content = JSON.stringify(this.currentSummary, null, 2);
            filename = `meeting-summary-${timestamp}.json`;
            mimeType = 'application/json';
            break;

        case 'md':
            content = this.formatAsMarkdown();
            filename = `meeting-summary-${timestamp}.md`;
            mimeType = 'text/markdown';
            break;

        case 'txt':
            content = this.formatAsText();
            filename = `meeting-summary-${timestamp}.txt`;
            mimeType = 'text/plain';
            break;

        default:
            return;
    }

    // Create and trigger download
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    console.log(`[SummaryRenderer] 📥 Exported as ${format}`);
}

    /**
     * Format as Markdown
     */
    formatAsMarkdown() {
        const s = this.currentSummary;
        let md = `# Tóm tắt cuộc họp\n\n`;
        md += `📅 ${new Date().toLocaleString('vi-VN')}\n\n`;
        
        md += `## Tóm tắt chính\n\n${s.main}\n\n`;
        
        if (s.keyPoints?.length) {
            md += `## Các điểm chính\n\n`;
            s.keyPoints.forEach(p => md += `- ${p}\n`);
            md += `\n`;
        }
        
        if (s.actionItems?.length) {
            md += `## Hành động cần làm\n\n`;
            s.actionItems.forEach(item => {
                md += `- **${item.assignee || 'TBD'}**: ${item.task}`;
                if (item.deadline) md += ` *(Hạn: ${item.deadline})*`;
                md += `\n`;
            });
            md += `\n`;
        }
        
        if (s.decisions?.length) {
            md += `## Quyết định\n\n`;
            s.decisions.forEach(d => md += `- ${d}\n`);
            md += `\n`;
        }
        
        return md;
    }

    /**
     * Format as plain text
     */
    formatAsText() {
        const s = this.currentSummary;
        let txt = `TÓM TẮT CUỘC HỌP\n`;
        txt += `${'='.repeat(50)}\n`;
        txt += `Ngày: ${new Date().toLocaleString('vi-VN')}\n\n`;
        
        txt += `TÓM TẮT CHÍNH:\n${s.main}\n\n`;
        
        if (s.keyPoints?.length) {
            txt += `CÁC ĐIỂM CHÍNH:\n`;
            s.keyPoints.forEach((p, i) => txt += `${i + 1}. ${p}\n`);
            txt += `\n`;
        }
        
        if (s.actionItems?.length) {
            txt += `HÀNH ĐỘNG CẦN LÀM:\n`;
            s.actionItems.forEach((item, i) => {
                txt += `${i + 1}. ${item.assignee || 'TBD'}: ${item.task}`;
                if (item.deadline) txt += ` (Hạn: ${item.deadline})`;
                txt += `\n`;
            });
            txt += `\n`;
        }
        
        if (s.decisions?.length) {
            txt += `QUYẾT ĐỊNH:\n`;
            s.decisions.forEach((d, i) => txt += `${i + 1}. ${d}\n`);
        }
        
        return txt;
    }
	
/**
     * Export to Google Doc
     */
    async exportToGoogleDoc() {
        // ===================================================================
        // ✅ SỬA ĐỔI: Dùng updateMainStatus
        // ===================================================================
        // Lấy trạng thái gốc để khôi phục
        const originalStatus = this.pipWindow?.container.querySelector('#statusText').textContent || 'Đã sẵn sàng';

        try {
            // Cập nhật trạng thái chính
            this.updateMainStatus('Đang tạo Google Doc...', 'loading');
            // ===================================================================

            // Initialize exporter if not exists
            if (!window.googleDocsExporter) {
                if (typeof GoogleDocsExporter === 'undefined') {
                    throw new Error('GoogleDocsExporter chưa được load. Vui lòng tải lại trang.');
                }
                window.googleDocsExporter = new GoogleDocsExporter();
            }

            // Export
            const link = await window.googleDocsExporter.exportToGoogleDoc(this.currentSummary);

            // Show link popup
            this.showLinkPopup(link);

            // ===================================================================
            // ✅ SỬA ĐỔI: Dùng updateMainStatus
            // ===================================================================
            this.updateMainStatus('✓ Google Doc đã tạo', 'success');
            // Reset trạng thái sau 3s
            setTimeout(() => this.updateMainStatus(originalStatus, 'success'), 3000);
            // ===================================================================

        } catch (error) {
            console.error('[SummaryRenderer] ✗ Google Doc export failed:', error);
            // ===================================================================
            // ✅ SỬA ĐỔI: Dùng updateMainStatus
            // ===================================================================
            this.updateMainStatus(`Lỗi GDoc: ${error.message}`, 'error');
            // Reset trạng thái sau 5s
            setTimeout(() => this.updateMainStatus(originalStatus, 'error'), 5000);
            // ===================================================================
        }
    }

/**
 * Show link popup with copy button
 */
showLinkPopup(link) {
    // Remove existing popup if any
    const existing = document.querySelector('.link-popup');
    if (existing) existing.remove();

    const popup = document.createElement('div');
    popup.className = 'link-popup';
    popup.innerHTML = `
        <div class="popup-overlay"></div>
        <div class="popup-content">
            <h4>📄 Google Doc đã tạo thành công!</h4>
            <div class="link-container">
                <input type="text" readonly value="${link}" id="docLinkInput">
                <button id="copyLinkBtn" class="btn btn-primary">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <rect x="5" y="5" width="8" height="10" rx="1" stroke="currentColor" stroke-width="1.5"/>
                        <path d="M3 3h8v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                    Copy
                </button>
            </div>
            <div class="popup-actions">
                <button id="openDocBtn" class="btn btn-secondary">Mở Doc</button>
                <button id="closePopupBtn" class="btn btn-secondary">Đóng</button>
            </div>
        </div>
    `;

    document.body.appendChild(popup);

    // Copy button
    document.getElementById('copyLinkBtn').addEventListener('click', async () => {
        const input = document.getElementById('docLinkInput');
        input.select();
        
        try {
            await navigator.clipboard.writeText(link);
            const btn = document.getElementById('copyLinkBtn');
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '✓ Đã copy';
            btn.style.background = '#4caf50';
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.style.background = '';
            }, 2000);
        } catch (err) {
            alert('Không thể copy link. Vui lòng copy thủ công.');
        }
    });

    // Open doc button
    document.getElementById('openDocBtn').addEventListener('click', () => {
        window.open(link, '_blank');
    });

    // Close button
    document.getElementById('closePopupBtn').addEventListener('click', () => {
        document.body.removeChild(popup);
    });

    // Click overlay to close
    popup.querySelector('.popup-overlay').addEventListener('click', () => {
        document.body.removeChild(popup);
    });
}

    /**
     * Show status message
     */
    showStatus(text, type = 'info') {
        const status = document.getElementById('summaryStatus');
        const indicator = status.querySelector('.status-indicator');
        const textEl = status.querySelector('.status-text');

        textEl.textContent = text;
        indicator.className = `status-indicator status-${type}`;
        status.style.display = 'flex';
    }

    /**
     * Hide status message
     */
    hideStatus() {
        const status = document.getElementById('summaryStatus');
        status.style.display = 'none';
    }

    /**
     * Disable button
     */
    disableButton(id) {
        const btn = document.getElementById(id);
        if (btn) btn.disabled = true;
    }

    /**
     * Enable button
     */
    enableButton(id) {
        const btn = document.getElementById(id);
        if (btn) btn.disabled = false;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SummaryRenderer;
}

window.SummaryRenderer = SummaryRenderer;
console.log('[SummaryRenderer] 📄 Module loaded ✓');
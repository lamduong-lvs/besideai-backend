/*
 * File: modules/gmail/aiSummarizer/email-dom-reader.js
 * ĐỌC EMAIL TRỰC TIẾP TỪ DOM
 *
 * *** PHIÊN BẢN CẬP NHẬT (i18n) ***
 * - Thay thế các chuỗi fallback (Unknown, No Subject) bằng window.Lang.get()
 */

window.EmailDOMReader = {
    /**
     * Lấy thread ID từ URL hoặc DOM
     * (Không thay đổi)
     */
    getThreadId: () => {
        try {
            // Phương án 1: Parse từ URL
            const hash = window.location.hash;
            const match = hash.match(/\/([a-zA-Z0-9_-]+)$/);
            if (match && match[1]) {
                console.log(`📧 Thread ID từ URL: ${match[1]}`);
                return match[1];
            }

            // Phương án 2: Tìm trong DOM
            const threadPaneEl = document.querySelector('[data-thread-perm-id]');
            if (threadPaneEl) {
                const id = threadPaneEl.getAttribute('data-thread-perm-id');
                console.log(`📧 Thread ID từ DOM: ${id}`);
                return id;
            }

            console.warn('📧 Không tìm thấy thread ID');
            return null;
        } catch (e) {
            console.error('📧 Lỗi khi lấy thread ID:', e);
            return null;
        }
    },

    /**
     * Mở rộng tất cả email bị collapse
     * (Không thay đổi - console logs không cần dịch)
     */
    expandAllEmails: async () => {
        try {
            console.log('📧 Bắt đầu mở rộng email (phiên bản cải tiến)...');
            let expandedSomething = false; 

            for (let i = 0; i < 5; i++) {
                expandedSomething = false; 

                // 1: Click nút "Mở rộng tất cả"
                const expandAllButton = document.querySelector(
                    'button[aria-label="Mở rộng tất cả"], button[aria-label="Expand all"], button[jsname="tRarif"]'
                );
                if (expandAllButton) {
                    console.log('📧 Tìm thấy nút "Mở rộng tất cả" chính, đang click...');
                    expandAllButton.click();
                    expandedSomething = true;
                    await new Promise(r => setTimeout(r, 500)); 
                }

                // 2: Click vào các mục "X thư cũ hơn"
                const stackButtons = document.querySelectorAll(
                    'span.adx[role="button"], div.bhZ[role="button"]'
                );
                if (stackButtons.length > 0) {
                    console.log(`📧 Tìm thấy ${stackButtons.length} luồng "thư cũ"`);
                    for (const btn of stackButtons) {
                        btn.click();
                        expandedSomething = true;
                        await new Promise(r => setTimeout(r, 300));
                    }
                }

                // 3: Click vào TỪNG email bị thu gọn
                const collapsedEmails = document.querySelectorAll('div.kv[aria-expanded="false"]');
                if (collapsedEmails.length > 0) {
                    console.log(`📧 Tìm thấy ${collapsedEmails.length} email riêng lẻ bị thu gọn`);
                    for (const emailHeader of collapsedEmails) {
                        emailHeader.click();
                        expandedSomething = true;
                        await new Promise(r => setTimeout(r, 300));
                    }
                }

                // 4: Click nút "Show trimmed content"
                const trimmedButtons = document.querySelectorAll(
                    'div.yj6qo[role="button"], [aria-label*="Show trimmed content"]'
                );
                if (trimmedButtons.length > 0) {
                    console.log(`📧 Tìm thấy ${trimmedButtons.length} nút "Show trimmed content"`);
                    for (const btn of trimmedButtons) {
                        btn.click();
                        expandedSomething = true;
                        await new Promise(r => setTimeout(r, 200));
                    }
                }

                if (!expandedSomething) {
                    console.log(`📧 Không còn gì để mở rộng ở lần lặp ${i + 1}`);
                    break;
                }
                
                await new Promise(r => setTimeout(r, 500));
            }

            console.log('✅ Đã hoàn tất mở rộng email.');
            await new Promise(r => setTimeout(r, 1000));

        } catch (e) {
            console.error('❌ Lỗi khi mở rộng email:', e);
        }
    },

    /**
     * Thu gọn tất cả email
     * (Không thay đổi - console logs không cần dịch)
     */
    collapseAllEmails: async (leaveLastOpen = true) => {
        try {
            console.log(`📧 Bắt đầu thu gọn email... Giữ email cuối: ${leaveLastOpen}`);

            // Phương án 1: Tìm nút "Thu gọn tất cả"
            const collapseAllButton = document.querySelector(
                'button[aria-label="Thu gọn tất cả"], button[aria-label="Collapse all"]'
            );
            
            if (collapseAllButton) {
                console.log('📧 Tìm thấy nút "Thu gọn tất cả", đang click...');
                collapseAllButton.click();
                await new Promise(r => setTimeout(r, 500));
                
                if (leaveLastOpen) {
                    const allEmails = document.querySelectorAll('div.kv, div.h7'); 
                    if (allEmails.length > 0) {
                        const lastEmail = allEmails[allEmails.length - 1];
                        if (lastEmail.getAttribute('aria-expanded') === 'false') {
                            console.log('📧 Mở lại email cuối cùng...');
                            lastEmail.click();
                            await new Promise(r => setTimeout(r, 300));
                        }
                    }
                }
                return; 
            }

            // Phương án 2: Thu gọn từng cái
            const expandedEmails = document.querySelectorAll(
                'div.h7[aria-expanded="true"], div.kv[aria-expanded="true"]'
            );
            
            if (expandedEmails.length === 0) {
                console.log('📧 Không tìm thấy email nào đang mở để thu gọn.');
                return;
            }

            console.log(`📧 Tìm thấy ${expandedEmails.length} email đang mở.`);
            
            const limit = leaveLastOpen ? expandedEmails.length - 1 : expandedEmails.length;
            
            for (let i = 0; i < limit; i++) {
                const email = expandedEmails[i];
                console.log(`📧 Đang thu gọn email ${i + 1}...`);
                email.click();
                await new Promise(r => setTimeout(r, 100)); 
            }

            console.log('✅ Đã thu gọn email.');

        } catch (e) {
            console.error('❌ Lỗi khi thu gọn email:', e);
        }
    },

    /**
     * Đọc tất cả email trong thread từ DOM
     * (Cập nhật i18n)
     */
    readEmails: async () => {
        // Thoát nếu i18n.js chưa sẵn sàng
        if (!window.Lang) {
            console.error("EmailDOMReader: window.Lang (i18n.js) is not ready.");
            // Trả về null để báo hiệu lỗi
            return null;
        }

        try {
            // BƯỚC 1: Mở rộng
            await window.EmailDOMReader.expandAllEmails();

            // BƯỚC 2: Tìm và đọc
            let messageEls = document.querySelectorAll('[data-message-id]:not([data-message-id=""])');

            if (!messageEls || messageEls.length === 0) {
                console.warn('📧 Không tìm thấy email nào trong DOM (sau khi lọc)');
                await window.EmailDOMReader.collapseAllEmails(true);
                return null;
            }

            console.log(`📧 Tìm thấy ${messageEls.length} email thật trong DOM`);

            const emails = [];

            for (let index = 0; index < messageEls.length; index++) {
                const msgEl = messageEls[index];

                try {
                    // Lấy người gửi
                    const fromEl = msgEl.querySelector('[email]') || msgEl.querySelector('.gD');
                    // CẬP NHẬT i18n: Dịch fallback "Unknown"
                    const fromName = fromEl ? (fromEl.getAttribute('name') || fromEl.textContent.trim()) : window.Lang.get('unknownSender');
                    const fromEmail = fromEl ? (fromEl.getAttribute('email') || 'unknown@example.com') : 'unknown@example.com';

                    // Lấy thời gian
                    const timeEl = msgEl.querySelector('.g3[title]') ||
                                   msgEl.querySelector('[data-tooltip*="GMT"]') ||
                                   msgEl.querySelector('span[title]');
                    const timestamp = timeEl ? (timeEl.getAttribute('title') || timeEl.getAttribute('data-tooltip') || timeEl.textContent) : new Date().toLocaleString(window.Lang.getCurrentLanguage()); // Dùng ngôn ngữ hiện tại

                    // Lấy nội dung
                    let contentHtml = '';
                    let contentText = '';

                    const bodySelectors = [
                        '.a3s.aiL', 
                        '.ii.gt',   
                        '[dir="ltr"]',
                        '.gs .a3s' 
                    ];

                    let bodyEl = null;
                    for (const selector of bodySelectors) {
                        bodyEl = msgEl.querySelector(selector);
                        if (bodyEl && bodyEl.closest('[data-message-id]').isSameNode(msgEl) && bodyEl.textContent.trim().length > 10) {
                            break;
                        }
                    }

                    if (bodyEl) {
                        const clonedBody = bodyEl.cloneNode(true);
                        
                        const quotes = clonedBody.querySelectorAll('blockquote, .gmail_quote, .gmail_extra, .adL');
                        quotes.forEach(q => q.remove());

                        contentHtml = clonedBody.innerHTML || '';

                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = contentHtml;
                        contentText = (tempDiv.textContent || tempDiv.innerText || '').trim();
                        
                        contentText = contentText.replace(/[\u200B-\u200D\uFEFF]/g, ''); 
                        contentText = contentText.split('\n')
                            .map(line => line.trim())
                            .filter(line => line.length > 0)
                            .join('\n');

                        console.log(`📧 Email ${index + 1} (${fromName}): ${contentText.substring(0, 80)}...`);

                        if (contentText.length > 10) { 
                            emails.push({
                                from: {
                                    name: fromName,
                                    address: fromEmail
                                },
                                timestamp: timestamp,
                                content_html: contentHtml,
                                content_text: contentText
                            });
                        } else {
                             console.warn(`📧 Email ${index + 1} (${fromName}): Nội dung quá ngắn sau khi lọc quotes, có thể là rỗng.`);
                        }
                    } else {
                        console.warn(`📧 Email ${index + 1} (${fromName}): Không tìm thấy nội dung (bodyEl)`);
                    }

                } catch (e) {
                    console.error(`📧 Lỗi khi đọc email ${index + 1}:`, e);
                }
            }

            // Lấy subject
            const subjectEl = document.querySelector('h2.hP') ||
                             document.querySelector('[data-legacy-thread-id] h2') ||
                             document.querySelector('.hP');
            // CẬP NHẬT i18n: Dịch fallback "(No Subject)"
            const subject = subjectEl ? subjectEl.textContent.trim() : window.Lang.get('noSubject');

            console.log(`📧 Subject: ${subject}`);
            console.log(`✅ Đã đọc thành công ${emails.length} email (có nội dung)`);

            // BƯỚC 3: Thu gọn
            await window.EmailDOMReader.collapseAllEmails(true);

            if (emails.length === 0) {
                console.error('❌ Không đọc được email nào có nội dung!');
                return null;
            }

            return {
                subject: subject,
                emails: emails
            };

        } catch (e) {
            console.error('📧 Lỗi nghiêm trọng khi đọc email từ DOM:', e);
            await window.EmailDOMReader.collapseAllEmails(true);
            return null;
        }
    }
};

console.log('✅ EmailDOMReader loaded (v5 - Fixed selector)');
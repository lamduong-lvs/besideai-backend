// background/listeners/auth-listeners.js
// Auth event listeners

import { auth, SESSION_EVENTS } from '../../modules/auth/auth.js';
import { getLang } from '../helpers/i18n.js';

export function setupAuthListeners() {
    // Lắng nghe sự kiện Auth và thông báo cho các tab khác (nếu cần)
    auth.on(SESSION_EVENTS.CREATED, (user) => {
        const userName = user.name || user.email;
        console.log('[Background] User logged in:', user.email);
        // Gửi thông báo đến tất cả các tab content script (tùy chọn)
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                if(tab.id) { // Đảm bảo tab có ID
                    chrome.tabs.sendMessage(tab.id, { action: 'auth_state_changed', isLoggedIn: true, user }).catch(() => {/* Tab không thể nhận tin nhắn */});
                }
            });
        });
        // Hiển thị thông báo đăng nhập thành công
        chrome.notifications.create({
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
            title: getLang('notificationLoginTitle'),
            message: getLang('notificationLoginMessage', { name: userName })
        });
    });

    auth.on(SESSION_EVENTS.EXPIRED, () => {
        console.log('[Background] Session expired');
        // Thông báo cho người dùng
        chrome.notifications.create({
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
            title: getLang('notificationSessionExpiredTitle'),
            message: getLang('notificationSessionExpiredMessage')
        });
        // Gửi thông báo đến các tab (tùy chọn)
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => { if(tab.id) chrome.tabs.sendMessage(tab.id, { action: 'auth_state_changed', isLoggedIn: false }).catch(() => {}); });
        });
    });

    auth.on(SESSION_EVENTS.DESTROYED, () => {
        console.log('[Background] User logged out');
        // Gửi thông báo đến các tab (tùy chọn)
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => { if(tab.id) chrome.tabs.sendMessage(tab.id, { action: 'auth_state_changed', isLoggedIn: false }).catch(() => {}); }); 
        });
    });
}


// modules/auth/ui/auth-widget.js

/**
 * Auth Widget Controller
 * Quản lý UI states và interactions cho auth widget trong Panel
 *
 * *** PHIÊN BẢN CẬP NHẬT (i18n) ***
 * - Thay thế tất cả các chuỗi văn bản (hard-coded strings) bằng window.Lang.get('key')
 * - Thêm gọi window.Lang.applyToDOM() sau khi loadHTML
 */

import { auth, SESSION_EVENTS } from '../auth.js';

export class AuthWidget {
  constructor(containerElement) {
    this.container = containerElement;
    this.isInitialized = false;
    this.dropdownOpen = false;
    
    // DOM elements
    this.elements = {};
    
    // Bind methods
    this.handleLogin = this.handleLogin.bind(this);
    this.handleLogout = this.handleLogout.bind(this);
    this.handleProfileClick = this.handleProfileClick.bind(this);
    this.handleClickOutside = this.handleClickOutside.bind(this);
    this.handleSessionInfo = this.handleSessionInfo.bind(this);
    this.handleRefreshSession = this.handleRefreshSession.bind(this);
  }

  /**
   * Initialize widget
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }
    
    try {
      console.log('[AuthWidget] Initializing...');
      
      // Load HTML template
      await this.loadHTML();
      
      // Get DOM references
      this.cacheDOMElements();
      
      // Attach event listeners
      this.attachEventListeners();
      
      // Listen to session events
      this.setupSessionListeners();
      
      // Set initial state
      await this.updateUI();
      
      this.isInitialized = true;
      console.log('[AuthWidget] Initialized successfully');
      
    } catch (error) {
      console.error('[AuthWidget] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Load HTML template
   * (Cập nhật i18n)
   */
  async loadHTML() {
    try {
      const response = await fetch(
        chrome.runtime.getURL('modules/auth/ui/auth-widget.html')
      );
      const html = await response.text();
      this.container.innerHTML = html;
      
      // === CẬP NHẬT i18n ===
      // Sau khi chèn HTML, yêu cầu i18n.js dịch các thuộc tính data-i18n
      if (window.Lang) {
        window.Lang.applyToDOM(this.container);
      }
      
    } catch (error) {
      console.error('[AuthWidget] Failed to load HTML:', error);
      // Fallback: create basic HTML structure
      this.container.innerHTML = this.getBasicHTML();
      // Dịch cả HTML fallback
      if (window.Lang) {
        window.Lang.applyToDOM(this.container);
      }
    }
  }

  /**
   * Cache DOM elements
   * (Không thay đổi)
   */
  cacheDOMElements() {
    this.elements = {
      // States
      loggedOutState: document.getElementById('authLoggedOut'),
      loggedInState: document.getElementById('authLoggedIn'),
      loadingState: document.getElementById('authLoading'),
      
      // Logged out
      loginBtn: document.getElementById('btnAuthLogin'),
      
      // Logged in
      profileBtn: document.getElementById('btnAuthProfile'),
      userAvatar: document.getElementById('authUserAvatar'),
      userName: document.getElementById('authUserName'),
      dropdownMenu: document.getElementById('authDropdownMenu'),
      
      // Dropdown menu
      menuAvatar: document.getElementById('authMenuAvatar'),
      menuName: document.getElementById('authMenuName'),
      menuEmail: document.getElementById('authMenuEmail'),
      accountBtn: document.getElementById('btnAuthAccount'),
      sessionInfoBtn: document.getElementById('btnAuthSessionInfo'),
      logoutBtn: document.getElementById('btnAuthLogout'),
      
      // Modals
      sessionModal: document.getElementById('authSessionModal'),
      loginModal: document.getElementById('authLoginModal'),
      closeSessionModalBtn: document.getElementById('btnCloseSessionModal'),
      closeLoginModalBtn: document.getElementById('btnCloseLoginModal'),
      googleLoginBtn: document.getElementById('btnGoogleLogin'),
      refreshSessionBtn: document.getElementById('btnRefreshSession'),
      
      // Session info
      sessionStatus: document.getElementById('sessionStatus'),
      sessionTimeRemaining: document.getElementById('sessionTimeRemaining'),
      sessionCreatedAt: document.getElementById('sessionCreatedAt'),
      sessionExpiresAt: document.getElementById('sessionExpiresAt')
    };
  }

  /**
   * Attach event listeners
   * (Không thay đổi)
   */
  attachEventListeners() {
    // Login
    this.elements.loginBtn?.addEventListener('click', this.handleLogin);
    this.elements.googleLoginBtn?.addEventListener('click', this.handleLogin);
    
    // Logout
    this.elements.logoutBtn?.addEventListener('click', this.handleLogout);
    
    // Profile dropdown
    this.elements.profileBtn?.addEventListener('click', this.handleProfileClick);
    
    // Session info
    this.elements.sessionInfoBtn?.addEventListener('click', this.handleSessionInfo);
    this.elements.refreshSessionBtn?.addEventListener('click', this.handleRefreshSession);
    
    // Google account (mở Google account page)
    this.elements.accountBtn?.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://myaccount.google.com' });
      this.closeDropdown();
    });
    
    // Close modals
    this.elements.closeSessionModalBtn?.addEventListener('click', () => {
      this.closeModal('session');
    });
    this.elements.closeLoginModalBtn?.addEventListener('click', () => {
      this.closeModal('login');
    });
    
    // Modal overlay clicks
    document.querySelector('#authSessionModal .auth-modal-overlay')?.addEventListener('click', () => {
      this.closeModal('session');
    });
    document.querySelector('#authLoginModal .auth-modal-overlay')?.addEventListener('click', () => {
      this.closeModal('login');
    });
    
    // Click outside dropdown
    document.addEventListener('click', this.handleClickOutside);
  }

  /**
   * Setup session event listeners
   * (Cập nhật i18n)
   */
  setupSessionListeners() {
    // Thoát nếu i18n.js chưa sẵn sàng
    if (!window.Lang) {
      console.error("AuthWidget: window.Lang (i18n.js) is not ready.");
      return;
    }

    // Session created
    auth.on(SESSION_EVENTS.CREATED, (user) => {
      console.log('[AuthWidget] Session created:', user);
      this.updateUI();
      // Dịch thông báo
      this.showNotification(window.Lang.get('authLoginSuccess'), 'success');
    });
    
    // Session expired
    auth.on(SESSION_EVENTS.EXPIRED, () => {
      console.log('[AuthWidget] Session expired');
      this.updateUI();
      // Dịch thông báo
      this.showNotification(window.Lang.get('authSessionExpiredWarning'), 'warning');
    });
    
    // Session destroyed (logout)
    auth.on(SESSION_EVENTS.DESTROYED, () => {
      console.log('[AuthWidget] Session destroyed');
      this.updateUI();
    });
    
    // Session refreshed
    auth.on(SESSION_EVENTS.REFRESHED, () => {
      console.log('[AuthWidget] Session refreshed');
      if (this.elements.sessionModal && !this.elements.sessionModal.classList.contains('hidden')) {
        this.updateSessionInfo();
      }
    });
  }

  /**
   * Update UI based on auth state
   * (Không thay đổi)
   */
  async updateUI() {
    try {
      const isLoggedIn = await auth.isLoggedIn();
      
      if (isLoggedIn) {
        const user = await auth.getCurrentUser();
        this.showLoggedInState(user);
      } else {
        this.showLoggedOutState();
      }
      
    } catch (error) {
      console.error('[AuthWidget] Failed to update UI:', error);
      this.showLoggedOutState();
    }
  }

  /**
   * Show logged in state
   * (Cập nhật i18n)
   */
  showLoggedInState(user) {
    // Thoát nếu i18n.js chưa sẵn sàng
    if (!window.Lang) return;
    
    // Hide other states
    this.elements.loggedOutState?.classList.add('hidden');
    this.elements.loadingState?.classList.add('hidden');
    
    // Show logged in state
    this.elements.loggedInState?.classList.remove('hidden');
    
    // Update user info
    if (this.elements.userAvatar) {
      this.elements.userAvatar.src = user.picture || this.getDefaultAvatar();
      this.elements.userAvatar.alt = user.name || user.email;
    }
    
    if (this.elements.userName) {
      // Dịch fallback "User"
      this.elements.userName.textContent = user.name || user.email.split('@')[0] || window.Lang.get('authUserFallback');
    }
    
    // Update dropdown menu
    if (this.elements.menuAvatar) {
      this.elements.menuAvatar.src = user.picture || this.getDefaultAvatar();
    }
    
    if (this.elements.menuName) {
      // Dịch fallback "User"
      this.elements.menuName.textContent = user.name || window.Lang.get('authUserFallback');
    }
    
    if (this.elements.menuEmail) {
      this.elements.menuEmail.textContent = user.email;
    }
    
    // Update sidebar avatar (userAvatarImg in sidebar)
    if (user.picture && typeof window !== 'undefined') {
      // Import updateUserAvatar dynamically to avoid circular dependency
      import('../../panel/utils/avatar.js').then(({ updateUserAvatar }) => {
        updateUserAvatar(user.picture, window.Lang);
      }).catch(err => {
        console.warn('[AuthWidget] Failed to update sidebar avatar:', err);
      });
    }
  }

  /**
   * Show logged out state
   * (Không thay đổi)
   */
  showLoggedOutState() {
    // Hide other states
    this.elements.loggedInState?.classList.add('hidden');
    this.elements.loadingState?.classList.add('hidden');
    this.closeDropdown();
    
    // Show logged out state
    this.elements.loggedOutState?.classList.remove('hidden');
  }

  /**
   * Show loading state
   * (Cập nhật i18n)
   */
  showLoadingState(messageKey = 'authProcessing') {
    // Thoát nếu i18n.js chưa sẵn sàng
    if (!window.Lang) return;

    this.elements.loggedOutState?.classList.add('hidden');
    this.elements.loggedInState?.classList.add('hidden');
    this.elements.loadingState?.classList.remove('hidden');
    
    const loadingText = this.elements.loadingState?.querySelector('.auth-loading-text');
    if (loadingText) {
      // Dịch messageKey
      loadingText.textContent = window.Lang.get(messageKey);
    }
  }

  /**
   * Handle login
   * (Cập nhật i18n)
   */
  async handleLogin() {
    // Thoát nếu i18n.js chưa sẵn sàng
    if (!window.Lang) return;

    try {
      console.log('[AuthWidget] Login initiated');
      
      // Dịch loading (truyền key)
      this.showLoadingState('authLoggingIn');
      this.closeModal('login');
      
      const user = await auth.login();
      
      console.log('[AuthWidget] Login successful:', user.email);
      // UI sẽ được cập nhật bởi session event listener (đã được dịch)
      
    } catch (error) {
      console.error('[AuthWidget] Login failed:', error);
      
      // Dịch lỗi
      this.showNotification(
        error.message || window.Lang.get('authLoginFailed'),
        'error'
      );
      
      this.showLoggedOutState();
    }
  }

  /**
   * Handle logout
   * (Cập nhật i18n)
   */
  async handleLogout() {
    // Thoát nếu i18n.js chưa sẵn sàng
    if (!window.Lang) return;
    
    try {
      // Dịch confirm
      const confirmed = confirm(window.Lang.get('authLogoutConfirm'));
      if (!confirmed) {
        return;
      }
      
      console.log('[AuthWidget] Logout initiated');
      
      this.closeDropdown();
      // Dịch loading (truyền key)
      this.showLoadingState('authLoggingOut');
      
      await auth.logout();
      
      console.log('[AuthWidget] Logout successful');
      // Dịch thông báo
      this.showNotification(window.Lang.get('authLogoutSuccess'), 'success');
      
      // UI sẽ được cập nhật bởi session event listener
      
    } catch (error) {
      console.error('[AuthWidget] Logout failed:', error);
      
      // Dịch lỗi
      this.showNotification(
        window.Lang.get('authLogoutFailed'),
        'error'
      );
      
      this.showLoggedOutState();
    }
  }

  /**
   * Handle profile button click (toggle dropdown)
   * (Không thay đổi)
   */
  handleProfileClick(event) {
    event.stopPropagation();
    this.toggleDropdown();
  }

  /**
   * Toggle dropdown menu
   * (Không thay đổi)
   */
  toggleDropdown() {
    if (this.dropdownOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  /**
   * Open dropdown menu
   * (Không thay đổi)
   */
  openDropdown() {
    this.elements.dropdownMenu?.classList.remove('hidden');
    this.elements.profileBtn?.classList.add('active');
    this.dropdownOpen = true;
  }

  /**
   * Close dropdown menu
   * (Không thay đổi)
   */
  closeDropdown() {
    this.elements.dropdownMenu?.classList.add('hidden');
    this.elements.profileBtn?.classList.remove('active');
    this.dropdownOpen = false;
  }

  /**
   * Handle click outside dropdown
   * (Không thay đổi)
   */
  handleClickOutside(event) {
    if (!this.dropdownOpen) return;
    
    const dropdown = this.elements.dropdownMenu;
    const profileBtn = this.elements.profileBtn;
    
    if (dropdown && profileBtn) {
      if (!dropdown.contains(event.target) && !profileBtn.contains(event.target)) {
        this.closeDropdown();
      }
    }
  }

  /**
   * Handle session info button click
   * (Không thay đổi)
   */
  async handleSessionInfo() {
    this.closeDropdown();
    await this.updateSessionInfo();
    this.openModal('session');
  }

  /**
   * Update session info modal
   * (Cập nhật i18n)
   */
  async updateSessionInfo() {
    // Thoát nếu i18n.js chưa sẵn sàng
    if (!window.Lang) return;
    
    try {
      const stats = await auth.getSessionStats();
      const fallbackText = window.Lang.get('authDashFallback');
      
      if (this.elements.sessionStatus) {
        // Dịch trạng thái
        this.elements.sessionStatus.textContent = stats.isActive ? window.Lang.get('authStatusActive') : window.Lang.get('authStatusInactive');
        this.elements.sessionStatus.style.color = stats.isActive ? '#4caf50' : '#f44336';
      }
      
      if (this.elements.sessionTimeRemaining) {
        this.elements.sessionTimeRemaining.textContent = stats.timeRemainingFormatted || fallbackText;
      }
      
      if (this.elements.sessionCreatedAt) {
        this.elements.sessionCreatedAt.textContent = stats.createdAt || fallbackText;
      }
      
      if (this.elements.sessionExpiresAt) {
        this.elements.sessionExpiresAt.textContent = stats.expiresAt || fallbackText;
      }
      
    } catch (error) {
      console.error('[AuthWidget] Failed to update session info:', error);
    }
  }

  /**
   * Handle refresh session button
   * (Cập nhật i18n)
   */
  async handleRefreshSession() {
    // Note: auth.refreshSession() has been removed - sessions are managed automatically
    if (!window.Lang) return;
    
    console.log('[AuthWidget] Session refresh is managed automatically');
    
    try {
      // Just check current session status and update UI
      await this.updateSessionInfo();
      this.showNotification(window.Lang.get('authSessionChecked') || 'Session status checked', 'info');
    } catch (error) {
      console.error('[AuthWidget] Failed to check session:', error);
      this.showNotification(window.Lang.get('authPleaseLogin') || 'Please login again', 'info');
    }
  }

  /**
   * Open modal
   * (Không thay đổi)
   */
  openModal(type) {
    const modal = type === 'session' ? this.elements.sessionModal : this.elements.loginModal;
    modal?.classList.remove('hidden');
  }

  /**
   * Close modal
   * (Không thay đổi)
   */
  closeModal(type) {
    const modal = type === 'session' ? this.elements.sessionModal : this.elements.loginModal;
    modal?.classList.add('hidden');
  }

  /**
   * Show notification
   * (Không thay đổi)
   */
  showNotification(message, type = 'info') {
    // Simple console notification for now
    console.log(`[AuthWidget] Notification (${type}):`, message);
    
    // Send notification request to background script
    try {
      chrome.runtime.sendMessage({
        type: 'notification',
        data: {
          message: message,
          notificationType: type
        }
      }).catch(err => {
        console.log('[AuthWidget] Could not send notification:', err);
      });
    } catch (error) {
      console.log('[AuthWidget] Notification not available:', error.message);
    }
  }

  /**
   * Get default avatar
   * (Không thay đổi)
   */
  getDefaultAvatar() {
    return 'data:image/svg+xml;base64,' + btoa(`
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="12" fill="#e0e0e0"/>
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="#999"/>
      </svg>
    `);
  }

  /**
   * Fallback basic HTML (if HTML file load fails)
   * (Cập nhật i18n)
   */
  getBasicHTML() {
    // Lấy text đã dịch (hoặc fallback)
    const loginText = window.Lang ? window.Lang.get('authLoginButton') : 'Đăng nhập';
    const loadingText = window.Lang ? window.Lang.get('authProcessing') : 'Loading...';
    
    return `
      <div id="authWidget" class="auth-widget">
        <div id="authLoggedOut" class="auth-state auth-logged-out">
          <button id="btnAuthLogin" class="auth-login-btn">
            <!-- Dịch fallback -->
            <span data-i18n="authLoginButton">${loginText}</span>
          </button>
        </div>
        <div id="authLoggedIn" class="auth-state auth-logged-in hidden">
          <button id="btnAuthProfile" class="auth-profile-btn">
            <img id="authUserAvatar" class="auth-avatar" src="" alt="User">
            <span id="authUserName"></span>
          </button>
        </div>
        <div id="authLoading" class="auth-state auth-loading hidden">
          <!-- Dịch fallback -->
          <span data-i18n="authProcessing">${loadingText}</span>
        </div>
      </div>
    `;
  }

  /**
   * Destroy widget
   * (Không thay đổi)
   */
  destroy() {
    // Remove event listeners
    document.removeEventListener('click', this.handleClickOutside);
    
    // Clear container
    this.container.innerHTML = '';
    
    this.isInitialized = false;
  }
}

/**
 * Initialize auth widget in panel
 * Call this from panel.js
 */
export async function initAuthWidget(containerElement) {
  const widget = new AuthWidget(containerElement);
  await widget.initialize();
  return widget;
}
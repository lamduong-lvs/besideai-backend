/**
 * User Menu Component
 * Modern user menu with subscription info, upgrade CTA, and menu items
 * Based on modern design pattern
 */

import { subscriptionManager } from '../../subscription/subscription-manager.js';
import { auth } from '../../auth/auth.js';
import { TIER_PRICING } from '../../subscription/subscription-config.js';

export class UserMenu {
  constructor(container) {
    this.container = container;
    this.initialized = false;
  }

  /**
   * Initialize menu
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    await subscriptionManager.ensureInitialized();
    this.initialized = true;
  }

  /**
   * Render menu
   */
  async render() {
    await this.ensureInitialized();

    // Check if popup is currently open - if so, close it first to prevent flickering
    const userPopup = document.getElementById('userPopup');
    const wasOpen = userPopup && userPopup.classList.contains('show');
    if (wasOpen) {
      userPopup.classList.remove('show');
      // Wait for transition to complete
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const user = await auth.getCurrentUser();
    const tier = await subscriptionManager.getTier();
    const status = await subscriptionManager.getStatus();
    const pricing = TIER_PRICING[tier] || {};

    const html = this.generateHTML(user, tier, status, pricing);
    
    if (this.container) {
      // Use requestAnimationFrame to ensure smooth rendering
      await new Promise(resolve => {
        requestAnimationFrame(() => {
          this.container.innerHTML = html;
          // Setup listeners after DOM update
          requestAnimationFrame(() => {
            this.setupEventListeners();
            resolve();
          });
        });
      });
    }
  }

  /**
   * Generate HTML
   */
  generateHTML(user, tier, status, pricing) {
    // If user is not logged in, show login button only
    if (!user) {
      const loginText = typeof window !== 'undefined' && window.Lang 
        ? window.Lang.get('authLoginButton') || 'Đăng nhập với Google'
        : 'Đăng nhập với Google';
      
      return `
        <div class="user-menu-login-container">
          <div class="user-menu-login-content">
            <div class="user-menu-login-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <p class="user-menu-login-text">Đăng nhập để sử dụng đầy đủ tính năng</p>
            <button class="user-menu-login-btn" id="userMenuLoginBtn">
              <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              <span>${this.escapeHtml(loginText)}</span>
            </button>
          </div>
        </div>
      `;
    }

    // Get i18n strings if available
    const getTierName = (tier) => {
      if (typeof window !== 'undefined' && window.Lang) {
        const key = `subscription.tier.${tier}`;
        const translated = window.Lang.get(key);
        if (translated && translated !== key) return translated;
      }
      // Fallback
      const fallback = {
        free: 'Free',
        professional: 'Professional',
        premium: 'Premium',
        byok: 'BYOK'
      };
      return fallback[tier] || tier;
    };
    
    const tierNames = {
      free: getTierName('free'),
      professional: getTierName('professional'),
      premium: getTierName('premium'),
      byok: getTierName('byok')
    };

    const tierColors = {
      free: '#666',
      basic: '#4285f4',
      pro: '#ea4335',
      byok: '#34a853'
    };

    const userName = user?.name || 'User';
    const userEmail = user?.email || '';
    const userPicture = user?.picture || '';

    return `
      <!-- User Account Header -->
      <div class="user-menu-header">
        <div class="user-menu-avatar-section">
          ${userPicture ? 
            `<img src="${userPicture}" alt="${userName}" class="user-menu-avatar-img">` :
            `<div class="user-menu-avatar-placeholder">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>`
          }
        </div>
        <div class="user-menu-info">
          <div class="user-menu-name-row">
            <span class="user-menu-name">${this.escapeHtml(userName)}</span>
            <span class="user-menu-tier-badge" style="background-color: ${tierColors[tier]};">
              ${tierNames[tier]}
            </span>
          </div>
          <div class="user-menu-email">${this.escapeHtml(userEmail)}</div>
        </div>
      </div>

      <!-- Upgrade CTA Section -->
      ${tier === 'free' ? `
      <div class="user-menu-upgrade-cta">
        <div class="user-menu-upgrade-content">
          <p class="user-menu-upgrade-text">Nâng cấp gói của bạn để khám phá và trải nghiệm tốt hơn.</p>
          <button class="user-menu-upgrade-btn" id="userMenuUpgradeBtn">
            Nâng cấp
          </button>
        </div>
      </div>
      ` : ''}

      <!-- Menu Items -->
      <div class="user-menu-items">
        <button class="user-menu-item" id="userMenuNewFeatures">
          <svg class="user-menu-item-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <span>Tính năng mới</span>
        </button>

        <button class="user-menu-item" id="userMenuMyAccount">
          <svg class="user-menu-item-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span>Tài khoản của tôi</span>
        </button>

        <button class="user-menu-item" id="userMenuHelpCenter">
          <svg class="user-menu-item-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <span>Trung tâm trợ giúp</span>
        </button>

        <button class="user-menu-item" id="userMenuFeedback">
          <svg class="user-menu-item-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
          <span>Nhận xét</span>
        </button>

        <button class="user-menu-item user-menu-item-danger" id="userMenuLogout">
          <svg class="user-menu-item-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          <span>Đăng xuất</span>
        </button>
      </div>
    `;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Login button (when not logged in)
    const loginBtn = this.container?.querySelector('#userMenuLoginBtn');
    loginBtn?.addEventListener('click', () => {
      this.handleLogin();
    });

    // Upgrade button
    const upgradeBtn = this.container?.querySelector('#userMenuUpgradeBtn');
    upgradeBtn?.addEventListener('click', () => {
      this.handleUpgrade();
    });

    // Menu items
    const newFeaturesBtn = this.container?.querySelector('#userMenuNewFeatures');
    newFeaturesBtn?.addEventListener('click', () => {
      this.handleNewFeatures();
    });

    const myAccountBtn = this.container?.querySelector('#userMenuMyAccount');
    myAccountBtn?.addEventListener('click', () => {
      this.handleMyAccount();
    });

    const helpCenterBtn = this.container?.querySelector('#userMenuHelpCenter');
    helpCenterBtn?.addEventListener('click', () => {
      this.handleHelpCenter();
    });

    const feedbackBtn = this.container?.querySelector('#userMenuFeedback');
    feedbackBtn?.addEventListener('click', () => {
      this.handleFeedback();
    });

    const logoutBtn = this.container?.querySelector('#userMenuLogout');
    logoutBtn?.addEventListener('click', () => {
      this.handleLogout();
    });
  }

  /**
   * Handle login click
   */
  async handleLogin() {
    try {
      await auth.login();
      // Close popup and re-render
      const userPopup = document.getElementById('userPopup');
      if (userPopup) {
        userPopup.classList.remove('show');
      }
      // Re-render menu with logged in state
      await this.render();
    } catch (error) {
      console.error('[UserMenu] Login failed:', error);
    }
  }

  /**
   * Handle upgrade click
   */
  async handleUpgrade() {
    // Open subscription page
    const subscriptionUrl = 'https://your-subscription-page.com'; // TODO: Update with actual URL
    chrome.tabs.create({ url: subscriptionUrl });
    
    // Close popup
    const userPopup = document.getElementById('userPopup');
    if (userPopup) {
      userPopup.classList.remove('show');
    }
  }

  /**
   * Handle menu item clicks
   */
  handleNewFeatures() {
    console.log('[UserMenu] New features clicked');
    // TODO: Implement
  }

  handleMyAccount() {
    console.log('[UserMenu] My account clicked');
    chrome.runtime.openOptionsPage();
  }

  handleHelpCenter() {
    console.log('[UserMenu] Help center clicked');
    chrome.tabs.create({ url: 'https://help.your-domain.com' }); // TODO: Update with actual URL
  }

  handleFeedback() {
    console.log('[UserMenu] Feedback clicked');
    chrome.tabs.create({ url: 'https://feedback.your-domain.com' }); // TODO: Update with actual URL
  }

  async handleLogout() {
    try {
      await auth.logout();
      // Close popup
      const userPopup = document.getElementById('userPopup');
      if (userPopup) {
        userPopup.classList.remove('show');
      }
    } catch (error) {
      console.error('[UserMenu] Logout failed:', error);
    }
  }

  /**
   * Escape HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Ensure initialized
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}


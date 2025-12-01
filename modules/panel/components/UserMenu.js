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

    const user = await auth.getCurrentUser();
    const tier = await subscriptionManager.getTier();
    const status = await subscriptionManager.getStatus();
    const pricing = TIER_PRICING[tier] || {};

    const html = this.generateHTML(user, tier, status, pricing);
    
    if (this.container) {
      this.container.innerHTML = html;
      this.setupEventListeners();
    }
  }

  /**
   * Generate HTML
   */
  generateHTML(user, tier, status, pricing) {
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


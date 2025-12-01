/**
 * Token Usage Menu Component
 * Context menu showing subscription tier, usage, and upgrade options
 * Appears when clicking on token display in input footer
 */

import { subscriptionManager } from '../../subscription/subscription-manager.js';
import { usageTracker } from '../../subscription/usage-tracker.js';
import { auth } from '../../auth/auth.js';
import { SUBSCRIPTION_TIERS, TIER_LIMITS } from '../../subscription/subscription-config.js';

export class TokenUsageMenu {
  constructor(container) {
    this.container = container;
    this.initialized = false;
    this.tier = SUBSCRIPTION_TIERS.FREE;
    this.usage = null;
    this.limits = null;
    this.user = null;
    this.selectedTab = SUBSCRIPTION_TIERS.FREE; // Track which tab is currently selected
  }

  /**
   * Initialize menu
   */
  async initialize() {
    if (this.initialized) return;

    await subscriptionManager.ensureInitialized();
    await usageTracker.ensureInitialized();
    await auth.initialize();
    
    this.tier = await subscriptionManager.getTier();
    this.limits = await subscriptionManager.getLimits();
    this.usage = await usageTracker.getTodayUsage();
    this.user = await auth.getCurrentUser();
    
    this.initialized = true;
  }

  /**
   * Render menu
   */
  async render() {
    await this.initialize();
    
    const html = await this.generateHTML();
    
    if (this.container) {
      this.container.innerHTML = html;
      this.setupEventListeners();
    }
  }

  /**
   * Generate HTML based on tier
   */
  async generateHTML() {
    // For now, only implement Free tier as requested
    if (this.tier === SUBSCRIPTION_TIERS.FREE) {
      return await this.generateFreeTierHTML();
    }
    
    // Placeholder for other tiers
    return await this.generateFreeTierHTML();
  }

  /**
   * Generate HTML for Free tier
   */
  async generateFreeTierHTML() {
    // Initialize selectedTab to current tier
    this.selectedTab = this.tier;
    
    const tokensUsed = this.usage?.tokens || 0;
    const tokensLimit = this.limits?.tokensPerDay || 50000;
    const tokensRemaining = Math.max(0, tokensLimit - tokensUsed);
    const requestsUsed = this.usage?.requests || 0;
    const requestsLimit = this.limits?.requestsPerDay || 10;
    
    // Get time usage (recording + translation in minutes)
    const today = new Date().toISOString().split('T')[0];
    const recordingUsage = await usageTracker.getTodayFeatureUsage('recording') || 0;
    const translationUsage = await usageTracker.getTodayFeatureUsage('translation') || 0;
    const timeUsed = recordingUsage + translationUsage;
    const timeLimit = (this.limits?.recordingTimePerDay || 0) + (this.limits?.translationTimePerDay || 0);
    
    // Get token limits for each tier (to display at tier sections)
    // Note: Usage/remaining will be shown in mini dashboard below
    const { getLimitsForTier } = await import('../../subscription/subscription-config.js');
    
    // Free tier: get limit
    const freeTokensLimit = tokensLimit;
    
    // Professional tier: get limit
    const professionalLimits = getLimitsForTier(SUBSCRIPTION_TIERS.PROFESSIONAL);
    const professionalTokensLimit = professionalLimits.tokensPerDay || 500000;
    
    // Premium tier: get limit
    const premiumLimits = getLimitsForTier(SUBSCRIPTION_TIERS.PREMIUM);
    const premiumTokensLimit = premiumLimits.tokensPerDay || 2000000;
    
    // Get i18n strings for tier section labels
    const getTierSectionLabel = (key) => {
      if (typeof window !== 'undefined' && window.Lang) {
        const translated = window.Lang.get(`subscription.tier.${key}`);
        if (translated && translated !== `subscription.tier.${key}`) return translated;
      }
      // Fallback
      const fallback = {
        free: 'Free',
        professional: 'Professional',
        premium: 'Premium'
      };
      return fallback[key] || key;
    };
    
    const getFeatureLabel = (key) => {
      if (typeof window !== 'undefined' && window.Lang) {
        const translated = window.Lang.get(`subscription.feature.${key}`);
        if (translated && translated !== `subscription.feature.${key}`) return translated;
      }
      // Fallback
      const fallback = {
        youtubeSummary: 'YouTube Summary',
        aiReadAloud: 'AI Read Aloud',
        artist: 'Artist'
      };
      return fallback[key] || key;
    };
    
    const getTrialLabel = () => {
      if (typeof window !== 'undefined' && window.Lang) {
        const translated = window.Lang.get('subscription.freeTrial');
        if (translated && translated !== 'subscription.freeTrial') return translated;
      }
      return 'Free trial';
    };
    
    const getUnlockText = () => {
      if (typeof window !== 'undefined' && window.Lang) {
        const translated = window.Lang.get('subscription.unlockUnlimited');
        if (translated && translated !== 'subscription.unlockUnlimited') return translated;
      }
      return 'Unlock unlimited usage';
    };
    
    const getInviteText = () => {
      if (typeof window !== 'undefined' && window.Lang) {
        const translated = window.Lang.get('subscription.inviteFriends');
        if (translated && translated !== 'subscription.inviteFriends') return translated;
      }
      return 'Invite friends to get more credits';
    };
    
    const getBannerText = () => {
      if (typeof window !== 'undefined' && window.Lang) {
        const translated = window.Lang.get('subscription.upgradeBanner');
        if (translated && translated !== 'subscription.upgradeBanner') return translated;
      }
      return 'Upgrade 40% off ⚡';
    };
    
    // User info
    const userName = this.user?.name || 'User';
    const userEmail = this.user?.email || '';
    const userPicture = this.user?.picture || '';
    
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
    
    // Tier info
    const tierNames = {
      [SUBSCRIPTION_TIERS.FREE]: getTierName('free'),
      [SUBSCRIPTION_TIERS.PROFESSIONAL]: getTierName('professional'),
      [SUBSCRIPTION_TIERS.PREMIUM]: getTierName('premium'),
      [SUBSCRIPTION_TIERS.BYOK]: getTierName('byok')
    };
    
    const tierColors = {
      [SUBSCRIPTION_TIERS.FREE]: '#666',
      [SUBSCRIPTION_TIERS.PROFESSIONAL]: '#4285f4',
      [SUBSCRIPTION_TIERS.PREMIUM]: '#ea4335',
      [SUBSCRIPTION_TIERS.BYOK]: '#34a853'
    };
    
    return `
      <div class="token-usage-menu">
        <!-- User Header (copied from UserMenu) -->
        <div class="token-usage-user-header">
          <div class="token-usage-avatar-section">
            ${userPicture ? 
              `<img src="${userPicture}" alt="${userName}" class="token-usage-avatar-img">` :
              `<div class="token-usage-avatar-placeholder">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>`
            }
          </div>
          <div class="token-usage-user-info">
            <div class="token-usage-name-row">
              <span class="token-usage-name">${this.escapeHtml(userName)}</span>
              <span class="token-usage-tier-badge" style="background-color: ${tierColors[this.tier]};">
                ${tierNames[this.tier]}
              </span>
            </div>
            <div class="token-usage-email">${this.escapeHtml(userEmail)}</div>
          </div>
        </div>

        <!-- Tier Tabs -->
        <div class="token-usage-tier-tabs">
          <button class="token-usage-tab-btn ${this.selectedTab === SUBSCRIPTION_TIERS.FREE ? 'active' : ''}" 
                  data-tier="${SUBSCRIPTION_TIERS.FREE}" id="tokenUsageTabFree">
            ${tierNames[SUBSCRIPTION_TIERS.FREE]}
          </button>
          <button class="token-usage-tab-btn ${this.selectedTab === SUBSCRIPTION_TIERS.PROFESSIONAL ? 'active' : ''}" 
                  data-tier="${SUBSCRIPTION_TIERS.PROFESSIONAL}" id="tokenUsageTabProfessional">
            ${tierNames[SUBSCRIPTION_TIERS.PROFESSIONAL]}
          </button>
          <button class="token-usage-tab-btn ${this.selectedTab === SUBSCRIPTION_TIERS.PREMIUM ? 'active' : ''}" 
                  data-tier="${SUBSCRIPTION_TIERS.PREMIUM}" id="tokenUsageTabPremium">
            ${tierNames[SUBSCRIPTION_TIERS.PREMIUM]}
          </button>
        </div>

        <!-- Tier Sections -->
        <div class="token-usage-tiers">
          <!-- Free Tier Section -->
          <div class="token-usage-tier-section ${this.selectedTab === SUBSCRIPTION_TIERS.FREE ? 'active' : 'inactive'}" 
               data-tier-section="${SUBSCRIPTION_TIERS.FREE}">
            <div class="token-usage-tier-header">
              <div class="token-usage-tier-icon free-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                  <path d="M2 17l10 5 10-5"></path>
                  <path d="M2 12l10 5 10-5"></path>
                </svg>
              </div>
              <span class="token-usage-tier-name-small">${getTierSectionLabel('free')}</span>
              ${this.tier === SUBSCRIPTION_TIERS.FREE ? '<span class="token-usage-current-badge">Gói hiện tại</span>' : ''}
              <span class="token-usage-tier-count">${this.formatNumber(freeTokensLimit)}</span>
            </div>
            <div class="token-usage-tier-models">
              <span class="token-usage-models-text">Sider Fusion, GPT-5 mini, Claude Haiku...</span>
            </div>
          </div>

          <!-- Professional Tier Section -->
          <div class="token-usage-tier-section ${this.selectedTab === SUBSCRIPTION_TIERS.PROFESSIONAL ? 'active' : 'inactive'}" 
               data-tier-section="${SUBSCRIPTION_TIERS.PROFESSIONAL}">
            <div class="token-usage-tier-header">
              <div class="token-usage-tier-icon professional-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                  <path d="M2 17l10 5 10-5"></path>
                  <path d="M2 12l10 5 10-5"></path>
                </svg>
              </div>
              <span class="token-usage-tier-name-small">${getTierSectionLabel('professional')}</span>
              ${this.tier === SUBSCRIPTION_TIERS.PROFESSIONAL ? '<span class="token-usage-current-badge">Gói hiện tại</span>' : ''}
              <span class="token-usage-tier-count">${this.formatNumber(professionalTokensLimit)}</span>
            </div>
            <div class="token-usage-tier-models">
              <span class="token-usage-models-text">GPT-5.1, Gemini 3 Pro, GPT-5, GPT-4.1, D...</span>
            </div>
          </div>

          <!-- Premium Tier Section -->
          <div class="token-usage-tier-section ${this.selectedTab === SUBSCRIPTION_TIERS.PREMIUM ? 'active' : 'inactive'}" 
               data-tier-section="${SUBSCRIPTION_TIERS.PREMIUM}">
            <div class="token-usage-tier-header">
              <div class="token-usage-tier-icon premium-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                </svg>
              </div>
              <span class="token-usage-tier-name-small">${getTierSectionLabel('premium')}</span>
              ${this.tier === SUBSCRIPTION_TIERS.PREMIUM ? '<span class="token-usage-current-badge">Gói hiện tại</span>' : ''}
              <span class="token-usage-tier-count">${this.formatNumber(premiumTokensLimit)}</span>
            </div>
            <div class="token-usage-tier-models">
              <span class="token-usage-models-text">Deep Research, Scholar Research, Slide...</span>
            </div>
          </div>
        </div>

        <!-- Usage Dashboard -->
        <div class="token-usage-dashboard">
          <!-- Token Usage -->
          <div class="token-usage-metric">
            <div class="token-usage-metric-header">
              <span class="token-usage-metric-label">${typeof window !== 'undefined' && window.Lang ? window.Lang.get('subscription.metric.tokens') || 'Token' : 'Token'}</span>
              <span class="token-usage-metric-value">${this.formatNumber(tokensUsed)} / ${this.formatNumber(tokensLimit)}</span>
            </div>
            <div class="token-usage-progress-bar">
              <div class="token-usage-progress-fill" style="width: ${Math.min(100, (tokensUsed / tokensLimit) * 100)}%;"></div>
            </div>
          </div>

          <!-- Time Usage -->
          <div class="token-usage-metric">
            <div class="token-usage-metric-header">
              <span class="token-usage-metric-label">${typeof window !== 'undefined' && window.Lang ? window.Lang.get('subscription.metric.time') || 'Thời gian' : 'Time'}</span>
              <span class="token-usage-metric-value">${Math.round(timeUsed)} / ${timeLimit || '∞'} ${typeof window !== 'undefined' && window.Lang ? window.Lang.get('subscription.metric.minutes') || 'phút' : 'min'}</span>
            </div>
            <div class="token-usage-progress-bar">
              <div class="token-usage-progress-fill" style="width: ${timeLimit > 0 ? Math.min(100, (timeUsed / timeLimit) * 100) : 0}%;"></div>
            </div>
          </div>

          <!-- Requests Usage -->
          <div class="token-usage-metric">
            <div class="token-usage-metric-header">
              <span class="token-usage-metric-label">${typeof window !== 'undefined' && window.Lang ? window.Lang.get('subscription.metric.requests') || 'Truy vấn' : 'Requests'}</span>
              <span class="token-usage-metric-value">${requestsUsed} / ${requestsLimit || '∞'}</span>
            </div>
            <div class="token-usage-progress-bar">
              <div class="token-usage-progress-fill" style="width: ${Math.min(100, (requestsUsed / requestsLimit) * 100)}%;"></div>
            </div>
          </div>
        </div>

        <!-- Upgrade Button -->
        <button class="token-usage-upgrade-btn" id="tokenUsageUpgradeBtn">
          ${getUnlockText()}
        </button>

        <!-- Invite Friends Text -->
        <p class="token-usage-invite-text">
          <a href="#" class="token-usage-invite-link" id="tokenUsageInviteLink" style="text-decoration: none; color: inherit; cursor: pointer;">Mời bạn bè</a> để nhận thêm tín dụng
        </p>
      </div>
    `;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Tier tab buttons
    const tabButtons = this.container.querySelectorAll('.token-usage-tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tier = btn.dataset.tier;
        this.handleTabClick(tier);
      });
    });

    // Upgrade button
    const upgradeBtn = this.container.querySelector('#tokenUsageUpgradeBtn');
    if (upgradeBtn) {
      upgradeBtn.addEventListener('click', () => {
        this.handleUpgrade();
      });
    }

    // Info button
    const infoBtn = this.container.querySelector('#tokenUsageInfoBtn');
    if (infoBtn) {
      infoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleInfoClick();
      });
    }

    // Invite friends link
    const inviteLink = this.container.querySelector('#tokenUsageInviteLink');
    if (inviteLink) {
      inviteLink.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.handleInviteClick();
      });
    }

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (this.container && !this.container.contains(e.target)) {
        const tokenDisplay = e.target.closest('.footer-token-display');
        if (!tokenDisplay) {
          this.hide();
        }
      }
    });
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
   * Format number with thousand separators
   */
  formatNumber(num) {
    if (num === null || num === undefined || num === Infinity) return '∞';
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  }

  /**
   * Handle upgrade button click
   */
  handleUpgrade() {
    // Navigate to subscription page
    const subscriptionUrl = 'https://your-subscription-page.com'; // TODO: Update with actual URL
    window.open(subscriptionUrl, '_blank');
    this.hide();
  }

  /**
   * Handle info button click
   */
  handleInfoClick() {
    // Show tooltip or modal with trial information
    alert('Dùng thử miễn phí cho phép bạn trải nghiệm các tính năng cao cấp trong thời gian giới hạn.');
  }

  /**
   * Handle invite friends link click
   */
  handleInviteClick() {
    // TODO: Navigate to invite friends page
    const inviteUrl = 'https://your-invite-page.com'; // Update with actual URL
    chrome.tabs.create({ url: inviteUrl });
  }

  /**
   * Handle tab click - switch between tier views
   */
  async handleTabClick(selectedTier) {
    // Update selected tab
    this.selectedTab = selectedTier;
    
    // Update tab buttons active state
    const tabButtons = this.container.querySelectorAll('.token-usage-tab-btn');
    tabButtons.forEach(btn => {
      if (btn.dataset.tier === selectedTier) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    
    // Update tier sections visibility
    const tierSections = this.container.querySelectorAll('.token-usage-tier-section');
    tierSections.forEach(section => {
      if (section.dataset.tierSection === selectedTier) {
        section.classList.add('active');
        section.classList.remove('inactive');
      } else {
        section.classList.remove('active');
        section.classList.add('inactive');
      }
    });
    
    // Update dashboard to show usage for selected tier
    await this.updateDashboardForTier(selectedTier);
  }
  
  /**
   * Update dashboard to show usage for a specific tier
   */
  async updateDashboardForTier(tier) {
    // Get limits for the selected tier
    const { getLimitsForTier } = await import('../../subscription/subscription-config.js');
    const tierLimits = getLimitsForTier(tier);
    
    // Get usage (use current usage, but limits from selected tier)
    const tokensUsed = this.usage?.tokens || 0;
    const tokensLimit = tierLimits.tokensPerDay || 0;
    
    const requestsUsed = this.usage?.requests || 0;
    const requestsLimit = tierLimits.requestsPerDay || 0;
    
    // Get time usage
    const today = new Date().toISOString().split('T')[0];
    const recordingUsage = await usageTracker.getTodayFeatureUsage('recording') || 0;
    const translationUsage = await usageTracker.getTodayFeatureUsage('translation') || 0;
    const timeUsed = recordingUsage + translationUsage;
    const timeLimit = (tierLimits.recordingTimePerDay || 0) + (tierLimits.translationTimePerDay || 0);
    
    // Update dashboard HTML
    const dashboard = this.container.querySelector('.token-usage-dashboard');
    if (dashboard) {
      dashboard.innerHTML = `
        <!-- Token Usage -->
        <div class="token-usage-metric">
          <div class="token-usage-metric-header">
            <span class="token-usage-metric-label">${typeof window !== 'undefined' && window.Lang ? window.Lang.get('subscription.metric.tokens') || 'Token' : 'Token'}</span>
            <span class="token-usage-metric-value">${this.formatNumber(tokensUsed)} / ${this.formatNumber(tokensLimit)}</span>
          </div>
          <div class="token-usage-progress-bar">
            <div class="token-usage-progress-fill" style="width: ${tokensLimit > 0 ? Math.min(100, (tokensUsed / tokensLimit) * 100) : 0}%;"></div>
          </div>
        </div>

        <!-- Time Usage -->
        <div class="token-usage-metric">
          <div class="token-usage-metric-header">
            <span class="token-usage-metric-label">${typeof window !== 'undefined' && window.Lang ? window.Lang.get('subscription.metric.time') || 'Thời gian' : 'Time'}</span>
            <span class="token-usage-metric-value">${Math.round(timeUsed)} / ${timeLimit || '∞'} ${typeof window !== 'undefined' && window.Lang ? window.Lang.get('subscription.metric.minutes') || 'phút' : 'min'}</span>
          </div>
          <div class="token-usage-progress-bar">
            <div class="token-usage-progress-fill" style="width: ${timeLimit > 0 ? Math.min(100, (timeUsed / timeLimit) * 100) : 0}%;"></div>
          </div>
        </div>

        <!-- Requests Usage -->
        <div class="token-usage-metric">
          <div class="token-usage-metric-header">
            <span class="token-usage-metric-label">${typeof window !== 'undefined' && window.Lang ? window.Lang.get('subscription.metric.requests') || 'Truy vấn' : 'Requests'}</span>
            <span class="token-usage-metric-value">${requestsUsed} / ${requestsLimit || '∞'}</span>
          </div>
          <div class="token-usage-progress-bar">
            <div class="token-usage-progress-fill" style="width: ${requestsLimit > 0 ? Math.min(100, (requestsUsed / requestsLimit) * 100) : 0}%;"></div>
          </div>
        </div>
      `;
    }
  }

  /**
   * Show menu
   */
  show() {
    if (this.container) {
      this.container.classList.add('show');
    }
  }

  /**
   * Hide menu
   */
  hide() {
    if (this.container) {
      this.container.classList.remove('show');
    }
  }

  /**
   * Toggle menu visibility
   */
  toggle() {
    if (this.container) {
      this.container.classList.toggle('show');
    }
  }

  /**
   * Update usage data
   */
  async refresh() {
    await this.initialize();
    await this.render();
  }
}


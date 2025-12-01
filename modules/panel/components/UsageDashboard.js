/**
 * Usage Dashboard Component
 * Displays usage statistics and limits
 */

import { usageTracker } from '../../subscription/usage-tracker.js';
import { subscriptionManager } from '../../subscription/subscription-manager.js';

export class UsageDashboard {
  constructor(container) {
    this.container = container;
    this.initialized = false;
  }

  /**
   * Initialize dashboard
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    await usageTracker.ensureInitialized();
    await subscriptionManager.ensureInitialized();

    this.initialized = true;
  }

  /**
   * Render dashboard
   */
  async render() {
    await this.ensureInitialized();

    const tier = await subscriptionManager.getTier();
    const limits = await subscriptionManager.getLimits();
    const today = await usageTracker.getTodayUsage();
    const month = await usageTracker.getMonthUsage();

    const html = this.generateHTML(tier, limits, today, month);
    
    if (this.container) {
      this.container.innerHTML = html;
    } else {
      // Create container if not provided
      const dashboard = document.createElement('div');
      dashboard.className = 'usage-dashboard';
      dashboard.innerHTML = html;
      return dashboard;
    }
  }

  /**
   * Generate HTML
   */
  generateHTML(tier, limits, today, month) {
    const isFree = tier === 'free';
    const isBYOK = tier === 'byok';

    // Calculate percentages
    const dayRequestsPercent = limits.requestsPerDay 
      ? Math.min(100, (today.requests / limits.requestsPerDay) * 100)
      : 0;
    const dayTokensPercent = limits.tokensPerDay
      ? Math.min(100, (today.tokens / limits.tokensPerDay) * 100)
      : 0;
    const monthRequestsPercent = limits.requestsPerMonth
      ? Math.min(100, (month.requests / limits.requestsPerMonth) * 100)
      : 0;

    return `
      <div class="usage-dashboard-container">
        <div class="usage-dashboard-header">
          <h3>Usage Dashboard</h3>
          <button class="usage-dashboard-refresh" title="Refresh">↻</button>
        </div>
        
        <div class="usage-dashboard-content">
          <!-- Today's Usage -->
          <div class="usage-stat">
            <div class="usage-stat-header">
              <span class="usage-stat-label">Today</span>
              <span class="usage-stat-value">${today.requests} / ${limits.requestsPerDay || '∞'}</span>
            </div>
            <div class="usage-progress-bar">
              <div class="usage-progress-fill" style="width: ${dayRequestsPercent}%"></div>
            </div>
            <div class="usage-stat-detail">
              <span>Tokens: ${this.formatNumber(today.tokens)} / ${this.formatNumber(limits.tokensPerDay || Infinity)}</span>
            </div>
          </div>

          ${!isFree && !isBYOK ? `
          <!-- Monthly Usage -->
          <div class="usage-stat">
            <div class="usage-stat-header">
              <span class="usage-stat-label">This Month</span>
              <span class="usage-stat-value">${month.requests} / ${limits.requestsPerMonth || '∞'}</span>
            </div>
            <div class="usage-progress-bar">
              <div class="usage-progress-fill" style="width: ${monthRequestsPercent}%"></div>
            </div>
            <div class="usage-stat-detail">
              <span>Tokens: ${this.formatNumber(month.tokens)} / ${this.formatNumber(limits.tokensPerMonth || Infinity)}</span>
            </div>
          </div>
          ` : ''}

          ${isFree ? `
          <!-- Upgrade Prompt for Free Tier -->
          <div class="usage-upgrade-prompt">
            <p>Upgrade to get more requests and access premium features!</p>
            <button class="usage-upgrade-btn">Start Free Trial</button>
          </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Format number
   */
  formatNumber(num) {
    if (num === Infinity || num === null || num === undefined) {
      return '∞';
    }
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    const refreshBtn = this.container?.querySelector('.usage-dashboard-refresh');
    const upgradeBtn = this.container?.querySelector('.usage-upgrade-btn');

    refreshBtn?.addEventListener('click', async () => {
      await this.render();
    });

    upgradeBtn?.addEventListener('click', () => {
      if (typeof window !== 'undefined' && window.showSubscriptionModal) {
        window.showSubscriptionModal();
      } else {
        chrome.runtime.openOptionsPage();
      }
    });
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

// Add styles
const style = document.createElement('style');
style.textContent = `
  .usage-dashboard-container {
    background: white;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .usage-dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }
  
  .usage-dashboard-header h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }
  
  .usage-dashboard-refresh {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    padding: 4px 8px;
    color: #666;
  }
  
  .usage-dashboard-refresh:hover {
    color: #1a1a1a;
  }
  
  .usage-stat {
    margin-bottom: 16px;
  }
  
  .usage-stat-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  
  .usage-stat-label {
    font-size: 14px;
    color: #666;
  }
  
  .usage-stat-value {
    font-size: 14px;
    font-weight: 600;
    color: #1a1a1a;
  }
  
  .usage-progress-bar {
    height: 8px;
    background: #f0f0f0;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 8px;
  }
  
  .usage-progress-fill {
    height: 100%;
    background: #4285f4;
    transition: width 0.3s;
  }
  
  .usage-stat-detail {
    font-size: 12px;
    color: #999;
  }
  
  .usage-upgrade-prompt {
    margin-top: 16px;
    padding: 12px;
    background: #f5f5f5;
    border-radius: 8px;
    text-align: center;
  }
  
  .usage-upgrade-prompt p {
    margin: 0 0 8px 0;
    font-size: 14px;
    color: #666;
  }
  
  .usage-upgrade-btn {
    padding: 8px 16px;
    background: #4285f4;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }
  
  .usage-upgrade-btn:hover {
    background: #357ae8;
  }
`;

if (!document.getElementById('usage-dashboard-styles')) {
  style.id = 'usage-dashboard-styles';
  document.head.appendChild(style);
}


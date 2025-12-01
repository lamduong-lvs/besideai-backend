/**
 * Subscription Badge Component
 * Displays current subscription tier and status
 */

import { subscriptionManager } from '../../subscription/subscription-manager.js';
import { TIER_PRICING } from '../../subscription/subscription-config.js';

export class SubscriptionBadge {
  constructor(container) {
    this.container = container;
    this.initialized = false;
  }

  /**
   * Initialize badge
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    await subscriptionManager.ensureInitialized();
    this.initialized = true;
  }

  /**
   * Render badge
   */
  async render() {
    await this.ensureInitialized();

    const tier = await subscriptionManager.getTier();
    const status = await subscriptionManager.getStatus();
    const pricing = TIER_PRICING[tier];

    const html = this.generateHTML(tier, status, pricing);
    
    if (this.container) {
      this.container.innerHTML = html;
      this.setupEventListeners();
    } else {
      const badge = document.createElement('div');
      badge.className = 'subscription-badge';
      badge.innerHTML = html;
      this.setupEventListeners(badge);
      return badge;
    }
  }

  /**
   * Generate HTML
   */
  generateHTML(tier, status, pricing) {
    const tierNames = {
      free: 'Free',
      basic: 'Basic',
      pro: 'Pro',
      byok: 'BYOK'
    };

    const tierColors = {
      free: '#666',
      basic: '#4285f4',
      pro: '#ea4335',
      byok: '#34a853'
    };

    const isTrial = status === 'trial';
    const isExpired = status === 'expired';

    return `
      <div class="subscription-badge-container">
        <div class="subscription-badge-header">
          <span class="subscription-badge-tier" style="color: ${tierColors[tier]}">
            ${tierNames[tier]}
          </span>
          ${isTrial ? '<span class="subscription-badge-trial">Trial</span>' : ''}
          ${isExpired ? '<span class="subscription-badge-expired">Expired</span>' : ''}
        </div>
        
        ${tier !== 'free' && tier !== 'byok' ? `
        <div class="subscription-badge-info">
          <span>$${pricing.price}/month</span>
        </div>
        ` : ''}
        
        <div class="subscription-badge-actions">
          ${tier === 'free' ? `
            <button class="subscription-badge-btn primary">Start Trial</button>
          ` : `
            <button class="subscription-badge-btn secondary">Manage</button>
          `}
        </div>
      </div>
    `;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners(container = this.container) {
    const startTrialBtn = container?.querySelector('.subscription-badge-btn.primary');
    const manageBtn = container?.querySelector('.subscription-badge-btn.secondary');

    startTrialBtn?.addEventListener('click', () => {
      if (typeof window !== 'undefined' && window.showSubscriptionModal) {
        window.showSubscriptionModal();
      } else {
        chrome.runtime.openOptionsPage();
      }
    });

    manageBtn?.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
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
  .subscription-badge-container {
    background: white;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .subscription-badge-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  
  .subscription-badge-tier {
    font-size: 18px;
    font-weight: 600;
  }
  
  .subscription-badge-trial,
  .subscription-badge-expired {
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 600;
  }
  
  .subscription-badge-trial {
    background: #e8f0fe;
    color: #1967d2;
  }
  
  .subscription-badge-expired {
    background: #fce8e6;
    color: #c5221f;
  }
  
  .subscription-badge-info {
    font-size: 14px;
    color: #666;
    margin-bottom: 12px;
  }
  
  .subscription-badge-actions {
    display: flex;
    gap: 8px;
  }
  
  .subscription-badge-btn {
    flex: 1;
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .subscription-badge-btn.primary {
    background: #4285f4;
    color: white;
  }
  
  .subscription-badge-btn.primary:hover {
    background: #357ae8;
  }
  
  .subscription-badge-btn.secondary {
    background: #f1f1f1;
    color: #1a1a1a;
  }
  
  .subscription-badge-btn.secondary:hover {
    background: #e0e0e0;
  }
`;

if (!document.getElementById('subscription-badge-styles')) {
  style.id = 'subscription-badge-styles';
  document.head.appendChild(style);
}


/**
 * Upgrade Prompts
 * Shows contextual upgrade prompts to users
 */

import { subscriptionManager } from '../subscription/subscription-manager.js';
import { TIER_PRICING } from '../subscription/subscription-config.js';

class UpgradePrompts {
  constructor() {
    this.activePrompts = new Set();
  }

  /**
   * Show upgrade prompt
   * @param {string} context - Context ('limit_reached' | 'feature_locked' | 'model_not_available' | 'near_limit')
   * @param {Object} data - Additional data
   */
  async show(context, data = {}) {
    // Prevent duplicate prompts
    const promptId = `${context}-${data.featureName || data.modelId || ''}`;
    if (this.activePrompts.has(promptId)) {
      return;
    }

    this.activePrompts.add(promptId);

    try {
      switch (context) {
        case 'limit_reached':
        case 'daily_request_limit_exceeded':
        case 'daily_token_limit_exceeded':
          await this.showLimitReached(data);
          break;

        case 'feature_not_available':
        case 'feature_locked':
          await this.showFeatureLocked(data.featureName, data.requiredTier);
          break;

        case 'model_not_available':
          await this.showModelNotAvailable(data.modelId, data.requiredTier);
          break;

        case 'near_limit':
          await this.showNearLimit(data);
          break;

        default:
          await this.showGenericUpgrade(data);
      }
    } finally {
      // Remove from active prompts after a delay
      setTimeout(() => {
        this.activePrompts.delete(promptId);
      }, 5000);
    }
  }

  /**
   * Show limit reached prompt
   */
  async showLimitReached(data) {
    const tier = await subscriptionManager.getTier();
    const pricing = TIER_PRICING[tier === 'free' ? 'basic' : 'pro'];

    const message = data.type === 'tokens'
      ? `You've reached your daily token limit (${data.current}/${data.limit}). Upgrade to get more!`
      : `You've used all ${data.limit} free requests today. Upgrade to get more!`;

    this.createPrompt({
      title: 'Daily Limit Reached',
      message: message,
      actions: [
        { text: `Upgrade to ${tier === 'free' ? 'Basic' : 'Pro'} - $${pricing.price}/mo`, action: 'upgrade', primary: true },
        { text: 'Start 7-Day Free Trial', action: 'trial' },
        { text: 'Maybe Later', action: 'dismiss' }
      ]
    });
  }

  /**
   * Show feature locked prompt
   */
  async showFeatureLocked(featureName, requiredTier) {
    const featureNames = {
      screenshot: 'Screenshot',
      recording: 'Screen Recording',
      gmailIntegration: 'Gmail Integration',
      meetTranslation: 'Google Meet Translation',
      teamsTranslation: 'Microsoft Teams Translation',
      pdfChat: 'PDF Chat'
    };

    const displayName = featureNames[featureName] || featureName;
    const pricing = TIER_PRICING[requiredTier];

    this.createPrompt({
      title: 'Premium Feature',
      message: `${displayName} is available in ${requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)} tier and above.`,
      actions: [
        { text: `Start Free Trial - $${pricing.price}/mo`, action: 'trial', primary: true },
        { text: 'View Plans', action: 'view_plans' },
        { text: 'Maybe Later', action: 'dismiss' }
      ]
    });
  }

  /**
   * Show model not available prompt
   */
  async showModelNotAvailable(modelId, requiredTier) {
    const pricing = TIER_PRICING[requiredTier];

    this.createPrompt({
      title: 'Advanced Model',
      message: `This model requires ${requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)} tier. Upgrade to access advanced models!`,
      actions: [
        { text: `Start Free Trial - $${pricing.price}/mo`, action: 'trial', primary: true },
        { text: 'View Plans', action: 'view_plans' },
        { text: 'Maybe Later', action: 'dismiss' }
      ]
    });
  }

  /**
   * Show near limit prompt
   */
  async showNearLimit(data) {
    const remaining = data.limit - data.current;
    const percentage = Math.round((data.current / data.limit) * 100);

    this.createPrompt({
      title: 'Approaching Limit',
      message: `You've used ${percentage}% of your daily limit (${data.current}/${data.limit} ${data.type || 'requests'}). Consider upgrading for more!`,
      actions: [
        { text: 'Upgrade Now', action: 'upgrade', primary: true },
        { text: 'Maybe Later', action: 'dismiss' }
      ],
      type: 'info' // Less urgent
    });
  }

  /**
   * Show generic upgrade prompt
   */
  async showGenericUpgrade(data) {
    this.createPrompt({
      title: 'Upgrade Required',
      message: data.message || 'Upgrade to access this feature.',
      actions: [
        { text: 'Start Free Trial', action: 'trial', primary: true },
        { text: 'View Plans', action: 'view_plans' },
        { text: 'Maybe Later', action: 'dismiss' }
      ]
    });
  }

  /**
   * Create prompt element
   */
  createPrompt(config) {
    // Remove existing prompts
    const existing = document.querySelectorAll('.upgrade-prompt');
    existing.forEach(el => el.remove());

    const prompt = document.createElement('div');
    prompt.className = 'upgrade-prompt';
    prompt.innerHTML = `
      <div class="upgrade-prompt-content">
        <div class="upgrade-prompt-header">
          <h3>${config.title}</h3>
          <button class="upgrade-prompt-close" aria-label="Close">×</button>
        </div>
        <div class="upgrade-prompt-body">
          <p>${config.message}</p>
        </div>
        <div class="upgrade-prompt-actions">
          ${config.actions.map(action => `
            <button class="upgrade-prompt-btn ${action.primary ? 'primary' : 'secondary'}" 
                    data-action="${action.action}">
              ${action.text}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    // Add styles
    this.addPromptStyles();

    // Add event listeners
    this.setupPromptHandlers(prompt, config.actions);

    // Append to body
    document.body.appendChild(prompt);

    // Animate in
    setTimeout(() => {
      prompt.classList.add('show');
    }, 10);
  }

  /**
   * Add prompt styles
   */
  addPromptStyles() {
    if (document.getElementById('upgrade-prompt-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'upgrade-prompt-styles';
    style.textContent = `
      .upgrade-prompt {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s;
      }
      
      .upgrade-prompt.show {
        opacity: 1;
      }
      
      .upgrade-prompt-content {
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        transform: scale(0.9);
        transition: transform 0.3s;
      }
      
      .upgrade-prompt.show .upgrade-prompt-content {
        transform: scale(1);
      }
      
      .upgrade-prompt-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      
      .upgrade-prompt-header h3 {
        margin: 0;
        font-size: 20px;
        color: #1a1a1a;
      }
      
      .upgrade-prompt-close {
        background: none;
        border: none;
        font-size: 24px;
        color: #666;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .upgrade-prompt-close:hover {
        color: #1a1a1a;
      }
      
      .upgrade-prompt-body {
        margin-bottom: 20px;
      }
      
      .upgrade-prompt-body p {
        margin: 0;
        color: #666;
        font-size: 14px;
        line-height: 1.5;
      }
      
      .upgrade-prompt-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      
      .upgrade-prompt-btn {
        flex: 1;
        min-width: 120px;
        padding: 10px 20px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .upgrade-prompt-btn.primary {
        background: #4285f4;
        color: white;
      }
      
      .upgrade-prompt-btn.primary:hover {
        background: #357ae8;
      }
      
      .upgrade-prompt-btn.secondary {
        background: #f1f1f1;
        color: #1a1a1a;
      }
      
      .upgrade-prompt-btn.secondary:hover {
        background: #e0e0e0;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Setup prompt event handlers
   */
  setupPromptHandlers(prompt, actions) {
    const closeBtn = prompt.querySelector('.upgrade-prompt-close');
    const actionBtns = prompt.querySelectorAll('.upgrade-prompt-btn');

    // Close button
    closeBtn?.addEventListener('click', () => {
      this.closePrompt(prompt);
    });

    // Action buttons
    actionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        this.handleAction(action);
        this.closePrompt(prompt);
      });
    });

    // Close on background click
    prompt.addEventListener('click', (e) => {
      if (e.target === prompt) {
        this.closePrompt(prompt);
      }
    });
  }

  /**
   * Handle action
   */
  handleAction(action) {
    switch (action) {
      case 'upgrade':
      case 'trial':
        // Open subscription page or show subscription modal
        if (typeof window !== 'undefined' && window.showSubscriptionModal) {
          window.showSubscriptionModal();
        } else {
          chrome.runtime.openOptionsPage();
        }
        break;

      case 'view_plans':
        // Open plans page
        chrome.runtime.openOptionsPage();
        break;

      case 'dismiss':
        // Just close
        break;
    }
  }

  /**
   * Close prompt
   */
  closePrompt(prompt) {
    prompt.classList.remove('show');
    setTimeout(() => {
      prompt.remove();
    }, 300);
  }
}

// Create singleton instance
const upgradePrompts = new UpgradePrompts();

// Export both class and instance
export { UpgradePrompts, upgradePrompts };

// Make available globally
if (typeof window !== 'undefined') {
  window.upgradePrompts = upgradePrompts;
  window.showUpgradePrompt = (context, data) => upgradePrompts.show(context, data);
}


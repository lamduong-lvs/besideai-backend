/**
 * Onboarding Manager
 * Handles first-time installation and onboarding flow
 */

import { subscriptionManager } from './subscription-manager.js';
// Don't import upgradePrompts here - it uses DOM APIs not available in service worker

const STORAGE_KEY = 'onboarding_status';

class OnboardingManager {
  constructor() {
    this.status = null;
  }

  /**
   * Initialize onboarding manager
   */
  async initialize() {
    await this.loadFromStorage();
  }

  /**
   * Check if user has completed onboarding
   * @returns {Promise<boolean>}
   */
  async hasCompletedOnboarding() {
    await this.ensureInitialized();
    return this.status?.completed === true;
  }

  /**
   * Mark onboarding as completed
   * @param {Object} data - Additional data
   */
  async completeOnboarding(data = {}) {
    this.status = {
      completed: true,
      completedAt: Date.now(),
      ...data
    };
    await this.saveToStorage();
  }

  /**
   * Show welcome screen
   * @returns {Promise<void>}
   */
  async showWelcomeScreen() {
    // Check if already completed
    if (await this.hasCompletedOnboarding()) {
      return;
    }

    // Create and show welcome screen
    const welcomeScreen = this.createWelcomeScreen();
    document.body.appendChild(welcomeScreen);

    // Handle button clicks
    this.setupWelcomeScreenHandlers(welcomeScreen);
  }

  /**
   * Create welcome screen HTML
   */
  createWelcomeScreen() {
    const screen = document.createElement('div');
    screen.id = 'onboarding-welcome-screen';
    screen.className = 'onboarding-welcome-screen';
    screen.innerHTML = `
      <div class="onboarding-welcome-content">
        <div class="onboarding-welcome-header">
          <h1>Welcome to AI Chat Assistant!</h1>
          <p>Your AI-powered productivity companion</p>
        </div>
        
        <div class="onboarding-welcome-features">
          <div class="feature-item">
            <span class="feature-icon">💬</span>
            <div>
              <h3>AI Chat</h3>
              <p>Chat with AI on any website</p>
            </div>
          </div>
          <div class="feature-item">
            <span class="feature-icon">🌐</span>
            <div>
              <h3>Translation</h3>
              <p>Translate content instantly</p>
            </div>
          </div>
          <div class="feature-item">
            <span class="feature-icon">📧</span>
            <div>
              <h3>Gmail Integration</h3>
              <p>Summarize and manage emails</p>
            </div>
          </div>
          <div class="feature-item">
            <span class="feature-icon">🎥</span>
            <div>
              <h3>Meeting Tools</h3>
              <p>Record and translate meetings</p>
            </div>
          </div>
        </div>

        <div class="onboarding-welcome-actions">
          <button id="onboarding-start-free" class="btn btn-secondary">
            Get Started Free
          </button>
          <button id="onboarding-start-trial" class="btn btn-primary">
            Start 7-Day Free Trial
          </button>
        </div>

        <div class="onboarding-welcome-info">
          <p>Free tier: 10 requests/day • Start exploring now!</p>
        </div>
      </div>
    `;

    // Add styles
    this.addWelcomeScreenStyles();

    return screen;
  }

  /**
   * Add welcome screen styles
   */
  addWelcomeScreenStyles() {
    if (document.getElementById('onboarding-welcome-styles')) {
      return; // Already added
    }

    const style = document.createElement('style');
    style.id = 'onboarding-welcome-styles';
    style.textContent = `
      .onboarding-welcome-screen {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .onboarding-welcome-content {
        background: white;
        border-radius: 12px;
        padding: 40px;
        max-width: 600px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      }
      
      .onboarding-welcome-header {
        text-align: center;
        margin-bottom: 30px;
      }
      
      .onboarding-welcome-header h1 {
        margin: 0 0 10px 0;
        font-size: 28px;
        color: #1a1a1a;
      }
      
      .onboarding-welcome-header p {
        margin: 0;
        color: #666;
        font-size: 16px;
      }
      
      .onboarding-welcome-features {
        margin-bottom: 30px;
      }
      
      .feature-item {
        display: flex;
        align-items: center;
        padding: 15px;
        margin-bottom: 10px;
        background: #f5f5f5;
        border-radius: 8px;
      }
      
      .feature-icon {
        font-size: 32px;
        margin-right: 15px;
      }
      
      .feature-item h3 {
        margin: 0 0 5px 0;
        font-size: 16px;
        color: #1a1a1a;
      }
      
      .feature-item p {
        margin: 0;
        font-size: 14px;
        color: #666;
      }
      
      .onboarding-welcome-actions {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
      }
      
      .onboarding-welcome-actions .btn {
        flex: 1;
        padding: 12px 24px;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .btn-primary {
        background: #4285f4;
        color: white;
      }
      
      .btn-primary:hover {
        background: #357ae8;
      }
      
      .btn-secondary {
        background: #f1f1f1;
        color: #1a1a1a;
      }
      
      .btn-secondary:hover {
        background: #e0e0e0;
      }
      
      .onboarding-welcome-info {
        text-align: center;
        color: #666;
        font-size: 14px;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Setup welcome screen event handlers
   */
  setupWelcomeScreenHandlers(screen) {
    const startFreeBtn = screen.querySelector('#onboarding-start-free');
    const startTrialBtn = screen.querySelector('#onboarding-start-trial');

    startFreeBtn?.addEventListener('click', async () => {
      await this.handleStartFree();
      this.closeWelcomeScreen(screen);
    });

    startTrialBtn?.addEventListener('click', async () => {
      await this.handleStartTrial();
      this.closeWelcomeScreen(screen);
    });
  }

  /**
   * Handle "Get Started Free" click
   */
  async handleStartFree() {
    // Set tier to free
    try {
      await subscriptionManager.setTier('free');
    } catch (error) {
      console.error('[OnboardingManager] Failed to set tier:', error);
    }

    // Mark onboarding as completed
    await this.completeOnboarding({
      chosenOption: 'free'
    });

    console.log('[OnboardingManager] User chose free tier');
  }

  /**
   * Handle "Start Trial" click
   */
  async handleStartTrial() {
    // Redirect to authentication and subscription selection
    // This will be handled by the subscription controller
    if (typeof window !== 'undefined' && window.showSubscriptionModal) {
      window.showSubscriptionModal();
    } else {
      // Fallback: open settings page
      chrome.runtime.openOptionsPage();
    }

    // Mark onboarding as started (not completed yet - will complete after subscription)
    await this.completeOnboarding({
      chosenOption: 'trial',
      trialStarted: true
    });

    console.log('[OnboardingManager] User chose to start trial');
  }

  /**
   * Close welcome screen
   */
  closeWelcomeScreen(screen) {
    screen.style.opacity = '0';
    setTimeout(() => {
      screen.remove();
    }, 300);
  }

  /**
   * Show upgrade prompt (contextual)
   * @param {string} context - Context ('limit' | 'feature' | 'model')
   * @param {Object} data - Additional data
   */
  async showUpgradePrompt(context, data = {}) {
    // Service worker context - can't show UI prompts
    if (typeof document === 'undefined') {
      return;
    }

    // Only try to show in DOM contexts (panel, content scripts)
    // Use window.upgradePrompts if available (set by panel)
    if (typeof window !== 'undefined' && window.upgradePrompts) {
      try {
        await window.upgradePrompts.show(context, data);
      } catch (error) {
        console.warn('[OnboardingManager] Failed to show upgrade prompt:', error);
      }
    }
  }

  /**
   * Track onboarding progress
   * @param {string} step - Step name
   * @param {Object} data - Additional data
   */
  async trackProgress(step, data = {}) {
    if (!this.status) {
      this.status = {};
    }

    if (!this.status.steps) {
      this.status.steps = [];
    }

    this.status.steps.push({
      step,
      timestamp: Date.now(),
      ...data
    });

    await this.saveToStorage();
  }

  /**
   * Load from storage
   */
  async loadFromStorage() {
    try {
      const data = await chrome.storage.local.get([STORAGE_KEY]);
      this.status = data[STORAGE_KEY] || null;
    } catch (error) {
      console.error('[OnboardingManager] Failed to load from storage:', error);
      this.status = null;
    }
  }

  /**
   * Save to storage
   */
  async saveToStorage() {
    try {
      await chrome.storage.local.set({
        [STORAGE_KEY]: this.status
      });
    } catch (error) {
      console.error('[OnboardingManager] Failed to save to storage:', error);
    }
  }

  /**
   * Ensure initialized
   */
  async ensureInitialized() {
    if (!this.status) {
      await this.initialize();
    }
  }
}

// Create singleton instance (same pattern as auth and apiManager)
const onboardingManager = new OnboardingManager();

// Export both class and instance
export { OnboardingManager, onboardingManager };

// Make available globally
if (typeof window !== 'undefined') {
  window.onboardingManager = onboardingManager;
}


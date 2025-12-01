// app-init.js
// Application initialization

// Import utils from panel-utils wrapper for consistent imports
import { apiManager, themeManager } from '../utils/panel-utils.js';
import { auth } from '../../auth/auth.js';
import { initAuthWidget } from '../../auth/ui/auth-widget.js';
import { loadSettings } from '../controllers/settings-controller.js';
import { updateUserAvatar, resetUserAvatar } from '../utils/avatar.js';
import { updatePanelThemeUI } from '../utils/theme.js';
import { updateDefaultModelName } from '../utils/model.js';
import { updateGreetingWithUserName } from '../chat/chat-ui.js';
// Chat input removed - không còn sử dụng

// Subscription modules
import { subscriptionManager } from '../../subscription/subscription-manager.js';
import { usageTracker } from '../../subscription/usage-tracker.js';
import { getApiGateway } from '../../api-gateway/api-gateway.js';
import { backendInit } from '../../subscription/backend-init.js';
import { UserMenu } from '../components/UserMenu.js';

export async function initializeApp(Lang) {
  try {
    // ✅ Initialize theme manager FIRST to load and apply theme from storage
    await themeManager.init();
    console.log('[Panel] Theme manager initialized, current theme:', themeManager.currentTheme);
    
    // Add listener to update UI when theme changes
    themeManager.addListener((theme) => {
      updatePanelThemeUI(theme);
    });
    
    await auth.initialize();
    console.log('[Panel] Auth module initialized');
    
    // NOTE: Auth widget is now replaced by UserMenu
    // Hide authWidget container immediately - UserMenu will be rendered instead
    const authContainer = document.getElementById('authWidgetContainer');
    if (authContainer) {
      authContainer.style.display = 'none';
      authContainer.style.visibility = 'hidden';
      authContainer.style.opacity = '0';
      authContainer.style.position = 'absolute';
      authContainer.style.pointerEvents = 'none';
      authContainer.style.width = '0';
      authContainer.style.height = '0';
      authContainer.style.overflow = 'hidden';
    }
    
    // Chat input removed - không còn sử dụng
    
    // Lắng nghe input:initialized event để update model name và token display
    document.addEventListener('input:initialized', async (event) => {
      const { type, containerId } = event.detail;
      if (type === 'chat' || type === 'pdfChat' || type === 'gmail') {
        setTimeout(async () => {
          // PDF Chat có model riêng, cần update riêng
          if (type === 'pdfChat') {
            const { updateModelNameDisplay } = await import('../utils/model.js');
            await updateModelNameDisplay(null, 'pdfChat');
          } else {
            // Chat và các input types khác dùng default model
            await updateDefaultModelName();
          }
          
          // Sync token display với subscription system
          await syncTokenDisplay(containerId);
        }, 100);
      }
    });
    
    // Update user avatar from existing session if user is logged in
    try {
      const isLoggedIn = await auth.isLoggedIn();
      if (isLoggedIn) {
        const user = await auth.getCurrentUser();
        if (user && user.picture) {
          updateUserAvatar(user.picture, Lang);
        } else {
          resetUserAvatar(Lang);
        }
      } else {
        resetUserAvatar(Lang);
      }
    } catch (error) {
      console.error('[Panel] Error updating user avatar on init:', error);
      resetUserAvatar(Lang);
    }
    
    // Update theme UI toggle checkbox to match current theme
    updatePanelThemeUI(themeManager.currentTheme);
    
    // ✅ Load settings from storage to apply to Panel
    await loadSettings();
    console.log('[Panel] Settings loaded from storage');
    
    // Update model name after input is initialized
    setTimeout(async () => {
      console.log('[Panel] Attempting to update default model name...');
      await updateDefaultModelName();
      
      // Chat input removed - không còn verify model name cho chat input
    }, 300);
    
    updateGreetingWithUserName();

    // ✅ Initialize subscription system
    await initializeSubscriptionSystem(Lang);
    
    // ✅ Initialize backend sync systems (non-blocking)
    backendInit.initialize({ syncOnInit: true, checkMigration: false }).catch(err => {
      console.warn('[Panel] Backend initialization failed:', err);
    });
    
    // ✅ Initialize user menu (replaces old subscription components)
    console.log('[Panel] Starting user menu initialization...');
    await initializeUserMenu();
    console.log('[Panel] User menu initialization completed');
    
    // ✅ Setup token display sync
    console.log('[Panel] Starting token display sync setup...');
    await setupTokenDisplaySync();
    console.log('[Panel] Token display sync setup completed');
    
    // ✅ Setup token usage menu
    console.log('[Panel] Starting token usage menu setup...');
    await setupTokenUsageMenu();
    console.log('[Panel] Token usage menu setup completed');
  } catch (error) {
    console.error('[Panel] Error initializing app:', error);
  }
}

/**
 * Initialize subscription system
 */
async function initializeSubscriptionSystem(Lang) {
  try {
    // Initialize subscription manager
    await subscriptionManager.initialize();
    console.log('[Panel] Subscription manager initialized');

    // Initialize usage tracker
    await usageTracker.initialize();
    console.log('[Panel] Usage tracker initialized');

    // Initialize API gateway
    const apiGateway = getApiGateway();
    await apiGateway.initialize();
    console.log('[Panel] API gateway initialized');

    // Make available globally
    window.subscriptionManager = subscriptionManager;
    window.usageTracker = usageTracker;
    window.apiGateway = apiGateway;

    // Subscription components are now integrated into user menu
    // No need to render separate components
  } catch (error) {
    console.error('[Panel] Error initializing subscription system:', error);
  }
}

/**
 * Initialize user menu component
 */
async function initializeUserMenu() {
  try {
    const userPopup = document.getElementById('userPopup');
    if (!userPopup) {
      console.warn('[Panel] User popup not found');
      return;
    }

    // Hide old auth widget container completely
    const authWidgetContainer = userPopup.querySelector('#authWidgetContainer');
    if (authWidgetContainer) {
      authWidgetContainer.style.display = 'none';
      authWidgetContainer.style.visibility = 'hidden';
      authWidgetContainer.style.position = 'absolute';
      authWidgetContainer.style.opacity = '0';
      authWidgetContainer.style.pointerEvents = 'none';
      authWidgetContainer.style.width = '0';
      authWidgetContainer.style.height = '0';
      authWidgetContainer.style.overflow = 'hidden';
      // Clear its content to prevent any rendering
      authWidgetContainer.innerHTML = '';
    }

    // Create container for user menu (always create, even if not logged in)
    let userMenuContainer = document.getElementById('userMenuContainer');
    if (!userMenuContainer) {
      userMenuContainer = document.createElement('div');
      userMenuContainer.id = 'userMenuContainer';
      userMenuContainer.className = 'user-menu-container';
      userPopup.appendChild(userMenuContainer);
    }

    // Initialize and render user menu (even if not logged in, menu will handle it)
    const userMenu = new UserMenu(userMenuContainer);
    await userMenu.render();
    window.userMenu = userMenu; // Make available globally
    
    // Ensure userMenuContainer is visible
    userMenuContainer.style.display = 'block';
    userMenuContainer.style.visibility = 'visible';
    userMenuContainer.style.opacity = '1';
    
    console.log('[Panel] User menu initialized and rendered');
  } catch (error) {
    console.error('[Panel] Error initializing user menu:', error);
  }
}

/**
 * Sync token display with subscription system
 */
async function syncTokenDisplay(containerId) {
  try {
    await subscriptionManager.ensureInitialized();
    await usageTracker.ensureInitialized();
    
    const tier = await subscriptionManager.getTier();
    const limits = await subscriptionManager.getLimits();
    const today = await usageTracker.getTodayUsage();
    
    // Get token limit for current tier
    const tokenLimit = limits.tokensPerDay || 0;
    const tokensUsed = today.tokens || 0;
    const tokensRemaining = Math.max(0, tokenLimit - tokensUsed);
    
    // Update token display in input footer
    const { inputManager } = await import('../../input/index.js');
    const inputInstance = inputManager.getInstance(containerId);
    if (inputInstance) {
      inputInstance.updateTokenUsage(tokensUsed, tokenLimit);
    }
    
    console.log(`[Panel] Token display synced for ${containerId}: ${tokensRemaining} remaining`);
  } catch (error) {
    console.error('[Panel] Error syncing token display:', error);
  }
}

/**
 * Setup token display sync on usage changes
 */
async function setupTokenDisplaySync() {
  try {
    // Sync khi usage thay đổi
    if (typeof window !== 'undefined') {
      window.addEventListener('usage:updated', async () => {
        const { inputManager } = await import('../../input/index.js');
        const instances = inputManager.getAllInstances();
        
        for (const [containerId, instance] of instances) {
          if (instance && instance.config && instance.config.showFooter) {
            await syncTokenDisplay(containerId);
          }
        }
      });
    }
    
    // Sync định kỳ mỗi 30 giây (backup)
    setInterval(async () => {
      const { inputManager } = await import('../../input/index.js');
      const instances = inputManager.getAllInstances();
      
      for (const [containerId, instance] of instances) {
        if (instance && instance.config && instance.config.showFooter) {
          await syncTokenDisplay(containerId);
        }
      }
    }, 30000);
    
    // Sync ngay lập tức cho các input đã có
    setTimeout(async () => {
      const { inputManager } = await import('../../input/index.js');
      const instances = inputManager.getAllInstances();
      
      for (const [containerId, instance] of instances) {
        if (instance && instance.config && instance.config.showFooter) {
          await syncTokenDisplay(containerId);
        }
      }
    }, 1000);
    
    console.log('[Panel] Token display sync setup complete');
  } catch (error) {
    console.error('[Panel] Error setting up token display sync:', error);
  }
}

/**
 * Setup token usage menu
 */
async function setupTokenUsageMenu() {
  try {
    // Import TokenUsageMenu
    const { TokenUsageMenu } = await import('../components/TokenUsageMenu.js');
    
    // Create popup container if it doesn't exist
    let tokenUsagePopup = document.getElementById('tokenUsagePopup');
    if (!tokenUsagePopup) {
      tokenUsagePopup = document.createElement('div');
      tokenUsagePopup.id = 'tokenUsagePopup';
      tokenUsagePopup.className = 'token-usage-popup';
      document.body.appendChild(tokenUsagePopup);
    }
    
    // Create menu instance
    const tokenUsageMenu = new TokenUsageMenu(tokenUsagePopup);
    window.tokenUsageMenu = tokenUsageMenu;
    
    // Listen for token display click events
    const handleTokenDisplayClick = async (event) => {
      const { tokenDisplay } = event.detail || {};
      
      if (!tokenDisplay) {
        console.warn('[Panel] Token display not found in event detail');
        return;
      }
      
      if (!tokenUsagePopup) {
        console.warn('[Panel] Token usage popup not found');
        return;
      }
      
      console.log('[Panel] Token display clicked, showing menu');
      
      // Position popup relative to token display
      const rect = tokenDisplay.getBoundingClientRect();
      tokenUsagePopup.style.position = 'fixed';
      tokenUsagePopup.style.left = `${rect.left}px`;
      tokenUsagePopup.style.top = `${rect.top - 10}px`;
      tokenUsagePopup.style.transform = 'translateY(-100%)';
      tokenUsagePopup.style.zIndex = '100000';
      
      // Refresh and show menu
      try {
        await tokenUsageMenu.refresh();
        tokenUsageMenu.show();
        console.log('[Panel] Token usage menu shown');
      } catch (error) {
        console.error('[Panel] Error showing token usage menu:', error);
      }
    };
    
    document.addEventListener('input:token-display-clicked', handleTokenDisplayClick);
    
    // Also listen for clicks directly on token display elements (fallback)
    setTimeout(() => {
      const tokenDisplays = document.querySelectorAll('.footer-token-display');
      tokenDisplays.forEach(tokenDisplay => {
        // Remove existing listeners to avoid duplicates
        const newTokenDisplay = tokenDisplay.cloneNode(true);
        tokenDisplay.parentNode.replaceChild(newTokenDisplay, tokenDisplay);
        
        newTokenDisplay.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          handleTokenDisplayClick({ detail: { tokenDisplay: newTokenDisplay } });
        });
      });
      console.log('[Panel] Direct token display click listeners attached:', tokenDisplays.length);
    }, 1000);
    
    console.log('[Panel] Token usage menu setup complete');
  } catch (error) {
    console.error('[Panel] Error setting up token usage menu:', error);
  }
}

/**
 * Render subscription components in panel (DEPRECATED - now in user menu)
 */
async function renderSubscriptionComponents() {
  try {
    console.log('[Panel] Rendering subscription components...');
    
    // Find or create container for subscription components
    let subscriptionContainer = document.getElementById('subscription-container');
    
    if (!subscriptionContainer) {
      // Try footer area first (most visible and stable)
      const footerInput = document.querySelector('.footer-input');
      const mainContent = document.querySelector('.main-content-wrapper');
      
      console.log('[Panel] Footer input found:', !!footerInput, 'Main content found:', !!mainContent);
      
      if (footerInput && mainContent) {
        // Add before footer-input (footer area)
        subscriptionContainer = document.createElement('div');
        subscriptionContainer.id = 'subscription-container';
        subscriptionContainer.className = 'subscription-container';
        // Compact horizontal layout for footer
        subscriptionContainer.style.cssText = 'display: flex !important; flex-direction: row !important; gap: 12px !important; align-items: center !important; padding: 8px 12px !important; border-top: 1px solid var(--border-color, #e0e0e0) !important; background: var(--bg-secondary, #f5f5f5) !important; min-height: auto !important; visibility: visible !important; opacity: 1 !important; width: 100% !important; box-sizing: border-box !important; flex-wrap: wrap !important; flex-shrink: 0 !important;';
        mainContent.insertBefore(subscriptionContainer, footerInput);
        console.log('[Panel] Added subscription container to footer area');
      } else if (mainContent) {
        // Fallback: Add at the end of main content
        subscriptionContainer = document.createElement('div');
        subscriptionContainer.id = 'subscription-container';
        subscriptionContainer.className = 'subscription-container';
        // Compact horizontal layout
        subscriptionContainer.style.cssText = 'display: flex !important; flex-direction: row !important; gap: 12px !important; align-items: center !important; padding: 8px 12px !important; border-top: 1px solid var(--border-color, #e0e0e0) !important; background: var(--bg-secondary, #f5f5f5) !important; visibility: visible !important; opacity: 1 !important; width: 100% !important; box-sizing: border-box !important; flex-wrap: wrap !important; flex-shrink: 0 !important;';
        mainContent.appendChild(subscriptionContainer);
        console.log('[Panel] Added subscription container to end of main content');
      } else {
        console.warn('[Panel] Could not find suitable container to add subscription components');
      }
    }

    if (subscriptionContainer) {
      console.log('[Panel] Subscription container found, rendering components...');
      console.log('[Panel] Container element:', subscriptionContainer);
      console.log('[Panel] Container parent:', subscriptionContainer.parentElement);
      console.log('[Panel] Container computed style:', window.getComputedStyle(subscriptionContainer).display);
      
      // Render subscription badge
      const badgeContainer = document.createElement('div');
      badgeContainer.id = 'subscription-badge-container';
      subscriptionContainer.appendChild(badgeContainer);
      
      const subscriptionBadge = new SubscriptionBadge(badgeContainer);
      await subscriptionBadge.render();
      console.log('[Panel] Subscription badge rendered');
      console.log('[Panel] Badge container HTML:', badgeContainer.innerHTML.substring(0, 100));

      // Render usage dashboard
      const dashboardContainer = document.createElement('div');
      dashboardContainer.id = 'usage-dashboard-container';
      subscriptionContainer.appendChild(dashboardContainer);
      
      const usageDashboard = new UsageDashboard(dashboardContainer);
      await usageDashboard.render();
      usageDashboard.setupEventListeners();
      console.log('[Panel] Usage dashboard rendered');
      console.log('[Panel] Dashboard container HTML:', dashboardContainer.innerHTML.substring(0, 100));
      
      // Force visibility check
      console.log('[Panel] Container visible:', subscriptionContainer.offsetHeight > 0);
      console.log('[Panel] Badge visible:', badgeContainer.offsetHeight > 0);
      console.log('[Panel] Dashboard visible:', dashboardContainer.offsetHeight > 0);
    } else {
      console.warn('[Panel] No subscription container available');
    }
  } catch (error) {
    console.error('[Panel] Error rendering subscription components:', error);
  }
}


// auth.js
// Auth event handlers and premium features

import { auth, SESSION_EVENTS } from '../../auth/auth.js';
import { updateUserAvatar, resetUserAvatar } from '../utils/avatar.js';
import { showSuccess, showInfo } from '../utils/toast.js';
import { updateGreetingWithUserName } from '../chat/chat-ui.js';
import { backendInit } from '../../subscription/backend-init.js';

export function setupAuthListeners(Lang) {
  auth.on(SESSION_EVENTS.CREATED, async (user) => {
    // Re-render user menu when user logs in
    if (window.userMenu) {
      await window.userMenu.render();
    }
    console.log('[Panel] User logged in:', user);
    showSuccess(Lang.get("successLogin", { name: user.name || user.email }));
    if (user.picture) {
      updateUserAvatar(user.picture, Lang);
    }
    updateGreetingWithUserName(auth);
    enablePremiumFeatures();
    
    // Initialize backend systems and sync after login
    try {
      await backendInit.initialize({
        startSync: true,
        checkMigration: true,
        syncOnInit: true // Sync immediately after login
      });
      console.log('[Panel] Backend sync triggered after login');
    } catch (error) {
      console.warn('[Panel] Failed to initialize backend after login:', error);
    }
  });
  auth.on(SESSION_EVENTS.DESTROYED, async () => {
    console.log('[Panel] User logged out');
    
    // Close popup first to prevent flickering
    const userPopup = document.getElementById('userPopup');
    if (userPopup) {
      userPopup.classList.remove('show');
    }
    
    // Wait for popup to close before re-rendering
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Re-render user menu when user logs out
    if (window.userMenu) {
      await window.userMenu.render();
    }
    
    showInfo(Lang.get("infoLoggedOut"));
    resetUserAvatar(Lang);
    disablePremiumFeatures();
  });
  auth.on(SESSION_EVENTS.EXPIRED, async () => {
    console.log('[Panel] Session expired');
    
    // Close popup first to prevent flickering
    const userPopup = document.getElementById('userPopup');
    if (userPopup) {
      userPopup.classList.remove('show');
    }
    
    // Wait for popup to close before re-rendering
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Re-render user menu when session expires
    if (window.userMenu) {
      await window.userMenu.render();
    }
    
    showInfo(Lang.get("infoSessionExpired"));
    resetUserAvatar(Lang);
  });
}

export function enablePremiumFeatures() {
  const premiumFeatures = document.querySelectorAll('.premium-feature');
  premiumFeatures.forEach(feature => {
    feature.classList.remove('disabled');
    feature.removeAttribute('disabled');
  });
}

export function disablePremiumFeatures() {
  const premiumFeatures = document.querySelectorAll('.premium-feature');
  premiumFeatures.forEach(feature => {
    feature.classList.add('disabled');
    feature.setAttribute('disabled', 'true');
  });
}


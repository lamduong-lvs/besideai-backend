// setting/modules/navigation/main-nav.js - Main sidebar navigation

import { showPage } from '../core/page-manager.js';
import { updateSearchBarPosition } from '../core/page-manager.js';
import { populateSubSidebar } from './sub-nav.js';
import { apiManager } from '../../../utils/api.js';

export function initMainNavigation() {
  const mainNavLinks = document.querySelectorAll('.menu-item-main');
  const subSidebar = document.getElementById('sidebar-sub');
  
  mainNavLinks.forEach(link => {
    link.addEventListener('click', async (e) => {
      e.preventDefault();
      mainNavLinks.forEach(i => i.classList.remove('active'));
      link.classList.add('active');
      const navGroup = link.dataset.navGroup;
      
      if (navGroup === 'model-settings') {
        console.log('[MainNav] Model settings clicked');
        subSidebar.classList.add('active');
        updateSearchBarPosition(true);
        
        // First, show the main model settings page immediately
        console.log('[MainNav] Showing model-settings-main immediately');
        showPage('model-settings-main');
        
        // Ensure model settings are loaded before showing pages
        try {
          // Check if providers are already loaded
          const providers = apiManager.getAllProviders();
          console.log('[MainNav] Current providers count:', providers?.length || 0);
          if (!providers || providers.length === 0) {
            console.log('[MainNav] Loading model settings...');
            // Load model settings if not already loaded
            const { loadModelSettings } = await import('../../services/model-settings.js');
            await loadModelSettings();
            console.log('[MainNav] Model settings loaded');
            
            // After loading, activate the first sub-link if it exists
            await new Promise(resolve => setTimeout(resolve, 100));
            const firstSubLink = subSidebar.querySelector('.menu-item-sub[data-page-id="model-settings-main"]');
            if (firstSubLink) {
              firstSubLink.classList.add('active');
              console.log('[MainNav] Activated first sub-link');
            }
          } else {
            // Providers already loaded, just activate the first sub-link
            await new Promise(resolve => setTimeout(resolve, 50));
            const firstSubLink = subSidebar.querySelector('.menu-item-sub[data-page-id="model-settings-main"]');
            if (firstSubLink && !subSidebar.querySelector('.menu-item-sub.active')) {
              firstSubLink.classList.add('active');
              console.log('[MainNav] Activated first sub-link (providers already loaded)');
            }
          }
        } catch (error) {
          console.error('[MainNav] Error loading model settings:', error);
        }
      } else {
        subSidebar.classList.remove('active');
        updateSearchBarPosition(false);
        showPage(navGroup);
      }
    });
  });
  
  // Activate initial link
  const initialActiveLink = document.querySelector('.menu-item-main.active');
  if (initialActiveLink) {
    setTimeout(() => {
      initialActiveLink.click();
    }, 50);
  } else {
    const fallbackLink = document.querySelector('.menu-item-main[data-nav-group="tai-khoan"]');
    if (fallbackLink) {
      fallbackLink.click();
    } else {
      updateSearchBarPosition(false);
    }
  }
}


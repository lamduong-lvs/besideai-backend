// setting/modules/navigation/sub-nav.js - Sub sidebar navigation

import { showPage } from '../core/page-manager.js';
import { updateSearchBarPosition } from '../core/page-manager.js';

export function populateSubSidebar(providers) {
  const subSidebar = document.getElementById('sidebar-sub');
  if (!subSidebar) {
    console.error('[SubNav] sidebar-sub not found');
    return;
  }
  if (!window.Lang) {
    console.error('[SubNav] window.Lang not available');
    return;
  }
  
  console.log('[SubNav] Populating sub-sidebar with', providers.length, 'providers');
  
  const providerLinks = providers.map(p =>
    `<li><a href="#${p.providerId}" class="menu-item-sub" data-page-id="provider-${p.providerId}">${p.name}</a></li>`
  ).join('');
  
  subSidebar.innerHTML = `
    <div class="sidebar-menu-group">
      <span class="menu-group-title">${window.Lang.get('navSubGroupGeneral') || 'General'}</span>
      <ul class="menu-list-sub">
        <li><a href="#model-settings-main" class="menu-item-sub" data-page-id="model-settings-main">${window.Lang.get('navSubDefaultRace') || 'Default & Race'}</a></li>
      </ul>
    </div>
    <div class="sidebar-menu-group">
      <span class="menu-group-title">${window.Lang.get('navSubGroupProviders') || 'Providers'}</span>
      <ul class="menu-list-sub">
        ${providerLinks}
      </ul>
    </div>`;
  
  console.log('[SubNav] Sub-sidebar HTML populated');
  
  // Attach listeners to newly created sub-links
  const subLinks = subSidebar.querySelectorAll('.menu-item-sub');
  console.log('[SubNav] Found', subLinks.length, 'sub-links');
  
  subLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const pageId = link.dataset.pageId;
      console.log('[SubNav] Sub-link clicked:', pageId);
      
      subSidebar.querySelectorAll('.menu-item-sub').forEach(i => i.classList.remove('active'));
      link.classList.add('active');
      showPage(pageId);
    });
  });
  
  console.log('[SubNav] Sub-sidebar populated successfully');
}


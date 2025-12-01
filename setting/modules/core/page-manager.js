// setting/modules/core/page-manager.js - Page management utilities

export function showPage(pageId) {
  console.log(`[PageManager] showPage called with pageId: ${pageId}`);
  
  // Get content host to search only within it
  const contentHost = document.getElementById('content-host');
  if (!contentHost) {
    console.error('[PageManager] content-host not found!');
    return;
  }
  
  // Hide all pages (only search within content-host)
  const allPages = contentHost.querySelectorAll('.setting-page');
  console.log(`[PageManager] Found ${allPages.length} pages total in content-host`);
  allPages.forEach(page => {
    page.classList.remove('active');
  });
  
  // Show target page (only search within content-host and must have .setting-page class)
  const targetPage = contentHost.querySelector(`.setting-page[data-page-id="${pageId}"]`);
  if (targetPage) {
    targetPage.classList.add('active');
    console.log(`[PageManager] Page ${pageId} shown successfully`);
    console.log(`[PageManager] Page element:`, targetPage);
    console.log(`[PageManager] Page has active class:`, targetPage.classList.contains('active'));
    
    // Force a reflow to ensure CSS is applied
    void targetPage.offsetHeight;
  } else {
    console.error(`[PageManager] Page ${pageId} not found in content-host!`);
    // List all available pages for debugging
    const availablePages = Array.from(allPages).map(p => ({
      id: p.dataset.pageId,
      hasActive: p.classList.contains('active'),
      element: p
    }));
    console.log(`[PageManager] Available pages in content-host:`, availablePages);
    
    // Try to find by partial match
    const partialMatch = Array.from(allPages).find(p => 
      p.dataset.pageId && p.dataset.pageId.includes(pageId)
    );
    if (partialMatch) {
      console.warn(`[PageManager] Found partial match: ${partialMatch.dataset.pageId}, using it instead`);
      partialMatch.classList.add('active');
    }
  }
}

export function updateSearchBarPosition(hasSubSidebar) {
  const searchBar = document.querySelector('.search-bar');
  if (searchBar) {
    searchBar.style.marginLeft = hasSubSidebar ? '0' : 'auto';
  }
}


/**
 * Input Template Loader
 * Load và render template HTML
 */

export function loadTemplate(config) {
  const { containerId, placeholder, showToolbar, showActions, showFooter, showAttachments, toolbar, actions, footer } = config;
  
  // Container ID đã được set ở element cha, không cần set lại ở đây
  let html = `<div class="input-module-container">`;
  
  // Toolbar
  if (showToolbar) {
    html += _renderToolbar(containerId, toolbar);
  }
  
  // Input wrapper
  html += `<div class="input-wrapper" id="${containerId}-inputWrapper">`;
  
  // File input (hidden)
  // For PDF Chat, accept PDF files; for Main Chat, accept all files; for others with attachments, accept images
  if (showAttachments || config.type === 'pdfChat') {
    let accept = 'image/*';
    if (config.type === 'pdfChat') {
      accept = 'application/pdf';
    } else if (config.type === 'chat') {
      accept = '*/*'; // Accept all file types for Main Chat
    }
    const multiple = config.type === 'pdfChat' ? '' : 'multiple';
    html += `<input type="file" id="${containerId}-fileInput" accept="${accept}" ${multiple} class="file-input d-none">`;
  }
  
  // Actions left (Think, Deep Research) - nằm trước textarea
  if (showActions) {
    const leftActions = actions.filter(a => a === 'think' || a === 'deepResearch');
    if (leftActions.length > 0) {
      html += `<div class="input-actions-left">`;
      leftActions.forEach(actionId => {
        html += _renderActionButton(containerId, actionId, false);
      });
      html += `</div>`;
    }
  }
  
  // Textarea
  html += `<div class="input-text-area">`;
  html += `<textarea class="chat-input" id="${containerId}-chatInput" placeholder="${placeholder || ''}" rows="1"></textarea>`;
  html += `</div>`;
  
  // Actions right (Mic, Send) - đã chuyển xuống footer, không còn ở đây
  // Nếu còn actions khác (think, deepResearch), giữ lại
  if (showActions) {
    const rightActions = actions.filter(a => a === 'mic' || a === 'send');
    // Không render mic và send ở đây nữa, đã chuyển xuống footer
    const otherActions = actions.filter(a => a !== 'mic' && a !== 'send');
    if (otherActions.length > 0) {
      html += `<div class="input-actions-right">`;
      otherActions.forEach(actionId => {
        html += _renderActionButton(containerId, actionId, true);
      });
      html += `</div>`;
    }
  }
  
  html += `</div>`; // End input-wrapper
  
  // Footer
  if (showFooter) {
    html += _renderFooter(containerId, footer);
  }
  
  // Attachments
  if (showAttachments) {
    html += `<div class="input-attachments" id="${containerId}-attachments"></div>`;
  }
  
  html += `</div>`; // End input-container
  
  return html;
}

function _renderToolbar(containerId, toolbarButtons) {
  if (!toolbarButtons || toolbarButtons.length === 0) return '';
  
  let html = `<div class="input-toolbar" id="${containerId}-toolbar">`;
  html += `<div class="toolbar-left">`;
  
  // Model selector (luôn có nếu có toolbar)
  html += `<div class="model-selector" id="${containerId}-modelSelector">`;
  html += `<svg class="lightning-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">`;
  html += `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`;
  html += `</svg>`;
  html += `<span class="model-name" id="${containerId}-modelName">...</span>`;
  html += `<svg class="dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">`;
  html += `<polyline points="6 9 12 15 18 9"/>`;
  html += `</svg>`;
  html += `</div>`;
  
  // Toolbar buttons (loại trừ history và newChat - chúng sẽ render ở toolbar-right)
  html += `<div class="toolbar-action-buttons">`;
  toolbarButtons.forEach(btnId => {
    if (btnId === 'model') return; // Đã render ở trên
    if (btnId === 'history' || btnId === 'newChat') return; // Render ở toolbar-right thay vì ở đây
    
    const btnConfig = _getToolbarButtonConfig(btnId);
    if (!btnConfig) return;
    
    html += `<button class="toolbar-action-btn" id="${containerId}-${btnConfig.id}" data-tooltip="${btnConfig.tooltip}">`;
    if (btnConfig.icon) {
      html += `<img src="${btnConfig.icon}" alt="${btnConfig.label}" class="icon">`;
    } else {
      html += _getInlineSVG(btnId);
    }
    html += `</button>`;
  });
  html += `</div>`;
  html += `</div>`; // End toolbar-left
  
  html += `<div class="toolbar-right">`;
  // Render history và newChat ở đây (chỉ render 1 lần)
  ['history', 'newChat'].forEach(btnId => {
    if (!toolbarButtons.includes(btnId)) return;
    
    const btnConfig = _getToolbarButtonConfig(btnId);
    if (!btnConfig) return;
    
    html += `<button class="toolbar-action-btn" id="${containerId}-${btnConfig.id}" data-tooltip="${btnConfig.tooltip}">`;
    if (btnConfig.icon) {
      html += `<img src="${btnConfig.icon}" alt="${btnConfig.label}" class="icon">`;
    } else {
      html += _getInlineSVG(btnId);
    }
    html += `</button>`;
  });
  html += `</div>`;
  html += `</div>`; // End input-toolbar
  
  return html;
}

function _renderActions(containerId, actionButtons) {
  if (!actionButtons || actionButtons.length === 0) return '';
  
  let html = `<div class="input-module-actions-area" id="${containerId}-actions">`;
  html += `<div class="input-actions-left">`;
  
  // Think và Deep Research buttons
  if (actionButtons.includes('think')) {
    html += _renderActionButton(containerId, 'think');
  }
  if (actionButtons.includes('deepResearch')) {
    html += _renderActionButton(containerId, 'deepResearch');
  }
  
  html += `</div>`;
  html += `<div class="input-actions-right">`;
  
  // Mic và Send buttons
  if (actionButtons.includes('mic')) {
    html += _renderActionButton(containerId, 'mic', true);
  }
  if (actionButtons.includes('send')) {
    html += _renderActionButton(containerId, 'send', true);
  }
  
  html += `</div>`;
  html += `</div>`;
  
  return html;
}

function _renderActionButton(containerId, actionId, isRight = false) {
  const btnConfig = _getActionButtonConfig(actionId);
  if (!btnConfig) return '';
  
  const btnClass = isRight ? (actionId === 'mic' ? 'mic-btn' : 'send-btn') : 'input-action-btn';
  
  let html = `<button class="${btnClass}" id="${containerId}-${btnConfig.id}" data-tooltip="${btnConfig.tooltip}">`;
  
  if (actionId === 'mic') {
    // Mic button có SVG inline
    html += `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">`;
    html += `<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>`;
    html += `<path d="M19 10v2a7 7 0 0 1-14 0v-2"/>`;
    html += `<line x1="12" y1="19" x2="12" y2="23"/>`;
    html += `<line x1="8" y1="23" x2="16" y2="23"/>`;
    html += `</svg>`;
  } else if (btnConfig.icon) {
    html += `<img src="${btnConfig.icon}" alt="${btnConfig.label}" class="icon">`;
  }
  
  if (!isRight && btnConfig.label) {
    html += `<span>${btnConfig.label}</span>`;
  }
  
  html += `</button>`;
  
  return html;
}

function _renderFooter(containerId, footerItems) {
  if (!footerItems || footerItems.length === 0) return '';
  
  let html = `<div class="input-footer" id="${containerId}-footer">`;
  html += `<div class="footer-left">`; // Wrapper cho các items bên trái (token, gift, upgrade, icons)
  
  // Phân loại items: left items và right items (mic, send)
  const leftItems = footerItems.filter(item => item !== 'mic' && item !== 'send');
  const rightItems = footerItems.filter(item => item === 'mic' || item === 'send');
  
  leftItems.forEach(item => {
    switch (item) {
      case 'token':
        html += `<div class="footer-token-display" id="${containerId}-tokenDisplay">`;
        html += `<img src="../../icons/svg/icon/Essentional, UI/Bolt Circle.svg" alt="Token" class="token-icon">`;
        html += `<span class="token-value">0</span>`;
        html += `</div>`;
        break;
      case 'gift':
        html += `<div class="footer-gift-display" id="${containerId}-giftDisplay">`;
        html += `<span class="gift-label">Gift:</span>`;
        html += `<span class="gift-value">0</span>`;
        html += `</div>`;
        break;
      case 'upgrade':
        html += `<div class="footer-upgrade-display" id="${containerId}-upgradeDisplay">`;
        html += `<span class="upgrade-text">Nâng cấp giảm giá 40%</span>`;
        html += `<svg class="rocket-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">`;
        html += `<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>`;
        html += `<path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>`;
        html += `<path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>`;
        html += `<path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>`;
        html += `</svg>`;
        html += `</div>`;
        break;
      case 'heart':
        html += `<button class="footer-icon-btn" id="${containerId}-heartBtn">`;
        html += `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">`;
        html += `<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>`;
        html += `</svg>`;
        html += `</button>`;
        break;
      case 'help':
        html += `<button class="footer-icon-btn" id="${containerId}-helpBtn">`;
        html += `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">`;
        html += `<circle cx="12" cy="12" r="10"/>`;
        html += `<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>`;
        html += `<line x1="12" y1="17" x2="12.01" y2="17"/>`;
        html += `</svg>`;
        html += `</button>`;
        break;
      case 'messages':
        html += `<button class="footer-icon-btn" id="${containerId}-messagesBtn">`;
        html += `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">`;
        html += `<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>`;
        html += `<polyline points="22,6 12,13 2,6"/>`;
        html += `</svg>`;
        html += `</button>`;
        break;
    }
  });
  
  html += `</div>`; // End footer-left
  
  // Footer right: MIC và SEND buttons
  if (rightItems.length > 0) {
    html += `<div class="footer-right">`;
    rightItems.forEach(actionId => {
      html += _renderActionButton(containerId, actionId, true);
    });
    html += `</div>`;
  }
  
  html += `</div>`; // End input-footer
  
  return html;
}

function _getToolbarButtonConfig(btnId) {
  // Import config
  const configs = {
    model: { id: 'modelSelector', label: 'Model', tooltip: 'tooltips.panel.modelSelector' },
    crop: { id: 'cropImageBtn', icon: '../../icons/svg/icon/Design, Tools/Crop.svg', label: 'Crop', tooltip: 'tooltips.panel.cropImageBtn' },
    attach: { id: 'attachBtn', icon: '../../icons/svg/icon/Messages, Conversation/Paperclip.svg', label: 'Attach', tooltip: 'tooltips.panel.attachBtn' },
    book: { id: 'bookBtn', icon: '../../icons/svg/icon/Essentional, UI/Book.svg', label: 'Knowledge Base', tooltip: 'tooltips.panel.bookBtn' },
    settings: { id: 'settingsBtn', icon: '../../icons/svg/icon/Settings/Settings.svg', label: 'Settings', tooltip: 'tooltips.panel.settingsBtn' },
    history: { id: 'historyBtn', icon: '../../icons/svg/icon/Time/History.svg', label: 'History', tooltip: 'tooltips.panel.historyBtn' },
    newChat: { id: 'newChatBtn', icon: '../../icons/svg/icon/Messages, Conversation/Pen New Square.svg', label: 'New Chat', tooltip: 'tooltips.panel.newChatBtn' },
    regenerate: { id: 'regenerateBtn', label: 'Regenerate', tooltip: 'tooltips.panel.regenerateBtn' }
  };
  return configs[btnId];
}

function _getActionButtonConfig(actionId) {
  const configs = {
    think: { id: 'thinkBtn', icon: '../../icons/svg/icon/Messages, Conversation/Chat Round Dots.svg', label: 'Suy nghĩ', tooltip: 'tooltips.panel.thinkBtn' },
    deepResearch: { id: 'deepResearchBtn', icon: '../../icons/svg/icon/Search/Magnifer Zoom In.svg', label: 'Deep Research', tooltip: 'tooltips.panel.deepResearchBtn' },
    mic: { id: 'micBtn', label: 'Microphone', tooltip: 'tooltips.panel.micBtn' },
    send: { id: 'sendBtn', icon: '../../icons/svg/icon/Arrows Action/Send Square.svg', label: 'Gửi', tooltip: 'tooltips.panel.sendBtn' }
  };
  return configs[actionId];
}

function _getInlineSVG(btnId) {
  // SVG inline cho các buttons không có icon file
  const svgs = {
    regenerate: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">` +
      `<path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>` +
      `</svg>`
  };
  return svgs[btnId] || '';
}


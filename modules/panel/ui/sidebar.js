// sidebar.js
// Sidebar UI management

const SIDEBAR_MODE_BUTTONS = {
  chat: 'chatBtn',
  gmail: 'gmailBtn',
  translate: 'translateBtn',
  pdfChat: 'pdfChatBtn'
};

export function setActiveSidebarButton(buttonId) {
  document.querySelectorAll('.sidebar-item .menu-icon').forEach(btn => btn.classList.remove('active'));
  if (!buttonId) return;
  const targetBtn = document.getElementById(buttonId);
  if (targetBtn) {
    targetBtn.classList.add('active');
  }
}

export function updateSidebarActiveState(mode) {
  const buttonId = SIDEBAR_MODE_BUTTONS[mode] || SIDEBAR_MODE_BUTTONS.chat;
  setActiveSidebarButton(buttonId);
}

export { SIDEBAR_MODE_BUTTONS };


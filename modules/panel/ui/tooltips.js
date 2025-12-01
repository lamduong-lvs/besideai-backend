// tooltips.js
// Tooltip management

export function removeBrowserTooltips() {
  const buttonsWithTooltips = document.querySelectorAll(`
    .toolbar-action-btn[data-i18n-title],
    .mic-btn[data-i18n-title],
    .send-btn[data-i18n-title],
    .menu-icon[data-i18n-title],
    .settings-btn[data-i18n-title],
    .header-btn[data-i18n-title],
    .user-btn[data-i18n-title]
  `);
  const attachTooltipHandlers = (btn) => {
    if (!btn || btn._smartTooltipBound) return;
    const OFFSET = 8;
    const onEnter = () => {
      btn.classList.remove('tooltip-top', 'tooltip-bottom', 'tooltip-left');
      const rect = btn.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
      const estimatedTooltipHeight = 32;
      const textLen = (btn.dataset.tooltipText || '').length;
      const estimatedTooltipWidth = Math.min(220, Math.max(100, textLen * 6));
      const spaceAbove = rect.top;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceLeft = rect.left;
      const spaceRight = viewportWidth - rect.right;
      if (spaceAbove >= estimatedTooltipHeight + OFFSET) {
        btn.classList.add('tooltip-top');
      } else if (spaceRight < 40 || spaceLeft >= estimatedTooltipWidth + OFFSET) {
        btn.classList.add('tooltip-left');
      } else {
        btn.classList.add('tooltip-bottom');
      }
    };
    const onLeave = () => {
      btn.classList.remove('tooltip-top', 'tooltip-bottom', 'tooltip-left');
    };
    btn.addEventListener('mouseenter', onEnter);
    btn.addEventListener('mouseleave', onLeave);
    btn._smartTooltipBound = true;
  };
  buttonsWithTooltips.forEach(btn => {
    if (btn.title && !btn.dataset.tooltipText) {
      btn.dataset.tooltipText = btn.title;
    }
    btn.removeAttribute('title');
    attachTooltipHandlers(btn);
  });
  try {
    if (!window._tooltipTitleObserver) {
      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.type === 'attributes' && m.attributeName === 'title' && m.target) {
            const el = m.target;
            const isTarget = el.matches?.(`
              .toolbar-action-btn,
              .mic-btn,
              .send-btn,
              .menu-icon,
              .settings-btn,
              .header-btn,
              .user-btn
            `);
            if (isTarget && el.getAttribute('title')) {
              el.dataset.tooltipText = el.getAttribute('title');
              el.removeAttribute('title');
              attachTooltipHandlers(el);
            }
          }
        }
      });
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['title'],
        subtree: true
      });
      window._tooltipTitleObserver = observer;
    }
  } catch (e) {
    console.warn('[Panel] Tooltip title observer error:', e);
  }
}


// SlideInPanel.js
// Component tái sử dụng cho Settings và History panels

export class SlideInPanel {
  constructor(config) {
    this.id = config.id;
    this.title = config.title;
    this.wrapperClass = config.wrapperClass || config.id;
    this.overlayClass = config.overlayClass || `${config.id}-overlay`;
    this.contentClass = config.contentClass || `${config.id}-content`;
    this.headerClass = config.headerClass || `${config.id}-header`;
    this.titleClass = config.titleClass || `${config.id}-title`;
    this.closeBtnId = config.closeBtnId || `${config.id}Close`;
    this.bodyId = config.bodyId || `${config.id}Body`;
    this.onClose = config.onClose || (() => {});
    this.onOpen = config.onOpen || (() => {});
    this.panel = null;
  }

  create(Lang, customHTML = null) {
    this.panel = document.createElement('div');
    this.panel.className = this.wrapperClass;
    this.panel.id = this.id;
    
    if (customHTML) {
      // Use custom HTML if provided
      this.panel.innerHTML = customHTML;
    } else {
      // Default structure
      this.panel.innerHTML = `
        <div class="${this.overlayClass}"></div>
        <div class="${this.contentClass}">
          <div class="${this.headerClass}">
            <h2 class="${this.titleClass}">${Lang.get(this.title)}</h2>
            <button class="${this.id}-close" id="${this.closeBtnId}" aria-label="Close">
              <img src="../../icons/svg/icon/Essentional, UI/Close Circle.svg" alt="Close" class="icon">
            </button>
          </div>
          <div class="history-body" id="${this.bodyId}">
            <!-- Content will be inserted here -->
          </div>
        </div>
      `;
    }
    
    const closeBtn = this.panel.querySelector(`#${this.closeBtnId}`);
    const overlay = this.panel.querySelector(`.${this.overlayClass}`);
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }
    if (overlay) {
      overlay.addEventListener('click', () => this.close());
    }
    
    return this.panel;
  }

  open(Lang) {
    if (!this.panel) {
      this.create(Lang);
      document.body.appendChild(this.panel);
    }
    
    setTimeout(() => {
      if (this.panel) {
        this.panel.classList.add('show');
        this.onOpen();
      }
    }, 10);
  }

  close() {
    if (this.panel) {
      this.panel.classList.remove('show');
      this.onClose();
      setTimeout(() => {
        if (this.panel && this.panel.parentNode) {
          this.panel.remove();
          this.panel = null;
        }
      }, 300);
    }
  }

  getBody() {
    return this.panel ? this.panel.querySelector(`#${this.bodyId}`) : null;
  }
}


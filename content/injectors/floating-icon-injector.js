// floating-icon-injector.js
// Module quản lý Floating Icon với drag & snap functionality

export class FloatingIcon {
  constructor(sidePanel) {
    this.element = null;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.clickStartTime = 0;
    this.clickStartPos = { x: 0, y: 0 };
    this.dockedSide = 'right'; // 'left' hoặc 'right'
    this.currentY = '50%'; // Vị trí Y (mặc định giữa màn hình)
    // Lưu khoảng cách từ icon đến cạnh dưới (bottom margin)
    this.bottomMargin = null; // Khoảng cách từ bottom của icon đến bottom của viewport (px)
    this.isFixedAtTop = false; // Flag: icon có đang cố định ở cạnh trên không
    // Lưu viewport dimensions để theo dõi thay đổi
    this.prevViewportWidth = window.innerWidth;
    this.prevViewportHeight = window.innerHeight;
    this.resizeRAF = null;
    this.sidePanel = sidePanel; // Reference to SidePanel instance
    this.init();
  }
  
  async init() {
    await this.loadPosition();
    this.create();
    this.attachEvents();
    this.setupResizeListener();
  }
  
  create() {
    this.element = document.createElement('div');
    this.element.className = 'ai-floating-icon';
    this.element.innerHTML = `<div class="ai-floating-icon-inner"><img src="${chrome.runtime.getURL('icons/icon-48.png')}"></div>`;
    
    // Áp dụng vị trí đã lưu
    this.applyPosition();
    
    // Nếu icon được load với percentage và chưa có bottomMargin, 
    // tính bottomMargin sau khi element đã được render
    if (this.currentY.includes('%') && this.bottomMargin === null && !this.isFixedAtTop) {
      // Đợi element được render xong
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const rect = this.element.getBoundingClientRect();
          const iconHeight = this.element.offsetHeight;
          const viewportHeight = window.innerHeight;
          this.bottomMargin = viewportHeight - rect.top - iconHeight;
        });
      });
    }
    
    if (document.body) {
      document.body.appendChild(this.element);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        document.body.appendChild(this.element);
      });
    }
  }
  
  applyPosition() {
    if (!this.element) return;
    
    // Dính sát vào cạnh (0px gap)
    if (this.dockedSide === 'left') {
      this.element.style.left = '0';
      this.element.style.right = 'auto';
      this.element.classList.add('docked-left');
      this.element.classList.remove('docked-right');
    } else {
      this.element.style.right = '0';
      this.element.style.left = 'auto';
      this.element.classList.add('docked-right');
      this.element.classList.remove('docked-left');
    }
    
    // Áp dụng vị trí Y
    this.element.style.top = this.currentY;
    
    // Điều chỉnh transform dựa trên loại giá trị (percentage hoặc pixel)
    // Nếu là percentage (như '50%'), giữ transform translateY(-50%) từ CSS
    // Nếu là pixel, bỏ translateY nhưng vẫn cho phép scale khi hover
    if (this.currentY.includes('%')) {
      // Giữ transform mặc định từ CSS (translateY(-50%))
      this.element.classList.remove('using-pixel-position');
      this.element.style.transform = '';
    } else {
      // Khi dùng pixel, không cần translateY(-50%)
      // Sử dụng class để CSS có thể override hover effect
      this.element.classList.add('using-pixel-position');
      this.element.style.transform = 'none';
    }
  }
  
  attachEvents() {
    if (!this.element) return;
    
    this.element.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.clickStartTime = Date.now();
      this.clickStartPos = { x: e.clientX, y: e.clientY };
      
      const rect = this.element.getBoundingClientRect();
      this.dragStartX = e.clientX - rect.left;
      this.dragStartY = e.clientY - rect.top;
      
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      
      const distance = Math.hypot(
        e.clientX - this.clickStartPos.x,
        e.clientY - this.clickStartPos.y
      );
      
      // Chỉ chuyển sang floating khi di chuyển > 5px (đã rời khỏi vị trí bám sát)
      if (distance > 5) {
        this.element.classList.add('floating');
        
        // Di chuyển icon theo chuột (free positioning)
        const newX = e.clientX - this.dragStartX;
        const newY = e.clientY - this.dragStartY;
        
        this.element.style.left = `${newX}px`;
        this.element.style.right = 'auto';
        this.element.style.top = `${newY}px`;
        this.element.style.transform = 'none'; // Bỏ translateY để positioning chính xác
      }
      
      e.preventDefault();
    });
    
    document.addEventListener('mouseup', (e) => {
      if (!this.isDragging) return;
      
      this.isDragging = false;
      
      const timeDiff = Date.now() - this.clickStartTime;
      const distance = Math.hypot(
        e.clientX - this.clickStartPos.x,
        e.clientY - this.clickStartPos.y
      );
      
      // Phân biệt click và drag
      if (timeDiff < 200 && distance < 5) {
        // Click - toggle panel
        this.onClick();
      } else {
        // Drag - snap to edge và remove floating class
        this.element.classList.remove('floating');
        this.snapToEdge(e.clientX, e.clientY);
      }
    });
  }
  
  setupResizeListener() {
    // Lắng nghe window resize để theo dõi thay đổi viewport (DevTools mở/đóng)
    // Sử dụng requestAnimationFrame để cập nhật mượt mà và tức thời
    const handleResize = () => {
      // Hủy frame trước đó nếu có
      if (this.resizeRAF) {
        cancelAnimationFrame(this.resizeRAF);
      }
      
      // Dùng requestAnimationFrame để cập nhật ngay trong frame tiếp theo
      this.resizeRAF = requestAnimationFrame(() => {
        this.handleViewportResize();
        this.resizeRAF = null;
      });
    };
    
    // Lắng nghe window resize (chính xác cho viewport changes)
    window.addEventListener('resize', handleResize, { passive: true });
    
    // Sử dụng ResizeObserver để theo dõi document.documentElement (viewport)
    // Điều này giúp bắt được cả thay đổi từ DevTools
    const resizeObserver = new ResizeObserver(handleResize);
    
    if (document.documentElement) {
      resizeObserver.observe(document.documentElement);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        if (document.documentElement) {
          resizeObserver.observe(document.documentElement);
        }
      });
    }
    
    // Lưu observer để có thể cleanup sau này nếu cần
    this.resizeObserver = resizeObserver;
  }
  
  handleViewportResize() {
    if (!this.element || this.isDragging) return;
    
    const currentWidth = window.innerWidth;
    const currentHeight = window.innerHeight;
    const widthDiff = currentWidth - this.prevViewportWidth;
    const heightDiff = currentHeight - this.prevViewportHeight;
    
    // Chỉ xử lý nếu có thay đổi đáng kể (> 1px để phản ứng ngay lập tức)
    if (Math.abs(widthDiff) < 1 && Math.abs(heightDiff) < 1) {
      this.prevViewportWidth = currentWidth;
      this.prevViewportHeight = currentHeight;
      return;
    }
    
    // Tắt transition để di chuyển tức thời khi resize
    this.element.classList.add('resizing');
    
    // Lấy vị trí hiện tại của icon
    const rect = this.element.getBoundingClientRect();
    const currentTop = rect.top;
    const iconHeight = this.element.offsetHeight;
    
    // Xử lý thay đổi chiều ngang (left/right edge)
    // Icon đã tự động di chuyển theo vì dùng left: 0 hoặc right: 0
    // Chỉ cần cập nhật viewport width
    if (Math.abs(widthDiff) >= 1) {
      this.prevViewportWidth = currentWidth;
    }
    
    // Xử lý thay đổi chiều dọc (top/bottom edge) - LOGIC MỚI
    if (Math.abs(heightDiff) >= 1) {
      let newTop = currentTop;
      
      // Nếu có bottomMargin được lưu (icon đang theo dõi khoảng cách với cạnh dưới)
      if (this.bottomMargin !== null) {
        // Tính vị trí mới dựa trên bottomMargin ban đầu
        newTop = currentHeight - iconHeight - this.bottomMargin;
        
        // Kiểm tra xem icon có chạm cạnh trên không
        if (newTop <= 0) {
          // Icon chạm cạnh trên → cố định lại ở top
          newTop = 0;
          this.isFixedAtTop = true;
          // GIỮ LẠI bottomMargin để có thể tính lại khi viewport height tăng
          // KHÔNG set this.bottomMargin = null
        } else {
          // Icon chưa chạm cạnh trên → tính lại vị trí dựa trên bottomMargin
          this.isFixedAtTop = false;
        }
      }
      // Nếu icon đang cố định ở cạnh trên nhưng không có bottomMargin
      // (trường hợp này xảy ra khi load từ storage với isFixedAtTop = true nhưng không có bottomMargin)
      else if (this.isFixedAtTop && currentTop <= 0) {
        newTop = 0;
      }
      // Nếu chưa có bottomMargin (lần đầu hoặc sau khi reset)
      else {
        // Tính bottomMargin từ vị trí hiện tại
        this.bottomMargin = currentHeight - currentTop - iconHeight;
        
        // Kiểm tra xem icon có chạm cạnh trên không
        if (currentTop <= 0) {
          newTop = 0;
          this.isFixedAtTop = true;
          // Vẫn giữ bottomMargin để có thể tính lại sau này
        } else {
          // Tính lại vị trí dựa trên bottomMargin mới
          newTop = currentHeight - iconHeight - this.bottomMargin;
          this.isFixedAtTop = false;
        }
      }
      
      // Đảm bảo icon luôn trong viewport (kiểm tra lại)
      const maxTop = currentHeight - iconHeight;
      newTop = Math.max(0, Math.min(newTop, maxTop));
      
      // Cập nhật vị trí Y
      this.currentY = `${newTop}px`;
      this.applyPosition();
      
      // Cập nhật viewport height
      this.prevViewportHeight = currentHeight;
    }
    
    // Bật lại transition sau khi resize xong
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.element.classList.remove('resizing');
      });
    });
  }
  
  snapToEdge(mouseX, mouseY) {
    // Xác định snap về left hay right dựa trên vị trí chuột
    const windowCenterX = window.innerWidth / 2;
    
    if (mouseX < windowCenterX) {
      this.dockedSide = 'left';
    } else {
      this.dockedSide = 'right';
    }
    
    // Lưu vị trí Y hiện tại
    const rect = this.element.getBoundingClientRect();
    const currentTop = rect.top;
    const iconHeight = this.element.offsetHeight;
    const viewportHeight = window.innerHeight;
    
    // Tính và lưu khoảng cách từ icon đến cạnh dưới (bottomMargin)
    const calculatedBottomMargin = viewportHeight - currentTop - iconHeight;
    
    // Kiểm tra xem icon có chạm cạnh trên không
    if (currentTop <= 0) {
      // Icon chạm cạnh trên → cố định lại
      this.isFixedAtTop = true;
      // GIỮ LẠI bottomMargin ban đầu (nếu có) để có thể tính lại khi viewport height tăng
      // Nếu chưa có bottomMargin, tính từ vị trí hiện tại (icon ở top = 0)
      if (this.bottomMargin === null) {
        this.bottomMargin = calculatedBottomMargin;
      }
      // Nếu đã có bottomMargin, giữ nguyên giá trị ban đầu (không cập nhật)
      this.currentY = '0px';
    } else {
      // Icon không chạm cạnh trên → cập nhật bottomMargin mới
      this.isFixedAtTop = false;
      this.bottomMargin = calculatedBottomMargin;
      this.currentY = `${currentTop}px`;
    }
    
    // Giới hạn Y trong viewport (đảm bảo an toàn)
    const maxY = viewportHeight - iconHeight;
    const y = Math.max(0, Math.min(parseFloat(this.currentY) || 0, maxY));
    this.currentY = `${y}px`;
    
    this.applyPosition();
    this.savePosition();
  }
  
  async onClick() {
    console.log('[FloatingIcon] onClick called');
    
    const shouldMove = this.dockedSide === 'left';

    // === SỬA: GỌI TOGGLE LÊN TRƯỚC ===
    // Phải gọi hàm gửi message (toggle) trước khi await bất cứ thứ gì khác
    // để giữ "user gesture".
    if (this.sidePanel) {
      try {
        await this.sidePanel.toggle(); // Await này bây giờ là hành động async đầu tiên
      } catch (error) {
        // Handle extension context invalidated error gracefully
        if (error.message && error.message.includes('Extension context invalidated')) {
          console.warn('[FloatingIcon] Extension context invalidated. Please refresh the page.');
          return;
        }
        console.error('[FloatingIcon] Error toggling side panel:', error);
        return;
      }
    } else {
      console.error('[FloatingIcon] sidePanel is null!');
      return; // Thoát nếu không có panel
    }

    // === DI CHUYỂN ICON SAU KHI GỌI TOGGLE ===
    // Bây giờ chúng ta có thể await an toàn vì lệnh open() đã được gửi đi
    if (shouldMove) {
      this.dockedSide = 'right';
      this.applyPosition();
      try {
        await this.savePosition();
      } catch (error) {
        console.warn('[FloatingIcon] Error saving position:', error);
      }
    }
  }
  
  async savePosition() {
    await chrome.storage.local.set({
      floatingIcon: {
        dockedSide: this.dockedSide,
        currentY: this.currentY,
        bottomMargin: this.bottomMargin,
        isFixedAtTop: this.isFixedAtTop
      }
    });
  }
  
  async loadPosition() {
    try {
      const data = await chrome.storage.local.get('floatingIcon');
      if (data.floatingIcon) {
        this.dockedSide = data.floatingIcon.dockedSide || 'right';
        this.currentY = data.floatingIcon.currentY || '50%';
        this.bottomMargin = data.floatingIcon.bottomMargin !== undefined ? data.floatingIcon.bottomMargin : null;
        this.isFixedAtTop = data.floatingIcon.isFixedAtTop || false;
        
        // Nếu load từ storage và có bottomMargin, tính lại vị trí dựa trên viewport hiện tại
        if (this.bottomMargin !== null && !this.isFixedAtTop) {
          const iconHeight = 48; // Chiều cao icon
          const viewportHeight = window.innerHeight;
          const calculatedTop = viewportHeight - iconHeight - this.bottomMargin;
          
          // Chỉ cập nhật nếu tính được vị trí hợp lệ
          if (calculatedTop >= 0) {
            this.currentY = `${calculatedTop}px`;
          }
        }
      }
    } catch (error) {
      console.error('[FloatingIcon] Error loading position:', error);
    }
  }
}


// utils/theme.js

// ========================================
// THEME MANAGER
// ========================================

class ThemeManager {
  constructor() {
    // Đơn giản hóa: chỉ còn 'light' hoặc 'dark'
    this.currentTheme = 'light'; 
    this.listeners = [];
  }

  // ========================================
  // INITIALIZATION
  // ========================================

  async init() {
    try {
        // Load saved theme preference from storage
        const data = await chrome.storage.local.get('theme');
        // Chỉ chấp nhận 'light' hoặc 'dark', mặc định là 'light'
        if (data.theme === 'dark') {
          this.currentTheme = 'dark';
        } else {
          this.currentTheme = 'light';
        }
    } catch(e) {
        console.warn(Lang.get("themeErrorLoad"), e);
        this.currentTheme = 'light';
    }

    // Apply the initial theme
    this.applyTheme();

    // Listen for storage changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes.theme) {
        const newTheme = changes.theme.newValue;
        if (newTheme === 'light' || newTheme === 'dark') {
            this.currentTheme = newTheme;
            this.applyTheme();
        }
      }
    });
  }

  // ========================================
  // THEME DETECTION (ĐÃ XÓA)
  // ========================================
  // Toàn bộ hàm _detectPageTheme và getEffectiveTheme đã được loại bỏ

  // ========================================
  // THEME APPLICATION
  // ========================================

  applyTheme() {
    // Kiểm tra documentElement tồn tại trước khi thao tác
    if (document.documentElement) {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        this.updateMetaThemeColor(this.currentTheme);
    }
    this.notifyListeners(this.currentTheme);
    console.log(`Theme applied: ${this.currentTheme}`);
  }

  updateMetaThemeColor(theme) {
    if (typeof document === 'undefined') return;
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.name = 'theme-color';
      document.head.appendChild(metaThemeColor);
    }
    const colors = {
      light: '#FFFFFF',
      dark: '#1E1E1E'
    };
    metaThemeColor.content = colors[theme] || colors.light;
  }

  // ========================================
  // THEME SWITCHING
  // ========================================

  async setTheme(theme) {
    if (!['light', 'dark'].includes(theme)) {
      // Đơn giản hóa validation, không còn 'auto'
      throw new Error(Lang.get("themeErrorInvalid", { theme: theme }));
    }
    this.currentTheme = theme;
    // ✅ THÊM: try...catch để chống lỗi context invalidated
    try {
        // Kiểm tra API tồn tại trước khi gọi
        if (chrome && chrome.storage && chrome.storage.local) {
             await chrome.storage.local.set({ theme: theme });
        }
    } catch (error) {
        // Nếu lỗi là context invalidated, ghi log cảnh báo và bỏ qua.
        // Điều này ngăn ứng dụng bị crash.
        if (error.message.includes('Extension context invalidated')) {
            console.warn(Lang.get("themeErrorContextInvalidated"));
        } else {
            // Ném các lỗi khác
            throw error;
        }
    }
    this.applyTheme();
    return { theme: this.currentTheme };
  }

  async toggleTheme() {
    const next = this.currentTheme === 'light' ? 'dark' : 'light';
    await this.setTheme(next);
    return next;
  }

  // ========================================
  // CÁC PHẦN CÒN LẠI GIỮ NGUYÊN (Listeners, Colors, v.v...)
  // ========================================
  
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notifyListeners(theme) {
    this.listeners.forEach(callback => {
      try {
        callback(theme);
      } catch (error) {
        console.error(Lang.get("themeErrorListener", { error: error }));
      }
    });
  }
  
  getThemeColors(theme = null) {
    const effectiveTheme = theme || this.currentTheme;
    const colors = {
      light: {
        primary: '#f86a01',
        primaryDark: '#d45a01',
        bgPrimary: '#FFFFFF',
        bgSecondary: '#FAFAFA',
        textPrimary: '#1A1A1A',
        textSecondary: '#4A4A4A',
        border: '#E5E5E5'
      },
      dark: {
        primary: '#f86a01',
        primaryDark: '#d45a01',
        bgPrimary: '#1E1E1E',
        bgSecondary: '#2D2D2D',
        textPrimary: '#FFFFFF',
        textSecondary: '#B0B0B0',
        border: '#404040'
      }
    };
    return colors[effectiveTheme] || colors.light;
  }
  
  getCSSVariable(variableName) {
    return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  }

  setCSSVariable(variableName, value) {
    document.documentElement.style.setProperty(variableName, value);
  }
  
  exportThemeSettings() {
    return {
      theme: this.currentTheme,
      timestamp: new Date().toISOString()
    };
  }

  async importThemeSettings(settings) {
    if (settings.theme && ['light', 'dark'].includes(settings.theme)) {
      await this.setTheme(settings.theme);
    }
  }

  isDarkMode() {
    return this.currentTheme === 'dark';
  }

  isLightMode() {
    return this.currentTheme === 'light';
  }
  
  // Xóa isAutoMode()

  getThemeInfo() {
    return {
      current: this.currentTheme,
      isDark: this.isDarkMode(),
      isLight: this.isLightMode(),
      colors: this.getThemeColors()
    };
  }

  async transitionTheme(newTheme, duration = 300) {
    document.documentElement.classList.add('theme-transitioning');
    await this.setTheme(newTheme);
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning');
    }, duration);
  }
}

// ========================================
// THEME UTILITIES (Giữ nguyên)
// ========================================

class ThemeUtils {
  static hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }
  
  static rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
  }
  
  static getContrastRatio(color1, color2) {
    const lum1 = this.getLuminance(color1);
    const lum2 = this.getLuminance(color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  }

  static getLuminance(color) {
    const rgb = this.hexToRgb(color);
    if (!rgb) return 0;
    const rsRGB = rgb.r / 255;
    const gsRGB = rgb.g / 255;
    const bsRGB = rgb.b / 255;
    const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
    const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
    const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
}

// ========================================
// EXPORT
// ========================================

const themeManager = new ThemeManager();

export {
  themeManager,
  ThemeManager,
  ThemeUtils
};
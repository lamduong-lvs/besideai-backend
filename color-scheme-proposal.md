# Đề Xuất Color Scheme - #f86a01 & Trắng

## 📊 Phân Tích Màu Chủ Đạo

### Màu Chính: #f86a01
- **HEX**: `#f86a01`
- **RGB**: `rgb(248, 106, 1)`
- **HSL**: `hsl(25, 99%, 49%)`
- **Đặc điểm**: Cam rực rỡ, năng động, thu hút sự chú ý

### Màu Phụ: Trắng (#FFFFFF)
- **HEX**: `#FFFFFF`
- **RGB**: `rgb(255, 255, 255)`
- **Đặc điểm**: Sạch sẽ, tối giản, tạo contrast mạnh

---

## 🎨 Color Palette Đề Xuất

### Primary Colors (Màu Chủ Đạo)
```css
--color-primary: #f86a01;              /* Màu chính */
--color-primary-dark: #d45a01;         /* Hover, active states (darken 15%) */
--color-primary-darker: #b84a01;       /* Pressed state (darken 25%) */
--color-primary-light: #ff8a2e;        /* Light variant (lighten 10%) */
--color-primary-lighter: #ffaa5c;       /* Lighter variant (lighten 20%) */
--color-primary-alpha: rgba(248, 106, 1, 0.1);   /* Background subtle */
--color-primary-alpha-light: rgba(248, 106, 1, 0.05);  /* Very subtle */
--color-primary-alpha-medium: rgba(248, 106, 1, 0.15);  /* Medium opacity */
```

### Background Colors (Nền)
```css
--bg-primary: #FFFFFF;                 /* Nền chính - trắng */
--bg-secondary: #FAFAFA;               /* Nền phụ - trắng nhạt */
--bg-tertiary: #F5F5F5;                /* Nền bậc 3 - xám rất nhạt */
--bg-hover: #FFF5ED;                   /* Hover với tint cam nhẹ */
--bg-active: #FFE8D6;                  /* Active state với tint cam */
```

### Text Colors (Chữ)
```css
--text-primary: #1A1A1A;               /* Chữ chính - đen nhẹ */
--text-secondary: #4A4A4A;            /* Chữ phụ - xám đậm */
--text-tertiary: #808080;             /* Chữ bậc 3 - xám */
--text-on-primary: #FFFFFF;            /* Chữ trên nền cam */
--text-link: #f86a01;                  /* Link màu cam */
--text-link-hover: #d45a01;            /* Link hover */
```

### Border Colors (Viền)
```css
--border-color: #E5E5E5;               /* Viền mặc định */
--border-light: #F0F0F0;                /* Viền nhẹ */
--border-focus: #f86a01;               /* Focus border - cam */
--border-hover: #FFE8D6;               /* Hover border - cam nhạt */
```

### Status Colors (Trạng Thái)
```css
/* Giữ nguyên hoặc điều chỉnh để hài hòa với cam */
--color-success: #10B981;              /* Xanh lá - tương phản tốt */
--color-error: #EF4444;                 /* Đỏ - tương phản tốt */
--color-warning: #F59E0B;              /* Vàng cam - gần với primary */
--color-info: #3B82F6;                 /* Xanh dương - tương phản tốt */
```

### Shadow Colors (Đổ Bóng)
```css
/* Shadow với tint cam nhẹ cho depth */
--shadow-primary-sm: 0 2px 4px rgba(248, 106, 1, 0.1);
--shadow-primary-md: 0 4px 12px rgba(248, 106, 1, 0.15);
--shadow-primary-lg: 0 8px 24px rgba(248, 106, 1, 0.2);
--shadow-primary-xl: 0 16px 48px rgba(248, 106, 1, 0.25);
```

### Gradient Colors (Gradient)
```css
--gradient-primary: linear-gradient(135deg, #f86a01 0%, #d45a01 100%);
--gradient-primary-light: linear-gradient(135deg, #ff8a2e 0%, #f86a01 100%);
--gradient-primary-vertical: linear-gradient(to bottom, #f86a01 0%, #d45a01 100%);
```

---

## 🎯 Nguyên Tắc Sử Dụng Màu

### 1. **Primary Color (#f86a01) - Sử Dụng Cho:**
- ✅ Buttons chính (Primary buttons)
- ✅ Links và hyperlinks
- ✅ Icons quan trọng
- ✅ Badges và notifications
- ✅ Progress bars
- ✅ Focus states
- ✅ Active states
- ✅ Brand elements (logo, header highlights)

### 2. **White (#FFFFFF) - Sử Dụng Cho:**
- ✅ Background chính của panels
- ✅ Cards và containers
- ✅ Input fields
- ✅ Modal backgrounds
- ✅ Sidebar backgrounds (light theme)
- ✅ Text trên nền cam

### 3. **Tỷ Lệ Sử Dụng:**
- **Cam (#f86a01)**: 10-15% diện tích (accents, CTAs)
- **Trắng (#FFFFFF)**: 60-70% diện tích (backgrounds)
- **Xám nhạt (#FAFAFA, #F5F5F5)**: 15-20% diện tích (secondary backgrounds)
- **Đen/Xám đậm**: 5-10% diện tích (text)

### 4. **Contrast & Accessibility:**
- ✅ Cam trên trắng: **WCAG AA** compliant (ratio ~4.5:1)
- ✅ Trắng trên cam: **WCAG AA** compliant (ratio ~4.5:1)
- ✅ Đen trên trắng: **WCAG AAA** compliant (ratio ~21:1)
- ⚠️ Tránh: Cam trên nền vàng/nhạt (contrast thấp)

---

## 🎨 Phong Cách Thiết Kế Đề Xuất

### **Modern & Clean (Hiện Đại & Sạch Sẽ)**
1. **Minimalist Approach**: Nhiều khoảng trắng, ít màu
2. **Bold Accents**: Dùng cam cho các elements quan trọng
3. **Subtle Shadows**: Shadow nhẹ với tint cam
4. **Smooth Transitions**: Chuyển màu mượt mà

### **Visual Hierarchy:**
```
Level 1 (Highest): #f86a01 - CTAs, Primary buttons
Level 2 (High):     #d45a01 - Hover states, Secondary actions
Level 3 (Medium):  #1A1A1A - Primary text
Level 4 (Low):     #4A4A4A - Secondary text
Level 5 (Lowest):  #FFFFFF - Backgrounds
```

---

## 📍 Các Vị Trí Cần Thay Đổi Màu

### **1. Core Design System Files**
- `styles/global.css` - Primary color definitions
- `styles/variables.css` - CSS variables
- `styles/theme-light.css` - Light theme overrides
- `styles/theme-dark.css` - Dark theme overrides
- `styles/components.css` - Button, card components

### **2. Module-Specific Files**
- `modules/panel/` - Main panel UI
- `modules/input/` - Input components
- `modules/gmail/` - Gmail integration UI
- `modules/google-meet/` - Google Meet UI
- `modules/microsoft-teams/` - Teams UI
- `modules/screenshot/` - Screenshot tools
- `modules/toolbar/` - Toolbar menu

### **3. JavaScript Files với Hardcoded Colors**
- `utils/theme.js` - Theme manager
- `modules/google-meet/config/constants.js` - Meet constants
- `modules/common/styles/meet-common.css` - Meet common styles
- `background/background.js` - Badge colors

### **4. Component Files**
- `modules/auth/ui/auth-widget.js` - Auth UI
- `modules/common/ui/pip-window.css` - PiP window
- `modules/panel/css/` - Panel styles
- `content/css/content.css` - Content scripts

---

## 🎯 Chiến Lược Triển Khai

### **Phase 1: Foundation (Nền Tảng)**
1. Cập nhật CSS variables trong global.css
2. Cập nhật theme files (light/dark)
3. Test contrast và accessibility

### **Phase 2: Core Components (Thành Phần Cốt Lõi)**
1. Buttons (primary, secondary)
2. Links và navigation
3. Input fields và focus states
4. Cards và containers

### **Phase 3: Modules (Các Module)**
1. Panel UI
2. Gmail integration
3. Google Meet integration
4. Screenshot tools
5. Toolbar

### **Phase 4: Polish (Hoàn Thiện)**
1. Shadows và gradients
2. Animations và transitions
3. Icons và badges
4. Dark theme adjustments

---

## ⚠️ Lưu Ý Quan Trọng

### **1. Dark Theme**
- Màu cam vẫn giữ nguyên (#f86a01)
- Nền đen (#1E1E1E) thay vì trắng
- Text trắng thay vì đen
- Cần điều chỉnh contrast cho dark theme

### **2. Accessibility**
- Đảm bảo contrast ratio ≥ 4.5:1 cho text
- Test với screen readers
- Cung cấp alternative cho color-blind users

### **3. Consistency**
- Sử dụng CSS variables thay vì hardcoded colors
- Tạo design tokens document
- Review tất cả modules để đảm bảo consistency

### **4. Performance**
- Minimize CSS changes
- Use CSS variables để dễ maintain
- Test trên các browsers khác nhau

---

## 📐 Color Calculation Formula

### Darken (Làm Tối)
```javascript
// Darken 15% for hover
function darken(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.floor((num >> 16) * (1 - percent)));
  const g = Math.max(0, Math.floor(((num >> 8) & 0x00FF) * (1 - percent)));
  const b = Math.max(0, Math.floor((num & 0x0000FF) * (1 - percent)));
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}
```

### Lighten (Làm Sáng)
```javascript
// Lighten 10% for light variant
function lighten(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.floor((num >> 16) + (255 - (num >> 16)) * percent));
  const g = Math.min(255, Math.floor(((num >> 8) & 0x00FF) + (255 - ((num >> 8) & 0x00FF)) * percent));
  const b = Math.min(255, Math.floor((num & 0x0000FF) + (255 - (num & 0x0000FF)) * percent));
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}
```

---

## 🎨 Inspiration & References

### **Successful Orange & White Brands:**
- Amazon (orange accent)
- Fanta (vibrant orange)
- Home Depot (orange brand)
- Nickelodeon (orange brand)

### **Design Principles:**
- **Less is More**: Sử dụng cam một cách có chọn lọc
- **White Space**: Tận dụng khoảng trắng
- **Visual Hierarchy**: Cam cho emphasis
- **Consistency**: Đồng nhất trong toàn bộ extension

---

## ✅ Checklist Trước Khi Triển Khai

- [ ] Review toàn bộ color usage hiện tại
- [ ] Tính toán color variants (dark, light, alpha)
- [ ] Test contrast ratios
- [ ] Tạo color palette document
- [ ] Backup các file hiện tại
- [ ] Plan migration strategy
- [ ] Test trên light theme
- [ ] Test trên dark theme
- [ ] Test trên các browsers
- [ ] Review với team/designer


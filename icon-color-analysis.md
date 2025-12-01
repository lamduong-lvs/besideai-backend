# Phân Tích Mã Màu Icon

## Mô Tả Icon
- **Hình dạng**: Chữ "B" cách điệu, hiện đại
- **Màu chính**: Cam rực rỡ (Vibrant Orange)
- **Nền**: Đen (#000000)
- **Chi tiết**: Có mạng lưới các nút và đường kết nối bên trong chữ "B"

## Mã Màu Cam Phổ Biến

### 1. Màu Cam Rực Rỡ (Vibrant Orange) - Khả năng cao nhất
```
HEX: #FF6B35
RGB: rgb(255, 107, 53)
HSL: hsl(14, 100%, 60%)
CMYK: 0%, 58%, 79%, 0%
```

### 2. Màu Cam Material Design
```
HEX: #FF9800
RGB: rgb(255, 152, 0)
HSL: hsl(36, 100%, 50%)
CMYK: 0%, 40%, 100%, 0%
```

### 3. Màu Cam Sáng (Bright Orange)
```
HEX: #FF6600
RGB: rgb(255, 102, 0)
HSL: hsl(24, 100%, 50%)
CMYK: 0%, 60%, 100%, 0%
```

### 4. Màu Cam Đậm (Deep Orange)
```
HEX: #FF5722
RGB: rgb(255, 87, 34)
HSL: hsl(13, 100%, 57%)
CMYK: 0%, 66%, 87%, 0%
```

### 5. Màu Cam Tối (Dark Orange)
```
HEX: #FF8C00
RGB: rgb(255, 140, 0)
HSL: hsl(33, 100%, 50%)
CMYK: 0%, 45%, 100%, 0%
```

## Màu Nền
```
HEX: #000000
RGB: rgb(0, 0, 0)
HSL: hsl(0, 0%, 0%)
CMYK: 0%, 0%, 0%, 100%
```

## Mã Màu Trong Codebase Hiện Tại

Từ codebase, tôi tìm thấy các màu orange được sử dụng:

1. **Warning Color**: `#FF9800` (Material Design Orange)
   - Được định nghĩa trong `styles/global.css`
   - RGB: rgb(255, 152, 0)

2. **Gradient Warning**: `#ff6b6b` và `#ee5a6f`
   - Được sử dụng trong gradient warning

## Khuyến Nghị

Dựa trên mô tả "vibrant orange", mã màu có khả năng cao nhất là:
- **#FF6B35** - Cam rực rỡ, tươi sáng
- **#FF6600** - Cam sáng, nổi bật

Để xác định chính xác, bạn có thể:
1. Sử dụng công cụ color picker trên hình ảnh icon
2. Mở file icon trong Photoshop/GIMP và sử dụng eyedropper tool
3. Sử dụng online color picker như: https://imagecolorpicker.com/

## Công Thức Chuyển Đổi

### HEX → RGB
```javascript
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}
```

### RGB → HEX
```javascript
function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
```


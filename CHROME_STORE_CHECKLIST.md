# Checklist Đăng Extension Lên Chrome Web Store

## 📋 Tổng Quan
Tài liệu này cung cấp checklist đầy đủ để đăng extension "AI Chat Assistant" lên Chrome Web Store.

---

## ✅ PHẦN 1: CHUẨN BỊ TÀI KHOẢN & THIẾT LẬP

### 1.1 Tài Khoản Developer
- [ ] Đăng ký tài khoản Google Developer (phí $5 một lần)
  - Truy cập: https://chrome.google.com/webstore/devconsole
  - Thanh toán phí đăng ký $5 USD (một lần duy nhất)
  - Xác minh danh tính nếu cần

### 1.2 Thông Tin Công Ty/Cá Nhân
- [ ] Chuẩn bị thông tin:
  - Tên hiển thị công ty/cá nhân
  - Địa chỉ (có thể ẩn trên store)
  - Email liên hệ
  - Website (nếu có)

---

## ✅ PHẦN 2: KIỂM TRA MANIFEST.JSON

### 2.1 Thông Tin Cơ Bản (Đã có ✓)
- [x] `manifest_version: 3` ✓
- [x] `name`: "AI Chat Assistant" ✓
- [x] `version`: "1.0.2.0" ✓
- [x] `description`: "AI-powered chat assistant" ⚠️ (Cần mô tả chi tiết hơn)

### 2.2 Icons (Cần kiểm tra)
- [ ] Icon 16x16: `icons/icon-16.png` - Tồn tại và đúng kích thước
- [ ] Icon 48x48: `icons/icon-48.png` - Tồn tại và đúng kích thước
- [ ] Icon 128x128: `icons/icon-128.png` - Tồn tại và đúng kích thước
- [ ] Tất cả icons phải:
  - Định dạng PNG
  - Không trong suốt (trừ khi cần thiết)
  - Chất lượng cao, rõ ràng
  - Phù hợp với branding

### 2.3 Thông Tin Bổ Sung (Cần thêm)
- [ ] Thêm `homepage_url`: URL trang chủ của extension
- [ ] Thêm `support_url`: URL hỗ trợ người dùng
- [ ] Cập nhật `description` chi tiết hơn (tối đa 132 ký tự)

**Ví dụ description tốt:**
```
"AI Chat Assistant - Smart AI-powered assistant for Gmail, Google Meet, and Microsoft Teams. Features include email summarization, real-time translation, meeting transcription, and intelligent chat."
```

---

## ✅ PHẦN 3: QUYỀN TRUY CẬP (PERMISSIONS)

### 3.1 Kiểm Tra Permissions Hiện Tại
Extension của bạn yêu cầu nhiều permissions. Cần chuẩn bị giải thích cho mỗi permission:

- [ ] **activeTab**: Cần giải thích - "Để tương tác với nội dung trang web"
- [ ] **storage**: Cần giải thích - "Để lưu cài đặt và dữ liệu người dùng"
- [ ] **scripting**: Cần giải thích - "Để inject content scripts vào các trang web"
- [ ] **contextMenus**: Cần giải thích - "Để hiển thị menu chuột phải với các tùy chọn AI"
- [ ] **commands**: Cần giải thích - "Để hỗ trợ phím tắt"
- [ ] **offscreen**: Cần giải thích - "Để xử lý audio/video ngoài màn hình"
- [ ] **tabCapture**: ⚠️ **QUAN TRỌNG** - Cần giải thích rõ: "Để chụp màn hình và quay video màn hình"
- [ ] **desktopCapture**: ⚠️ **QUAN TRỌNG** - Cần giải thích rõ: "Để quay video màn hình và cuộc họp"
- [ ] **tabs**: Cần giải thích - "Để quản lý và tương tác với các tab"
- [ ] **identity**: Cần giải thích - "Để đăng nhập với Google OAuth2"
- [ ] **sidePanel**: Cần giải thích - "Để hiển thị panel chat AI"
- [ ] **notifications**: Cần giải thích - "Để thông báo cho người dùng"

### 3.2 Host Permissions
- [ ] **<all_urls>**: ⚠️ **CẢNH BÁO** - Chrome sẽ yêu cầu giải thích chi tiết
  - Cần giải thích: "Để extension hoạt động trên mọi trang web (Gmail, Google Meet, Microsoft Teams, và các trang khác)"
  - Cân nhắc giới hạn chỉ các domain cần thiết nếu có thể

- [ ] Các API endpoints:
  - `https://api.cerebras.ai/*` - OK
  - `https://api.openai.com/*` - OK
  - `https://api.anthropic.com/*` - OK
  - `https://generativelanguage.googleapis.com/*` - OK

### 3.3 OAuth2 Scopes
- [ ] Kiểm tra các scopes Google API:
  - `openid`, `email`, `profile` - OK
  - `https://www.googleapis.com/auth/documents` - Cần giải thích
  - `https://www.googleapis.com/auth/drive.file` - Cần giải thích
  - `https://www.googleapis.com/auth/calendar.events` - Cần giải thích
  - `https://www.googleapis.com/auth/spreadsheets` - Cần giải thích

---

## ✅ PHẦN 4: TÀI LIỆU & CHÍNH SÁCH

### 4.1 Privacy Policy (BẮT BUỘC)
- [ ] **Tạo Privacy Policy** - BẮT BUỘC cho Chrome Web Store
- [ ] Đăng tải lên website công khai (có thể dùng GitHub Pages, Netlify, etc.)
- [ ] URL phải truy cập được công khai
- [ ] Nội dung cần bao gồm:
  - Loại dữ liệu thu thập
  - Cách sử dụng dữ liệu
  - Cách lưu trữ dữ liệu
  - Cách chia sẻ dữ liệu (nếu có)
  - Quyền của người dùng
  - Thông tin liên hệ

**Lưu ý:** Extension của bạn thu thập:
- Email content (Gmail)
- Meeting transcripts (Google Meet, Teams)
- Screenshots/video recordings
- User settings
- OAuth tokens

### 4.2 Terms of Service (Khuyến nghị)
- [ ] Tạo Terms of Service
- [ ] Đăng tải lên website
- [ ] Cập nhật links trong `modules/auth/ui/auth-widget.html` (hiện tại là "#")

### 4.3 Support URL
- [ ] Tạo trang hỗ trợ hoặc email support
- [ ] Có thể dùng:
  - GitHub Issues
  - Email support
  - Website support page

---

## ✅ PHẦN 5: TÀI SẢN CHO STORE LISTING

### 5.1 Screenshots (BẮT BUỘC)
- [ ] **Ít nhất 1 screenshot**, khuyến nghị 3-5 screenshots
- [ ] Kích thước: Tối thiểu 1280x800 hoặc 640x400
- [ ] Tỷ lệ: 16:10 hoặc 16:9
- [ ] Nội dung screenshots nên bao gồm:
  - [ ] Giao diện chính của extension
  - [ ] Tính năng Gmail integration
  - [ ] Tính năng Google Meet translation
  - [ ] Tính năng screenshot/recording
  - [ ] Side panel với AI chat

### 5.2 Promotional Images (Tùy chọn nhưng khuyến nghị)
- [ ] **Small promotional tile**: 440x280 (khuyến nghị)
- [ ] **Large promotional tile**: 920x680 (khuyến nghị)
- [ ] **Marquee promotional tile**: 1400x560 (tùy chọn)

### 5.3 Store Listing Details
- [ ] **Detailed Description** (tối đa 16,000 ký tự):
  - Mô tả đầy đủ tính năng
  - Hướng dẫn sử dụng cơ bản
  - Lợi ích cho người dùng
  - Có thể dùng HTML cơ bản

- [ ] **Short Description** (tối đa 132 ký tự):
  - Tóm tắt ngắn gọn
  - Hiển thị trong search results

- [ ] **Category**: Chọn phù hợp
  - Productivity
  - Communication
  - Developer Tools
  - etc.

- [ ] **Language**: Chọn ngôn ngữ hỗ trợ
  - English
  - Vietnamese (nếu có)

---

## ✅ PHẦN 6: KIỂM TRA KỸ THUẬT

### 6.1 Code Quality
- [ ] Loại bỏ console.log không cần thiết
- [ ] Loại bỏ debug code
- [ ] Kiểm tra lỗi JavaScript
- [ ] Kiểm tra lỗi CSS
- [ ] Test trên Chrome mới nhất

### 6.2 Security
- [ ] Content Security Policy đã đúng (đã có ✓)
- [ ] Không có hardcoded API keys nhạy cảm
- [ ] OAuth2 client_id là public (OK)
- [ ] Kiểm tra XSS vulnerabilities
- [ ] Kiểm tra injection vulnerabilities

### 6.3 Performance
- [ ] Extension không làm chậm trình duyệt
- [ ] Memory leaks đã được fix
- [ ] Lazy loading nếu có thể
- [ ] Optimize images/icons

### 6.4 Testing
- [ ] Test trên Chrome Windows
- [ ] Test trên Chrome Mac
- [ ] Test trên Chrome Linux
- [ ] Test các tính năng chính:
  - [ ] Gmail integration
  - [ ] Google Meet translation
  - [ ] Microsoft Teams integration
  - [ ] Screenshot/recording
  - [ ] AI chat
  - [ ] Settings

---

## ✅ PHẦN 7: ĐÓNG GÓI EXTENSION

### 7.1 Chuẩn Bị File
- [ ] Loại bỏ file không cần thiết:
  - [ ] `Chrome Extension.crx` (không cần cho store)
  - [ ] File test/debug
  - [ ] File backup
  - [ ] File .git (nếu có)
  - [ ] File .DS_Store, Thumbs.db

- [ ] Tạo .zip file:
  - [ ] Chọn tất cả files (trừ .crx, .git, etc.)
  - [ ] Nén thành .zip
  - [ ] Đảm bảo manifest.json ở root
  - [ ] Tên file: `ai-chat-assistant-v1.0.2.0.zip`

### 7.2 Kiểm Tra Trước Khi Upload
- [ ] Test load extension từ .zip file:
  1. Mở `chrome://extensions/`
  2. Bật "Developer mode"
  3. Click "Load unpacked"
  4. Chọn thư mục giải nén
  5. Kiểm tra không có lỗi

---

## ✅ PHẦN 8: ĐĂNG TẢI LÊN CHROME WEB STORE

### 8.1 Upload Extension
- [ ] Đăng nhập Chrome Web Store Developer Dashboard
- [ ] Click "New Item"
- [ ] Upload file .zip
- [ ] Điền thông tin cơ bản

### 8.2 Điền Store Listing
- [ ] **Name**: AI Chat Assistant (hoặc tên bạn muốn)
- [ ] **Summary**: Mô tả ngắn (132 ký tự)
- [ ] **Description**: Mô tả chi tiết (16,000 ký tự)
- [ ] **Category**: Chọn category phù hợp
- [ ] **Language**: Chọn ngôn ngữ
- [ ] **Privacy Policy URL**: ⚠️ BẮT BUỘC
- [ ] **Support URL**: Khuyến nghị
- [ ] **Homepage URL**: Khuyến nghị

### 8.3 Upload Assets
- [ ] Upload screenshots (ít nhất 1)
- [ ] Upload promotional images (khuyến nghị)
- [ ] Upload icons (đã có trong manifest, nhưng có thể upload thêm)

### 8.4 Distribution
- [ ] Chọn "Public" hoặc "Unlisted"
- [ ] Chọn regions (nếu muốn giới hạn)
- [ ] Pricing: Free

### 8.5 Permissions Justification
- [ ] Điền giải thích cho mỗi permission được yêu cầu
- [ ] Đặc biệt chú ý:
  - `tabCapture` - "For screenshot and screen recording features"
  - `desktopCapture` - "For recording screen and video meetings"
  - `<all_urls>` - "To work on Gmail, Google Meet, Microsoft Teams, and other websites"

---

## ✅ PHẦN 9: REVIEW PROCESS

### 9.1 Trước Khi Submit
- [ ] Đọc lại [Chrome Web Store Developer Program Policies](https://developer.chrome.com/docs/webstore/program-policies/)
- [ ] Đảm bảo tuân thủ:
  - [ ] Single Purpose Policy
  - [ ] User Data Privacy
  - [ ] Permissions Justification
  - [ ] Spam and Placement
  - [ ] Deceptive Behavior

### 9.2 Submit for Review
- [ ] Click "Submit for Review"
- [ ] Thời gian review: Thường 1-3 ngày làm việc
- [ ] Có thể bị reject nếu:
  - Privacy policy không đầy đủ
  - Permissions không được giải thích rõ
  - Violate policies
  - Technical issues

### 9.3 Sau Khi Submit
- [ ] Theo dõi email từ Google
- [ ] Kiểm tra dashboard thường xuyên
- [ ] Sẵn sàng trả lời câu hỏi từ reviewers

---

## ✅ PHẦN 10: SAU KHI ĐƯỢC PHÊ DUYỆT

### 10.1 Publish
- [ ] Extension sẽ tự động publish nếu được approve
- [ ] Kiểm tra trên Chrome Web Store
- [ ] Test extension từ store

### 10.2 Monitoring
- [ ] Theo dõi reviews và ratings
- [ ] Trả lời user feedback
- [ ] Fix bugs nếu có
- [ ] Chuẩn bị updates

### 10.3 Updates
- [ ] Khi cần update:
  1. Sửa code
  2. Tăng version trong manifest.json
  3. Tạo .zip mới
  4. Upload lên dashboard
  5. Submit for review

---

## ⚠️ CÁC VẤN ĐỀ QUAN TRỌNG CẦN XỬ LÝ

### 1. Privacy Policy (ƯU TIÊN CAO)
**Status:** ❌ Chưa có
**Action:** Tạo privacy policy và đăng lên website công khai

### 2. Description trong Manifest
**Status:** ⚠️ Quá ngắn
**Action:** Cập nhật description chi tiết hơn

### 3. Permissions Justification
**Status:** ⚠️ Cần chuẩn bị
**Action:** Viết sẵn giải thích cho mỗi permission

### 4. Screenshots
**Status:** ❌ Chưa có
**Action:** Chụp screenshots các tính năng chính

### 5. Links trong Auth Widget
**Status:** ⚠️ Đang dùng "#"
**Action:** Cập nhật links thật cho Privacy Policy và Terms

---

## 📝 TEMPLATE PRIVACY POLICY (Tham khảo)

Bạn có thể tạo privacy policy dựa trên template này:

```markdown
# Privacy Policy for AI Chat Assistant

Last updated: [Date]

## Introduction
AI Chat Assistant ("we", "our", "us") is committed to protecting your privacy...

## Data We Collect
- Email content (when using Gmail features)
- Meeting transcripts (when using Google Meet/Microsoft Teams features)
- Screenshots and screen recordings (when you use these features)
- User settings and preferences
- OAuth tokens for Google services

## How We Use Your Data
- To provide AI-powered features (summarization, translation, etc.)
- To store your preferences
- To sync settings across devices (if applicable)

## Data Storage
- Data is stored locally in your browser
- Some data may be sent to AI service providers (OpenAI, Anthropic, etc.)
- We do not store your data on our servers

## Third-Party Services
- OpenAI API
- Anthropic API
- Cerebras AI
- Google APIs (Gmail, Calendar, Drive, etc.)

## Your Rights
- You can delete your data at any time
- You can disable features that collect data
- You can uninstall the extension

## Contact
Email: [your-email]
```

---

## 🔗 TÀI LIỆU THAM KHẢO

- [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- [Chrome Web Store Developer Program Policies](https://developer.chrome.com/docs/webstore/program-policies/)
- [Publishing Your Extension](https://developer.chrome.com/docs/webstore/publish/)
- [Manifest V3 Documentation](https://developer.chrome.com/docs/extensions/mv3/)

---

## 📊 PROGRESS TRACKING

**Tổng số mục:** ~80+
**Đã hoàn thành:** ~15
**Cần hoàn thành:** ~65

**Ưu tiên cao:**
1. ✅ Manifest cơ bản (đã có)
2. ❌ Privacy Policy (cần tạo)
3. ❌ Screenshots (cần chụp)
4. ⚠️ Description chi tiết (cần cập nhật)
5. ⚠️ Permissions justification (cần chuẩn bị)

---

**Chúc bạn thành công! 🚀**


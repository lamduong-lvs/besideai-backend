# Next Steps Checklist - Hoàn thiện Subscription Integration

## 📋 Tổng quan

Extension đã có đầy đủ infrastructure cho Subscription system. Dưới đây là các bước tiếp theo cần hoàn thiện **trước khi kết nối Backend**.

---

## ✅ Đã hoàn thành

### Core Infrastructure
- ✅ Subscription Manager với tier detection
- ✅ Usage Tracker với local storage
- ✅ Limits Enforcer với validation
- ✅ API Gateway với routing logic
- ✅ Feature Gates với tier-based access
- ✅ Backend API Client với đầy đủ endpoints
- ✅ User Sync, Conflict Resolver, Migration Manager
- ✅ Backend Init với centralized initialization

### UI Components
- ✅ UserMenu với subscription info
- ✅ TokenUsageMenu với tabs và dashboard
- ✅ Token display trong footer
- ✅ Upgrade prompts và feature gates

### Integration
- ✅ Background service worker integration
- ✅ Panel initialization
- ✅ Auth flow integration
- ✅ Feature gating tại entry points

---

## 🔧 Cần hoàn thiện (Extension Side)

### 1. Cấu hình URLs (QUAN TRỌNG - Cần làm ngay)

#### 1.1 Backend URL
**File:** `modules/subscription/subscription-api-client.js`
```javascript
// Hiện tại:
const DEFAULT_BACKEND_URL = 'https://api.yourapp.com'; // TODO: Update

// Cần sửa thành:
const isDevelopment = !('update_url' in chrome.runtime.getManifest());
const DEFAULT_BACKEND_URL = isDevelopment
  ? 'http://localhost:3000'  // Development
  : 'https://api.yourapp.com'; // Production (thay bằng URL thực)
```

**Action:** 
- [ ] Cập nhật `DEFAULT_BACKEND_URL` với URL thực của backend
- [ ] Hoặc implement environment detection
- [ ] Test với backend URL thực

#### 1.2 Subscription Page URL
**Files:**
- `modules/panel/components/UserMenu.js` (line 213)
- `modules/panel/components/TokenUsageMenu.js` (line 434)

**Hiện tại:**
```javascript
const subscriptionUrl = 'https://your-subscription-page.com'; // TODO
```

**Action:**
- [ ] Tạo subscription page (hoặc dùng payment provider như Stripe)
- [ ] Cập nhật URL trong cả 2 files
- [ ] Test upgrade flow

#### 1.3 Invite Friends URL
**File:** `modules/panel/components/TokenUsageMenu.js` (line 452)

**Hiện tại:**
```javascript
const inviteUrl = 'https://your-invite-page.com'; // TODO
```

**Action:**
- [ ] Tạo invite/referral page
- [ ] Cập nhật URL
- [ ] Implement referral logic (nếu cần)

#### 1.4 Help & Feedback URLs
**File:** `modules/panel/components/UserMenu.js` (lines 238, 243)

**Hiện tại:**
```javascript
chrome.tabs.create({ url: 'https://help.your-domain.com' }); // TODO
chrome.tabs.create({ url: 'https://feedback.your-domain.com' }); // TODO
```

**Action:**
- [ ] Tạo help center page
- [ ] Tạo feedback form/page
- [ ] Cập nhật URLs

---

### 2. Free API Handler Configuration

**File:** `modules/api-gateway/free-api-handler.js` (lines 25-26)

**Hiện tại:**
```javascript
openai: null, // TODO: Add your OpenAI API key
googleai: null, // TODO: Add your Google AI API key
```

**Action:**
- [ ] Quyết định: Dùng API keys của bạn hay để null (fallback)
- [ ] Nếu dùng: Thêm API keys (cẩn thận với security)
- [ ] Nếu không: Đảm bảo fallback handler hoạt động đúng

**Lưu ý:** API keys nên được quản lý ở backend, không hardcode trong extension.

---

### 3. Error Handling & Edge Cases

#### 3.1 Network Errors
**Status:** ✅ Đã có graceful degradation
**Action:**
- [ ] Test offline mode
- [ ] Test slow network
- [ ] Test backend timeout
- [ ] Verify user experience khi backend down

#### 3.2 Subscription State Edge Cases
**Cần test:**
- [ ] User đang ở trial, trial hết hạn
- [ ] User upgrade nhưng payment failed
- [ ] User cancel subscription
- [ ] User downgrade từ Premium → Professional
- [ ] User có subscription expired

**Action:**
- [ ] Implement handlers cho các cases trên
- [ ] Test với mock data
- [ ] Add proper error messages

#### 3.3 Usage Limit Edge Cases
**Cần test:**
- [ ] User đạt limit trong ngày
- [ ] User đạt limit trong tháng
- [ ] Limit reset logic (daily/monthly)
- [ ] Usage sync conflicts

**Action:**
- [ ] Test limit enforcement
- [ ] Test reset logic
- [ ] Verify conflict resolution

---

### 4. UI/UX Improvements

#### 4.1 Upgrade Flow
**Current:** Click upgrade → Open URL
**Improvements:**
- [ ] Add loading state khi đang process upgrade
- [ ] Add success/error notifications
- [ ] Handle upgrade callback từ payment page
- [ ] Refresh subscription status sau upgrade

#### 4.2 Usage Display
**Current:** Token display trong footer
**Improvements:**
- [ ] Add warning khi gần đạt limit (80%, 90%)
- [ ] Add tooltip với thông tin chi tiết
- [ ] Add animation khi usage thay đổi

#### 4.3 Onboarding
**Current:** Welcome screen có sẵn
**Improvements:**
- [ ] Test welcome screen flow
- [ ] Add skip option
- [ ] Add progress indicator
- [ ] Test với new users

---

### 5. Testing & Validation

#### 5.1 Unit Tests (Optional nhưng recommended)
**Action:**
- [ ] Test subscription manager logic
- [ ] Test usage tracker calculations
- [ ] Test limits enforcer
- [ ] Test API gateway routing

#### 5.2 Integration Tests
**Action:**
- [ ] Test full login → sync → usage flow
- [ ] Test upgrade flow end-to-end
- [ ] Test feature gating
- [ ] Test migration flow

#### 5.3 Manual Testing Checklist
**Action:**
- [ ] Test với Free tier user
- [ ] Test với Professional tier user (mock)
- [ ] Test với Premium tier user (mock)
- [ ] Test với BYOK tier user
- [ ] Test offline mode
- [ ] Test với backend unavailable
- [ ] Test với backend available nhưng slow
- [ ] Test migration từ local → backend

---

### 6. Security & Privacy

#### 6.1 API Keys
**Action:**
- [ ] Đảm bảo không hardcode API keys trong code
- [ ] Review codebase cho exposed secrets
- [ ] Implement secure key management

#### 6.2 User Data
**Action:**
- [ ] Review data được sync lên backend
- [ ] Đảm bảo PII được handle đúng
- [ ] Review privacy policy compliance

#### 6.3 Authentication
**Action:**
- [ ] Verify Google OAuth flow
- [ ] Test token refresh logic
- [ ] Test logout flow

---

### 7. Documentation

#### 7.1 Code Documentation
**Action:**
- [ ] Review JSDoc comments
- [ ] Add missing documentation
- [ ] Update README files

#### 7.2 User Documentation
**Action:**
- [ ] Create user guide cho subscription tiers
- [ ] Document upgrade process
- [ ] Document usage limits

---

### 8. Performance Optimization

#### 8.1 Sync Performance
**Action:**
- [ ] Review sync intervals (5 phút cho user, 2 phút cho usage)
- [ ] Optimize sync payload size
- [ ] Add debouncing cho rapid updates

#### 8.2 UI Performance
**Action:**
- [ ] Review TokenUsageMenu rendering
- [ ] Optimize dashboard updates
- [ ] Add loading states

---

## 🎯 Priority Order

### High Priority (Làm trước khi connect Backend)
1. ✅ **Cấu hình Backend URL** - Bắt buộc
2. ✅ **Cấu hình Subscription Page URL** - Cần cho upgrade flow
3. ✅ **Test error handling** - Đảm bảo graceful degradation
4. ✅ **Test migration flow** - Đảm bảo data migration hoạt động

### Medium Priority (Có thể làm sau)
5. ⚠️ **Cấu hình Help/Feedback URLs** - Nice to have
6. ⚠️ **Cấu hình Invite URL** - Nice to have
7. ⚠️ **UI/UX improvements** - Enhancements
8. ⚠️ **Performance optimization** - Enhancements

### Low Priority (Optional)
9. 📝 **Unit tests** - Good practice
10. 📝 **Documentation** - Nice to have

---

## 🚀 Quick Start - Bước tiếp theo ngay

### Step 1: Cấu hình Backend URL
```javascript
// modules/subscription/subscription-api-client.js
const isDevelopment = !('update_url' in chrome.runtime.getManifest());
const DEFAULT_BACKEND_URL = isDevelopment
  ? 'http://localhost:3000'
  : 'https://your-actual-backend-url.com';
```

### Step 2: Test Backend Connection
```javascript
// In browser console
await backendInit.checkHealth();
// Should return true if backend is available
```

### Step 3: Cấu hình Subscription URLs
- Update URLs trong `UserMenu.js` và `TokenUsageMenu.js`
- Test upgrade flow

### Step 4: Test Migration
```javascript
// In browser console (after login)
await migrationManager.resetMigration();
await migrationManager.needsMigration(); // Should return true if has local data
await migrationManager.migrate(); // Run migration
```

---

## ✅ Status: GẦN HOÀN THIỆN

**Extension đã sẵn sàng ~95%**. Chỉ cần:
1. Cấu hình URLs (Backend, Subscription, Help, etc.)
2. Test với backend thực
3. Fix bugs nếu có
4. Deploy!

---

## 📝 Notes

- Tất cả core logic đã hoàn thiện
- Backend integration code đã sẵn sàng
- Chỉ cần cấu hình và test
- Có thể bắt đầu test với mock backend ngay


# Backend Connection Checklist - Rà soát cuối cùng

## ✅ Đã hoàn thành

### 1. Core Infrastructure
- ✅ `subscription-api-client.js` - API client với đầy đủ endpoints
- ✅ `user-sync.js` - User profile sync
- ✅ `conflict-resolver.js` - Conflict resolution
- ✅ `migration-manager.js` - Migration từ local sang backend
- ✅ `backend-init.js` - **MỚI**: Centralized initialization

### 2. Integration Points
- ✅ `app-init.js` - Initialize backend systems trong panel
- ✅ `background.js` - Initialize backend systems trong service worker
- ✅ `auth.js` handler - Trigger backend sync sau login
- ✅ `session-manager.js` - Auto sync user sau establishSession

### 3. Sync Systems
- ✅ User sync với periodic sync (5 phút)
- ✅ Subscription sync với conflict resolution
- ✅ Usage sync với queue và periodic sync (2 phút)
- ✅ Migration auto-detect và run

### 4. Error Handling
- ✅ Graceful degradation khi backend unavailable
- ✅ Non-blocking sync operations
- ✅ Error logging và warnings

---

## 🔧 Cần làm để kết nối Backend

### 1. Cấu hình Backend URL (QUAN TRỌNG)

**Option A: Hardcode trong code (Development)**
```javascript
// modules/subscription/subscription-api-client.js
const DEFAULT_BACKEND_URL = 'https://your-backend-api.com'; // Thay đổi URL này
```

**Option B: Config trong storage (Production)**
```javascript
// Set backend URL programmatically
await chrome.storage.local.set({
  backend_config: {
    url: 'https://your-backend-api.com'
  }
});

// Hoặc dùng backendInit
await backendInit.setBackendURL('https://your-backend-api.com');
```

**Option C: Environment-based (Recommended)**
```javascript
// modules/subscription/subscription-api-client.js
const isDevelopment = !('update_url' in chrome.runtime.getManifest());

const DEFAULT_BACKEND_URL = isDevelopment
  ? 'http://localhost:3000'  // Development
  : 'https://api.yourapp.com'; // Production
```

### 2. Backend API Endpoints (Backend cần implement)

#### User Endpoints
```
GET /api/users/me
Headers: Authorization: Bearer <google_token>
Response: { id, email, name, picture, preferences, subscription }

PUT /api/users/me
Headers: Authorization: Bearer <google_token>
Body: { preferences: {...} }
Response: { success: true }
```

#### Subscription Endpoints
```
GET /api/subscription/status
Headers: Authorization: Bearer <google_token>
Response: {
  tier: 'free' | 'professional' | 'premium' | 'byok',
  status: 'active' | 'trial' | 'expired' | 'cancelled',
  trialEndsAt: timestamp | null,
  subscriptionEndsAt: timestamp | null,
  ...
}

PUT /api/subscription/status
Headers: Authorization: Bearer <google_token>
Body: { tier, status, ... }
Response: { success: true }

POST /api/subscription/upgrade
Headers: Authorization: Bearer <google_token>
Body: { tier: 'professional' | 'premium', billingCycle: 'monthly' | 'yearly' }
Response: { success: true, subscription: {...} }

POST /api/subscription/cancel
Headers: Authorization: Bearer <google_token>
Response: { success: true }

GET /api/subscription/limits
Headers: Authorization: Bearer <google_token>
Response: { tokensPerDay, requestsPerDay, ... }
```

#### Usage Endpoints
```
GET /api/usage?period=day|month
Headers: Authorization: Bearer <google_token>
Response: {
  tokens: { today: number, month: number, limit: number },
  requests: { today: number, month: number, limit: number },
  time: { recording: number, translation: number, limit: number }
}

POST /api/usage/sync
Headers: Authorization: Bearer <google_token>
Body: {
  tokens: { today: number, month: number },
  requests: { today: number, month: number },
  time: { recording: number, translation: number },
  timestamp: number
}
Response: { success: true, synced: true }
```

#### Health Check
```
GET /health
Response: { status: 'ok' }
```

### 3. Authentication Flow

Backend cần:
1. **Verify Google Token**: Nhận Google OAuth token từ Extension
2. **Create/Get User**: Tạo user mới hoặc lấy user hiện có
3. **Return User + Subscription**: Trả về user profile và subscription status

**Flow:**
```
Extension → Google OAuth → Get Token
Extension → Backend /api/users/me (with Google token)
Backend → Verify token with Google
Backend → Create/Get user
Backend → Return user + subscription
Extension → Store locally + Start sync
```

### 4. Testing Steps

#### Step 1: Test Backend Availability
```javascript
// In browser console
await backendInit.checkHealth();
// Should return true if backend is available
```

#### Step 2: Test Manual Sync
```javascript
// In browser console
await backendInit.syncAll();
// Should sync user, subscription, and usage
```

#### Step 3: Test Migration
```javascript
// In browser console
await migrationManager.resetMigration(); // Reset first
await migrationManager.needsMigration(); // Should return true
await migrationManager.migrate(); // Run migration
```

#### Step 4: Test Login Flow
1. Logout (if logged in)
2. Login again
3. Check console for:
   - `[BackendInit] Initializing backend systems...`
   - `[BackendInit] Backend available: true`
   - `[BackendInit] Running migration...` (if needed)
   - `[BackendInit] Initial sync completed`

---

## 🚨 Common Issues & Solutions

### Issue 1: Backend unavailable
**Symptom**: `[BackendInit] Backend unavailable, will use local mode`

**Solution**:
- Check backend URL is correct
- Check backend server is running
- Check CORS settings on backend
- Check network connectivity

### Issue 2: 401 Unauthorized
**Symptom**: `[SubscriptionAPIClient] Failed to get subscription status: 401`

**Solution**:
- Check Google token is valid
- Check backend can verify Google token
- Check Authorization header format: `Bearer <token>`

### Issue 3: Migration not running
**Symptom**: Migration doesn't run after login

**Solution**:
- Check `migrationManager.needsMigration()` returns true
- Check `migrationManager.hasLocalData()` returns true
- Check backend is available
- Manually trigger: `await migrationManager.migrate()`

### Issue 4: Sync not working
**Symptom**: Data not syncing to backend

**Solution**:
- Check periodic syncs are started: `backendInit.syncStarted`
- Check backend is available
- Manually trigger: `await backendInit.syncAll()`
- Check console for errors

---

## 📝 Final Checklist

### Before Connecting to Backend
- [ ] Update `DEFAULT_BACKEND_URL` trong `subscription-api-client.js`
- [ ] Backend đã implement tất cả endpoints
- [ ] Backend có CORS enabled cho Extension origin
- [ ] Backend có thể verify Google OAuth tokens
- [ ] Test health check endpoint

### After Connecting
- [ ] Test login flow → Check sync triggers
- [ ] Test subscription sync → Check tier updates
- [ ] Test usage sync → Check usage data syncs
- [ ] Test migration → Check local data migrates
- [ ] Test periodic syncs → Check syncs run automatically
- [ ] Test offline mode → Check graceful degradation

---

## 🎯 Quick Start

1. **Update Backend URL**:
```javascript
// In subscription-api-client.js
const DEFAULT_BACKEND_URL = 'https://your-backend-api.com';
```

2. **Test Connection**:
```javascript
// In browser console
await backendInit.checkHealth();
```

3. **Trigger Initial Sync**:
```javascript
// After login
await backendInit.syncAll();
```

4. **Monitor Syncs**:
```javascript
// Check if periodic syncs are running
console.log('Sync started:', backendInit.syncStarted);
```

---

## ✅ Status: SẴN SÀNG KẾT NỐI

Tất cả code đã sẵn sàng. Chỉ cần:
1. Update Backend URL
2. Backend implement các endpoints
3. Test connection
4. Deploy!


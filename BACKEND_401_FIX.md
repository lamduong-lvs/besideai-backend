# 🔧 Backend 401 Error Fix

## 📋 Vấn Đề

Backend đang gặp lỗi "Function Invocation 401" - Authentication errors khi verify token với Google OAuth.

## ✅ Các Cải Thiện Đã Thực Hiện

### 1. **Cải Thiện Logging trong `verifyAuth` Middleware**

**File:** `backend/src/middleware/auth.js`

**Thay đổi:**
- Log request details (method, path, auth header presence)
- Log token extraction status
- Log Google token verification status
- Log user creation/finding
- Log chi tiết error với stack trace (development mode)

**Lợi ích:**
- Dễ debug hơn khi có lỗi
- Biết được chính xác bước nào fail
- Có thể trace request flow

### 2. **Cải Thiện Error Handling trong `verifyGoogleToken`**

**File:** `backend/src/lib/auth.js`

**Thay đổi:**
- Log Google API response status
- Phân biệt các loại errors:
  - `401` → `INVALID_TOKEN` (token expired/invalid)
  - `403` → `TOKEN_FORBIDDEN` (token không có quyền)
  - `500+` → `GOOGLE_API_UNAVAILABLE` (Google API down)
- Extract error details từ Google API response
- Validate user ID và email từ Google response
- Better error messages

**Lợi ích:**
- Biết được chính xác lỗi gì từ Google API
- Error messages rõ ràng hơn
- Dễ debug network issues

### 3. **Cải Thiện `extractToken` Function**

**File:** `backend/src/lib/auth.js`

**Thay đổi:**
- Support multiple header formats (Vercel serverless functions có thể dùng different casing)
- Check `authorization`, `Authorization`, và case variations
- Validate token format và length
- Log warnings khi token không hợp lệ

**Lợi ích:**
- Tương thích tốt hơn với Vercel serverless functions
- Phát hiện sớm các vấn đề với token format
- Better error messages

---

## 🔍 Debugging Guide

### Khi Gặp 401 Error:

1. **Check Backend Logs:**
   ```
   [Auth Middleware] Request: { method, path, hasAuthHeader, ... }
   [Auth Middleware] No token found in request
   ```
   → Token không được gửi từ extension

2. **Check Token Extraction:**
   ```
   [Auth] No Authorization header found
   [Auth] Invalid Authorization header format
   ```
   → Header format không đúng

3. **Check Google API Response:**
   ```
   [Auth] Google API response: { status: 401, ... }
   [Auth] Token verification failed: { message, code, ... }
   ```
   → Token expired hoặc invalid

4. **Check User Creation:**
   ```
   [Auth Middleware] Token verified, user: { googleId, email }
   [Auth Middleware] User found/created: { userId, email }
   ```
   → User được tạo/find thành công

---

## 🎯 Common Issues & Solutions

### Issue 1: "No token found in request"

**Nguyên nhân:**
- Extension không gửi Authorization header
- Header bị mất trong transit

**Giải pháp:**
- Check extension code: `backend-api-handler.js` có gửi header không?
- Check network tab: Request có `Authorization: Bearer <token>` không?

### Issue 2: "Invalid or expired token"

**Nguyên nhân:**
- Token đã expired
- Token bị revoked
- Token không hợp lệ

**Giải pháp:**
- User cần login lại
- Extension sẽ tự động refresh token (đã implement)
- Check Google OAuth token validity

### Issue 3: "Google API temporarily unavailable"

**Nguyên nhân:**
- Google API down
- Network issues
- Rate limiting

**Giải pháp:**
- Retry sau vài giây
- Check Google API status
- Implement retry logic với exponential backoff

### Issue 4: "Token access forbidden"

**Nguyên nhân:**
- Token không có quyền truy cập userinfo
- OAuth scope không đúng

**Giải pháp:**
- Check OAuth scopes trong extension
- Đảm bảo có `https://www.googleapis.com/auth/userinfo.email` scope

---

## 📊 Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| `MISSING_TOKEN` | No Authorization header | Check extension sends header |
| `INVALID_TOKEN` | Token expired/invalid | User needs to login again |
| `TOKEN_FORBIDDEN` | Token không có quyền | Check OAuth scopes |
| `MISSING_EMAIL` | Google response không có email | Check Google account settings |
| `MISSING_USER_ID` | Google response không có ID | Check Google API response |
| `GOOGLE_API_UNAVAILABLE` | Google API down | Retry later |
| `TOKEN_VERIFICATION_FAILED` | General verification error | Check logs for details |

---

## 🚀 Next Steps

1. **Deploy Backend:**
   ```bash
   cd backend
   git add .
   git commit -m "Improve 401 error handling and logging"
   git push origin main
   ```

2. **Monitor Logs:**
   - Check Vercel logs sau khi deploy
   - Test với extension
   - Xem logs để identify root cause

3. **Test Scenarios:**
   - ✅ Valid token → Should work
   - ✅ Expired token → Should return 401 với clear message
   - ✅ Missing token → Should return 401 với `MISSING_TOKEN` code
   - ✅ Invalid token format → Should return 401 với clear message

---

## 📝 Notes

- **Logging:** Logs sẽ có nhiều hơn, nhưng chỉ trong development mode sẽ có stack traces
- **Performance:** Logging không ảnh hưởng performance đáng kể
- **Security:** Không log full token, chỉ log prefix để debug
- **Vercel:** Serverless functions có thể có different header casing, đã handle

---

## 🔗 Related Files

- `backend/src/middleware/auth.js` - Auth middleware
- `backend/src/lib/auth.js` - Auth utilities
- `backend/api/ai/call.js` - AI call endpoint (uses verifyAuth)
- `modules/api-gateway/backend-api-handler.js` - Extension API handler


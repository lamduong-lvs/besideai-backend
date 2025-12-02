# Lemon Squeezy Webhook Events - Hướng dẫn chọn

## ✅ Events cần thiết (Bắt buộc)

Chọn các events sau trong Lemon Squeezy webhook form:

### 1. **order_created** ✅
- **Khi nào:** Khi user hoàn tất thanh toán và order được tạo
- **Mục đích:** Kích hoạt subscription sau khi payment thành công
- **Handler:** `handleOrderCreated()` - Tạo/update subscription trong database

### 2. **subscription_created** ✅
- **Khi nào:** Khi subscription mới được tạo trong Lemon Squeezy
- **Mục đích:** Đồng bộ subscription details (trial dates, renewal dates)
- **Handler:** `handleSubscriptionCreated()` - Update subscription với trial/renewal dates

### 3. **subscription_updated** ✅
- **Khi nào:** Khi subscription được update (status, dates, plan changes)
- **Mục đích:** Đồng bộ mọi thay đổi subscription
- **Handler:** `handleSubscriptionUpdated()` - Update subscription status và dates

### 4. **subscription_cancelled** ✅
- **Khi nào:** Khi user cancel subscription
- **Mục đích:** Downgrade user về free tier
- **Handler:** `handleSubscriptionCancelled()` - Set subscription status = expired, tier = free

### 5. **subscription_payment_success** ✅
- **Khi nào:** Khi subscription payment thành công
- **Mục đích:** Đảm bảo subscription vẫn active sau payment
- **Handler:** `handleSubscriptionPaymentSuccess()` - Update subscription status = active

### 6. **subscription_payment_failed** ✅
- **Khi nào:** Khi subscription payment thất bại
- **Mục đích:** Log và có thể gửi notification cho user
- **Handler:** `handleSubscriptionPaymentFailed()` - Log error (có thể update status sau)

## ⚠️ Events tùy chọn (Không bắt buộc nhưng nên có)

### 7. **subscription_resumed** (Tùy chọn)
- **Khi nào:** Khi subscription được resume sau khi pause/cancel
- **Mục đích:** Reactivate subscription
- **Note:** Có thể handle trong `subscription_updated`

### 8. **subscription_expired** (Tùy chọn)
- **Khi nào:** Khi subscription hết hạn
- **Mục đích:** Downgrade về free tier
- **Note:** Có thể handle trong `subscription_updated` hoặc `subscription_cancelled`

### 9. **subscription_plan_changed** (Tùy chọn)
- **Khi nào:** Khi user upgrade/downgrade plan
- **Mục đích:** Update tier trong database
- **Note:** Có thể handle trong `subscription_updated`

## ❌ Events không cần thiết (Có thể bỏ qua)

- `affiliate_activated` - Chỉ cần nếu có affiliate program
- `order_refunded` - Có thể handle trong `subscription_cancelled`
- `subscription_paused` - Có thể handle trong `subscription_updated`
- `subscription_unpaused` - Có thể handle trong `subscription_updated`
- `subscription_payment_recovered` - Có thể handle trong `subscription_payment_success`
- `subscription_payment_refunded` - Có thể handle trong `subscription_cancelled`
- `license_key_created` - Chỉ cần nếu có license key system

## 📋 Checklist cho Webhook Setup

Trong Lemon Squeezy webhook form, chọn:

- [x] **order_created**
- [x] **subscription_created**
- [x] **subscription_updated**
- [x] **subscription_cancelled**
- [x] **subscription_payment_success**
- [x] **subscription_payment_failed**
- [ ] subscription_resumed (optional)
- [ ] subscription_expired (optional)
- [ ] subscription_plan_changed (optional)

## 🔗 Webhook URL

```
https://besideai.work/api/webhooks/lemon-squeezy
```

## 🔐 Signing Secret

- Copy signing secret từ Lemon Squeezy
- Thêm vào Vercel environment variable: `LEMON_SQUEEZY_WEBHOOK_SECRET`
- Dùng để verify webhook requests

## 📝 Lưu ý

1. **Minimum Required:** Chọn ít nhất 6 events bắt buộc ở trên
2. **Optional Events:** Có thể thêm sau nếu cần
3. **Testing:** Test từng event sau khi setup
4. **Logs:** Check Vercel logs để verify webhook hoạt động


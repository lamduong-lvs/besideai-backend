# Chuyển đổi từ Stripe sang Lemon Squeezy

## ✅ Đã hoàn thành

### 1. Tạo Lemon Squeezy Integration
- ✅ `backend/src/lib/lemon-squeezy.js` - Thay thế `stripe.js`
- ✅ Hỗ trợ tất cả chức năng: checkout, portal, cancel, webhook

### 2. Cập nhật Database Schema
- ✅ Migration `006_update_subscriptions_for_lemon_squeezy.sql`
- ✅ Thêm columns: `lemon_subscription_id`, `lemon_customer_id`, `lemon_order_id`
- ✅ Giữ Stripe columns để backward compatibility

### 3. Cập nhật Models
- ✅ `Subscription.js` - Thêm methods:
  - `findByLemonSubscriptionId()`
  - `findByLemonOrderId()`
  - Hỗ trợ cả Stripe và Lemon Squeezy

### 4. Cập nhật API Endpoints
- ✅ `api/subscription.js` - Chuyển sang Lemon Squeezy
- ✅ `api/webhooks/lemon-squeezy.js` - Webhook handler mới
- ✅ `vercel.json` - Thêm webhook route

## 📋 Các bước tiếp theo

### 1. Setup Lemon Squeezy Account

1. Đăng ký tại [Lemon Squeezy](https://www.lemonsqueezy.com/)
2. Tạo Store và lấy Store ID
3. Tạo API Key (Settings > API)
4. Tạo Products và Variants:
   - Professional Monthly
   - Professional Yearly
   - Premium Monthly
   - Premium Yearly
5. Copy Variant IDs

### 2. Set Environment Variables trong Vercel

Thêm các biến sau vào Vercel:

```bash
LEMON_SQUEEZY_API_KEY=your_api_key
LEMON_SQUEEZY_STORE_ID=your_store_id
LEMON_SQUEEZY_VARIANT_ID_PROFESSIONAL_MONTHLY=variant_id
LEMON_SQUEEZY_VARIANT_ID_PROFESSIONAL_YEARLY=variant_id
LEMON_SQUEEZY_VARIANT_ID_PREMIUM_MONTHLY=variant_id
LEMON_SQUEEZY_VARIANT_ID_PREMIUM_YEARLY=variant_id
LEMON_SQUEEZY_WEBHOOK_SECRET=webhook_secret
```

### 3. Run Database Migration

```bash
POST https://besideai.work/api/migrate
{
  "secret": "your_cron_secret"
}
```

Hoặc chạy trực tiếp trong Supabase SQL Editor:
- File: `backend/migrations/006_update_subscriptions_for_lemon_squeezy.sql`

### 4. Setup Webhook trong Lemon Squeezy

1. Vào Settings > Webhooks
2. Tạo webhook mới:
   - URL: `https://besideai.work/api/webhooks/lemon-squeezy`
   - Events:
     - `order_created`
     - `subscription_created`
     - `subscription_updated`
     - `subscription_cancelled`
     - `subscription_payment_success`
     - `subscription_payment_failed`
3. Copy Signing Secret → thêm vào `LEMON_SQUEEZY_WEBHOOK_SECRET`

## 🔄 So sánh Stripe vs Lemon Squeezy

### Checkout Session

**Stripe:**
```javascript
const session = await stripe.checkout.sessions.create({
  customer: customerId,
  line_items: [{ price: priceId }],
  mode: 'subscription'
});
```

**Lemon Squeezy:**
```javascript
const session = await createCheckoutSession({
  user,
  tier: 'professional',
  billingCycle: 'monthly'
});
```

### Customer Portal

**Stripe:** Built-in billing portal

**Lemon Squeezy:** Custom management URL (có thể cần build custom page)

### Webhook Events

**Stripe:**
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

**Lemon Squeezy:**
- `order_created`
- `subscription_created`
- `subscription_updated`
- `subscription_cancelled`
- `subscription_payment_success`
- `subscription_payment_failed`

## 📝 Lưu ý

1. **Backward Compatibility:** Stripe columns vẫn được giữ, có thể xóa sau
2. **Portal:** Lemon Squeezy không có built-in portal, cần custom page
3. **Testing:** Sử dụng test mode của Lemon Squeezy trước khi deploy
4. **Migration:** Có thể migrate dữ liệu từ Stripe sang Lemon Squeezy (liên hệ support)

## 🚀 Deploy

1. Push code lên GitHub
2. Vercel sẽ tự động deploy
3. Set environment variables trong Vercel
4. Run migration
5. Setup webhook trong Lemon Squeezy
6. Test checkout flow

## 📚 Tài liệu tham khảo

- [Lemon Squeezy API Docs](https://docs.lemonsqueezy.com/api)
- [Lemon Squeezy Developer Guide](https://docs.lemonsqueezy.com/guides/developer-guide/getting-started)
- [Webhook Documentation](https://docs.lemonsqueezy.com/help/webhooks)
- [Migrating from Stripe](https://docs.lemonsqueezy.com/help/migrating/migrating-from-stripe)


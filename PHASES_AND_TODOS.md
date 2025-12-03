# 📋 PHASES & TODOS - BesideAI Frontend Development

**Cập nhật:** 2025-01-01  
**Trạng thái:** Backend đã hoàn thành, bắt đầu Frontend development

---

## 🎯 Tổng quan

Dựa trên `Lavasa_Project_Bible.md`, đây là breakdown chi tiết các phases và todos cần thực hiện để hoàn thành frontend website.

**Domain:** `besideai.work`  
**Backend API:** `https://besideai.work/api/*`  
**Tech Stack:** Next.js 14 + Shadcn/UI + Tailwind CSS

---

## 📅 PHASE 1: Setup Frontend Project & Authentication (Tuần 1)

**Mục tiêu:** Khởi tạo project, setup authentication, và tạo basic structure

### Phase 1.1: Project Initialization
- [ ] **phase1-1:** Khởi tạo Next.js 14 project với TypeScript và App Router
  - Chạy: `npx create-next-app@latest frontend --typescript --tailwind --app`
  - Setup trong thư mục `frontend/` hoặc `web/`
  
- [ ] **phase1-2:** Setup Shadcn/UI và Tailwind CSS
  - Chạy: `npx shadcn-ui@latest init`
  - Install các components cần thiết: button, card, sidebar, input, etc.

- [ ] **phase1-3:** Cấu hình environment variables
  - Tạo `.env.local` với:
    - `NEXT_PUBLIC_API_URL=https://besideai.work`
    - `NEXT_PUBLIC_GOOGLE_CLIENT_ID=636759880823-b3eopt81tgh3fsj1aepl3ftedv3kc1rs.apps.googleusercontent.com`
    - `NEXT_PUBLIC_GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback` (dev)
  - Tạo `.env.example` template

### Phase 1.2: Folder Structure & Core Files
- [ ] **phase1-4:** Tạo folder structure
  ```
  frontend/
  ├── app/
  │   ├── (auth)/
  │   │   ├── login/
  │   │   └── callback/
  │   ├── (marketing)/
  │   │   ├── layout.tsx
  │   │   ├── page.tsx
  │   │   ├── pricing/
  │   │   ├── terms/
  │   │   └── privacy/
  │   ├── (dashboard)/
  │   │   ├── layout.tsx
  │   │   ├── account/
  │   │   └── settings/
  │   └── success/
  ├── components/
  │   ├── ui/ (shadcn components)
  │   ├── dashboard/
  │   └── marketing/
  └── lib/
      ├── api.ts
      ├── auth.ts
      └── utils.ts
  ```

- [ ] **phase1-5:** Tạo API client (`lib/api.ts`)
  - Function `apiRequest()` để gọi backend
  - Auto handle authentication token
  - Error handling và redirect to login nếu 401
  - Types cho API responses

- [ ] **phase1-7:** Tạo auth helpers (`lib/auth.ts`)
  - `getAuthToken()` - Get token từ cookie/localStorage
  - `setAuthToken()` - Save token
  - `removeAuthToken()` - Clear token
  - `isAuthenticated()` - Check if user is logged in

### Phase 1.3: Authentication Implementation
- [ ] **phase1-6:** Implement Google OAuth flow
  - Tạo `/app/(auth)/login/page.tsx`:
    - Google OAuth button
    - Redirect đến Google OAuth URL
    - Handle OAuth parameters
  - Tạo `/app/(auth)/callback/page.tsx`:
    - Receive code từ Google
    - Exchange code lấy access token
    - Save token và redirect to dashboard
  - Tạo `/app/api/auth/callback/route.ts` (nếu cần server-side)

- [ ] **phase1-8:** Tạo middleware.ts
  - Protect `/account/*` routes
  - Protect `/admin/*` routes (check admin role)
  - Verify token với backend API
  - Redirect to login nếu không authenticated

### Phase 1.4: Basic Layouts
- [ ] **phase1-9:** Tạo marketing layout (`app/(marketing)/layout.tsx`)
  - Navbar với logo, navigation links
  - Footer với links (Terms, Privacy, Contact)
  - Responsive design

- [ ] **phase1-10:** Tạo dashboard layout (`app/(dashboard)/layout.tsx`)
  - Sidebar với navigation
  - Main content area
  - User menu (avatar, logout)
  - Mobile responsive (hamburger menu)

**Deliverables Phase 1:**
- ✅ Next.js project setup hoàn chỉnh
- ✅ Google OAuth login hoạt động
- ✅ Basic layouts cho marketing và dashboard
- ✅ API client ready để gọi backend

---

## 💳 PHASE 2: Subscription Management (Tuần 2)

**Mục tiêu:** Tích hợp subscription management với backend và Lemon Squeezy

### Phase 2.1: Lemon Squeezy Webhook Setup
- [ ] **phase2-1:** Setup Lemon Squeezy Webhook trong dashboard
  - Vào Lemon Squeezy Dashboard > Settings > Webhooks
  - Create webhook:
    - URL: `https://besideai.work/api/webhooks/lemon-squeezy`
    - Signing Secret: `18072024`
    - Events: order_created, subscription_created, subscription_updated, subscription_cancelled, subscription_payment_success, subscription_payment_failed
  - Verify webhook hoạt động (check Vercel logs)

### Phase 2.2: Account/Subscription Page
- [ ] **phase2-2:** Tạo trang `/account` với subscription status display
  - Component: `SubscriptionCard`
    - Hiển thị current tier (Free/Professional/Premium)
    - Hiển thị status (Active/Trial/Expired)
    - Hiển thị renewal date
    - Hiển thị billing cycle (Monthly/Yearly)
  - Gọi `GET /api/subscription/status` để lấy data
  - Loading states và error handling

- [ ] **phase2-3:** Implement upgrade button
  - Button "Upgrade to Professional" / "Upgrade to Premium"
  - Gọi `POST /api/subscription/upgrade` với tier và billingCycle
  - Receive checkout URL từ backend
  - Redirect user đến Lemon Squeezy checkout
  - Handle success/cancel redirects

- [ ] **phase2-4:** Implement cancel subscription
  - Button "Cancel Subscription"
  - Confirm dialog
  - Gọi `POST /api/subscription/cancel`
  - Show success message
  - Update UI sau khi cancel

- [ ] **phase2-5:** Implement portal access
  - Button "Manage Subscription"
  - Gọi `POST /api/subscription/portal`
  - Receive portal URL từ backend
  - Redirect user đến Lemon Squeezy customer portal

- [ ] **phase2-6:** Tạo usage statistics display
  - Component: `UsageStats`
    - Tokens used/remaining (daily/monthly)
    - Requests made (daily/monthly)
    - Recording time (daily/monthly)
    - Translation time (daily/monthly)
  - Gọi `GET /api/usage?period=day|month`
  - Display charts/graphs (có thể dùng recharts hoặc chart.js)
  - Show limits based on tier

- [ ] **phase2-7:** Tạo success page (`/success`)
  - Thank you message
  - Subscription activation confirmation
  - Link về dashboard/account
  - Link về extension

**Deliverables Phase 2:**
- ✅ Lemon Squeezy webhook setup và hoạt động
- ✅ Account page với đầy đủ subscription management
- ✅ Upgrade/cancel/portal flows hoạt động
- ✅ Usage statistics hiển thị đúng

---

## 🌐 PHASE 3: Landing Page & Marketing (Tuần 2-3)

**Mục tiêu:** Tạo landing page và marketing pages để Lemon Squeezy verify

### Phase 3.1: Landing Page
- [ ] **phase3-1:** Tạo landing page (`/`) với hero section
  - Hero với headline, subheadline
  - CTA button "Get Started" → redirect to login/checkout
  - Background image hoặc gradient
  - Responsive design

- [ ] **phase3-2:** Tạo features section
  - List các features chính của BesideAI
  - Icons và descriptions
  - Grid layout responsive

- [ ] **phase3-3:** Tạo pricing table trên landing page
  - Display Professional và Premium plans
  - Monthly và Yearly options
  - Feature comparison
  - CTA buttons → redirect to checkout

### Phase 3.2: Marketing Pages
- [ ] **phase3-4:** Tạo pricing page (`/pricing`)
  - Chi tiết các gói (Free, Professional, Premium)
  - Feature comparison table
  - Pricing (Monthly/Yearly)
  - CTA buttons
  - FAQ section (optional)

- [ ] **phase3-5:** Tạo Terms of Service page (`/terms`)
  - Terms and conditions content
  - Proper formatting
  - Last updated date

- [ ] **phase3-6:** Tạo Privacy Policy page (`/privacy`)
  - Privacy policy content
  - Data collection information
  - Cookie policy
  - Last updated date

### Phase 3.3: Deployment
- [ ] **phase3-7:** Setup Vercel deployment cho frontend
  - Connect GitHub repository
  - Setup build command: `npm run build`
  - Setup output directory: `.next`
  - Configure environment variables trong Vercel

- [ ] **phase3-8:** Configure domain `besideai.work` cho frontend
  - Add domain trong Vercel project settings
  - Configure DNS records
  - SSL certificate (auto từ Vercel)
  - Test domain hoạt động

**Deliverables Phase 3:**
- ✅ Landing page đẹp và professional
- ✅ Marketing pages đầy đủ (Terms, Privacy)
- ✅ Website deployed và accessible tại `besideai.work`
- ✅ Sẵn sàng cho Lemon Squeezy verification

---

## 🧪 PHASE 4: Testing & Integration (Tuần 3)

**Mục tiêu:** Test toàn bộ flow và tích hợp với Extension

### Phase 4.1: Authentication Testing
- [ ] **phase4-1:** Test Google OAuth flow end-to-end
  - Test login từ landing page
  - Test callback handler
  - Test token storage
  - Test protected routes (middleware)
  - Test logout

### Phase 4.2: Subscription Flow Testing
- [ ] **phase4-2:** Test subscription checkout flow (Professional Monthly)
  - Click upgrade button
  - Redirect to Lemon Squeezy
  - Complete payment (test mode)
  - Verify webhook received
  - Verify subscription activated
  - Verify success page displayed

- [ ] **phase4-3:** Test subscription checkout flow (Professional Yearly)
  - Tương tự như trên

- [ ] **phase4-4:** Test subscription checkout flow (Premium Monthly/Yearly)
  - Tương tự như trên

- [ ] **phase4-5:** Test cancel subscription flow
  - Click cancel button
  - Confirm cancellation
  - Verify subscription status updated
  - Verify webhook received

- [ ] **phase4-6:** Test portal access flow
  - Click "Manage Subscription"
  - Redirect to Lemon Squeezy portal
  - Verify portal accessible

- [ ] **phase4-7:** Verify webhook events
  - Check Vercel logs cho webhook events
  - Verify database được update đúng
  - Test các events: order_created, subscription_created, subscription_updated, subscription_cancelled

### Phase 4.3: Extension Integration
- [ ] **phase4-8:** Update Extension `UserMenu.js`
  - Tìm file: `modules/panel/components/UserMenu.js`
  - Update subscription URL: `https://besideai.work/account`
  - Test redirect từ extension

- [ ] **phase4-9:** Update Extension `TokenUsageMenu.js`
  - Tìm file: `modules/panel/components/TokenUsageMenu.js`
  - Update upgrade URL: `https://besideai.work/account?action=upgrade`
  - Test redirect từ extension

**Deliverables Phase 4:**
- ✅ Tất cả flows được test và hoạt động đúng
- ✅ Extension tích hợp với website
- ✅ Webhook events được verify
- ✅ System ready for production

---

## 👨‍💼 PHASE 5: Admin Dashboard (Tuần 4) - OPTIONAL

**Mục tiêu:** Tạo admin dashboard để quản lý system

### Phase 5.1: Admin Protection
- [ ] **phase5-1:** Tạo admin route protection
  - Update middleware.ts để check admin role
  - Check email hoặc role field trong database
  - Redirect non-admin users

### Phase 5.2: Admin Dashboard
- [ ] **phase5-2:** Tạo admin dashboard page (`/admin`)
  - Statistics cards:
    - Total users
    - Active subscriptions
    - Total revenue (từ Lemon Squeezy)
    - Usage statistics
  - Charts/graphs cho analytics
  - Recent activity log

- [ ] **phase5-3:** Implement admin API key management UI
  - List all API keys
  - Add new API key form
  - Enable/disable API keys
  - View usage statistics per key
  - Gọi `/api/admin/add-api-key` endpoint

- [ ] **phase5-4:** Implement admin models management UI (optional)
  - List all models
  - Enable/disable models
  - Update model priority
  - Add/edit model configuration

**Deliverables Phase 5:**
- ✅ Admin dashboard với statistics
- ✅ API key management interface
- ✅ Models management interface (optional)

---

## 📊 Priority & Dependencies

### HIGH PRIORITY (Cần làm ngay)
1. **Phase 1:** Setup project và authentication
2. **Phase 2:** Subscription management
3. **Phase 3:** Landing page và deployment

### MEDIUM PRIORITY
4. **Phase 4:** Testing và integration

### LOW PRIORITY (Optional)
5. **Phase 5:** Admin dashboard

### Dependencies
- Phase 1 → Phase 2 (cần auth trước khi làm subscription)
- Phase 2 → Phase 3 (có thể làm song song)
- Phase 3 → Phase 4 (cần deploy trước khi test)
- Phase 4 → Phase 5 (có thể làm song song)

---

## 🛠️ Technical Notes

### Environment Variables
```bash
# Frontend .env.local
NEXT_PUBLIC_API_URL=https://besideai.work
NEXT_PUBLIC_GOOGLE_CLIENT_ID=636759880823-b3eopt81tgh3fsj1aepl3ftedv3kc1rs.apps.googleusercontent.com
NEXT_PUBLIC_GOOGLE_REDIRECT_URI=https://besideai.work/auth/callback
```

### Backend API Endpoints
- `GET /api/users/me` - Get current user
- `GET /api/subscription/status` - Get subscription
- `GET /api/subscription/limits` - Get limits
- `POST /api/subscription/upgrade` - Upgrade subscription
- `POST /api/subscription/cancel` - Cancel subscription
- `POST /api/subscription/portal` - Get portal URL
- `GET /api/usage?period=day|month` - Get usage data
- `GET /api/models` - Get available models

### Google OAuth Flow
1. User clicks "Login with Google"
2. Redirect to Google OAuth: `https://accounts.google.com/o/oauth2/v2/auth?...`
3. User authorizes
4. Google redirects to `/auth/callback?code=...`
5. Frontend exchanges code for access token
6. Save token và redirect to dashboard

---

## ✅ Checklist Summary

**Phase 1:** 10 tasks  
**Phase 2:** 7 tasks  
**Phase 3:** 8 tasks  
**Phase 4:** 9 tasks  
**Phase 5:** 4 tasks (optional)

**Total:** 38 tasks (34 required + 4 optional)

---

**Last Updated:** 2025-01-01  
**Next Review:** Sau khi hoàn thành Phase 1


LAVASA PROJECT BIBLE: KẾ HOẠCH & KIẾN TRÚC HỆ THỐNG TOÀN DIỆN

Dự án: BesideAI (Lavasa AI / Monica Clone)
Mục tiêu: Xây dựng hệ thống SaaS AI toàn diện gồm Website, Chrome Extension và Backend quản lý.
Nguyên tắc: Tối ưu chi phí (Free Tier), Code sạch (Clean Architecture), Dễ mở rộng (Scalable).

**TRẠNG THÁI HIỆN TẠI (Cập nhật: 2025-01-01):**
- ✅ Backend đã hoàn thành (Vercel serverless functions)
- ✅ Database schema đã setup (Supabase PostgreSQL)
- ✅ Lemon Squeezy integration đã hoàn thành
- ✅ Extension đã có sẵn (Chrome Extension)
- ⏳ Frontend website đang cần được tạo

PHẦN 1: TỔNG QUAN CÔNG NGHỆ (TECH STACK)

1. Frontend (Web & Dashboard)

Framework: Next.js 14 (App Router) - Chuẩn mực hiện tại.

UI Library: Shadcn/UI + Tailwind CSS (Giao diện đẹp, nhẹ, dễ tùy biến).

Icons: Lucide React.

2. Backend & Database

Core Backend: Vercel Serverless Functions (Node.js) - Đã triển khai và hoạt động.

Database: Supabase (PostgreSQL) - Đã setup với migrations 001-006.

Authentication: Google OAuth 2.0 (Custom implementation, không dùng Supabase Auth).

Storage: Supabase Storage (Có thể dùng cho avatar user, ảnh AI tạo ra - chưa implement).

**Lưu ý:** Backend hiện tại dùng Google OAuth trực tiếp, không dùng Supabase Auth. Có thể migrate sang Supabase Auth sau nếu cần.

3. Payment & Subscriptions

Gateway: Lemon Squeezy (Hỗ trợ thuế quốc tế tốt hơn Stripe, Merchant of Record).

Webhook: Xử lý tự động kích hoạt gói Pro.

4. Extension (Client)

Core: Chrome Extension (Manifest V3) - Đã có sẵn và hoạt động.

Kết nối: Gọi API về Backend (https://besideai.work/api/*) xác thực qua Google OAuth Token.

**Lưu ý:** Extension hiện tại đã được phát triển, chỉ cần tích hợp với frontend website mới.

PHẦN 2: QUY HOẠCH DATABASE (SUPABASE SCHEMA)

**TRẠNG THÁI:** Database schema đã được tạo và migrate thành công (Migrations 001-006).

**Cấu trúc hiện tại:**

-- 1. Bảng Users (Đã tạo - Migration 001)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    picture TEXT,
    google_id VARCHAR(255) UNIQUE,
    preferences JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng Subscriptions (Đã tạo - Migration 002, 006)
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tier VARCHAR(50) NOT NULL DEFAULT 'free', -- 'free', 'professional', 'premium', 'byok'
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'trial', 'expired', 'cancelled'
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    subscription_ends_at TIMESTAMP WITH TIME ZONE,
    billing_cycle VARCHAR(20), -- 'monthly' or 'yearly'
    -- Lemon Squeezy fields (Migration 006)
    lemon_subscription_id VARCHAR(255),
    lemon_customer_id VARCHAR(255),
    lemon_order_id VARCHAR(255),
    -- Legacy Stripe fields (có thể xóa sau)
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bảng Usage (Đã tạo - Migration 003)
CREATE TABLE usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    tokens INTEGER DEFAULT 0,
    requests INTEGER DEFAULT 0,
    recording_time INTEGER DEFAULT 0, -- in minutes
    translation_time INTEGER DEFAULT 0, -- in minutes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_date UNIQUE (user_id, date)
);

-- 4. Bảng Models (Đã tạo - Migration 004)
CREATE TABLE models (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL, -- openai, anthropic, google, groq, etc.
    provider_name VARCHAR(255) NOT NULL,
    tier VARCHAR(20) NOT NULL DEFAULT 'free', -- free, pro, premium
    priority INTEGER DEFAULT 0,
    enabled BOOLEAN DEFAULT true,
    description TEXT,
    max_tokens INTEGER DEFAULT 4096,
    supports_streaming BOOLEAN DEFAULT true,
    category VARCHAR(50) DEFAULT 'chat',
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Bảng API Keys (Đã tạo - Migration 005)
CREATE TABLE api_keys (
    id SERIAL PRIMARY KEY,
    provider VARCHAR(50) NOT NULL,
    key_name VARCHAR(255),
    encrypted_key TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, key_name)
);

**Lưu ý:** 
- Database schema đã hoàn chỉnh và đang hoạt động
- Có thể thêm bảng `chats` và `messages` sau nếu cần lưu chat history trên web
- Stripe fields có thể xóa sau khi migrate hết data sang Lemon Squeezy


PHẦN 3: BẢN VẼ KỸ THUẬT & CẤU TRÚC CODE (SYSTEM BLUEPRINT)

**TRẠNG THÁI:** Backend đã hoàn thành. Frontend website cần được tạo.

**Cấu trúc hiện tại (Backend - Đã hoàn thành):**

/backend
├── api/                        # Vercel Serverless Functions
│   ├── health.js               # Health check
│   ├── users/me.js             # Get current user
│   ├── subscription.js         # Subscription management (unified)
│   ├── usage/index.js          # Usage tracking
│   ├── models.js               # Get available models
│   ├── ai/call.js              # AI API proxy
│   ├── admin/add-api-key.js    # Admin: Add API keys
│   ├── webhooks/
│   │   └── lemon-squeezy.js    # Lemon Squeezy webhook handler
│   └── migrate.js              # Database migrations
│
├── src/                        # Core application code
│   ├── models/                 # Database models
│   │   ├── User.js
│   │   ├── Subscription.js
│   │   └── Usage.js
│   ├── lib/                    # Libraries
│   │   ├── db.js               # Database connection
│   │   ├── auth.js             # Google OAuth verification
│   │   ├── lemon-squeezy.js    # Lemon Squeezy integration
│   │   └── ai-providers/       # AI provider clients
│   ├── middleware/             # Express middleware
│   │   ├── auth.js
│   │   ├── cors.js
│   │   └── limits-enforcer.js
│   └── services/               # Business logic
│       ├── models-service.js
│       └── api-keys-service.js
│
└── migrations/                 # Database migrations (001-006)

**Cấu trúc cần tạo (Frontend - Next.js):**

/frontend (hoặc /web)
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Nhóm trang liên quan đến đăng nhập
│   │   ├── login/page.tsx      # Trang đăng nhập (Google OAuth)
│   │   └── callback/page.tsx   # Xử lý sau khi Google redirect về
│   │
│   ├── (marketing)/            # Nhóm trang giới thiệu (Landing page)
│   │   ├── layout.tsx          # Navbar + Footer cho khách
│   │   ├── page.tsx            # Trang chủ
│   │   ├── pricing/page.tsx    # Pricing page
│   │   ├── terms/page.tsx      # Terms of Service
│   │   └── privacy/page.tsx    # Privacy Policy
│   │
│   ├── (dashboard)/            # Nhóm trang nội bộ (User Dashboard)
│   │   ├── layout.tsx          # Chứa Sidebar + Auth Guard
│   │   ├── page.tsx            # Dashboard home (có thể là Chat)
│   │   ├── account/page.tsx    # Quản lý subscription
│   │   └── settings/page.tsx   # Cài đặt
│   │
│   ├── success/                # Success page sau checkout
│   │   └── page.tsx
│   │
│   └── api/                    # Next.js API Routes (nếu cần proxy)
│       └── auth/               # Auth helpers
│
├── components/                 # UI Components
│   ├── ui/                     # Shadcn components
│   ├── dashboard/              # Sidebar, SubscriptionCard...
│   └── marketing/              # Hero, Pricing tables...
│
├── lib/                        # Thư viện dùng chung
│   ├── api.ts                  # Backend API client
│   ├── auth.ts                 # Google OAuth helpers
│   └── utils.ts                # Hàm tiện ích
│
└── middleware.ts               # Auth guard middleware


2. Các File "Xương Sống" (Core Files Implementation)

A. middleware.ts (Bảo vệ Dashboard & Admin)

**Lưu ý:** Vì backend dùng Google OAuth trực tiếp (không dùng Supabase Auth), middleware cần verify token với backend.

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // 1. Bảo vệ route Dashboard/Account
  if (req.nextUrl.pathname.startsWith('/account')) {
    const token = req.cookies.get('auth_token')?.value
    
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    
    // Verify token với backend
    try {
      const response = await fetch(`${process.env.API_BASE_URL}/api/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!response.ok) {
        return NextResponse.redirect(new URL('/login', req.url))
      }
    } catch (error) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  // 2. Bảo vệ route Admin
  if (req.nextUrl.pathname.startsWith('/admin')) {
    const token = req.cookies.get('auth_token')?.value
    
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    
    // Verify token và check admin role
    try {
      const response = await fetch(`${process.env.API_BASE_URL}/api/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!response.ok) {
        return NextResponse.redirect(new URL('/login', req.url))
      }
      
      const user = await response.json()
      // Check admin role (có thể check email hoặc role field trong database)
      if (user.email !== 'admin@besideai.work') {
        return NextResponse.redirect(new URL('/account', req.url))
      }
    } catch (error) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/account/:path*', '/admin/:path*'],
}
```


B. Backend API Endpoints (Đã hoàn thành)

**Extension kết nối với Backend qua các endpoints:**

1. **GET /api/users/me** - Get current user info
   - Extension gửi Google OAuth token trong Authorization header
   - Backend verify token và trả về user info

2. **GET /api/subscription/status** - Get subscription status
   - Trả về tier, status, limits của user

3. **GET /api/models** - Get available AI models
   - Trả về danh sách models theo tier của user

4. **POST /api/ai/call** - AI API proxy
   - Extension gửi request, backend gọi AI provider và trả về kết quả
   - Backend quản lý API keys, không expose ra client

5. **GET /api/usage** - Get usage statistics
   - Trả về usage data (tokens, requests, etc.)

**Lưu ý:** Extension hiện tại đã tích hợp với các endpoints này. Frontend website cần tích hợp tương tự.


C. Frontend Authentication Flow (Cần implement)

**Vì backend dùng Google OAuth trực tiếp (không dùng Supabase Auth), frontend cần:**

1. **Google OAuth Login Flow:**
   - User click "Login with Google" → Redirect đến Google OAuth
   - Google redirect về `/auth/callback` với code
   - Frontend exchange code lấy access token
   - Lưu token vào cookie/localStorage
   - Gọi `GET /api/users/me` với token để verify và get user info

2. **API Client Implementation:**
```typescript
// lib/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://besideai.work'

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken() // Get từ cookie/localStorage
  
  const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  
  if (!response.ok) {
    if (response.status === 401) {
      // Redirect to login
      window.location.href = '/login'
    }
    throw new Error(`API Error: ${response.statusText}`)
  }
  
  return response.json()
}
```

3. **Dashboard Layout với Auth Guard:**
```typescript
// app/(dashboard)/layout.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAuthToken } from '@/lib/auth'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getAuthToken()
    if (!token) {
      router.push('/login')
      return
    }
    
    // Verify token với backend
    fetch('/api/users/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (res.ok) {
          setIsAuthenticated(true)
        } else {
          router.push('/login')
        }
      })
      .finally(() => setLoading(false))
  }, [router])

  if (loading) return <div>Loading...</div>
  if (!isAuthenticated) return null

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1">{children}</main>
    </div>
  )
}
```


PHẦN 4: LỘ TRÌNH TRIỂN KHAI (ROADMAP)

**TRẠNG THÁI:** Backend đã hoàn thành. Cần tập trung vào Frontend.

**Giai đoạn 1: Setup Frontend Project (Tuần 1) - ⏳ ĐANG CẦN**

✅ Đã hoàn thành:
- Backend API đã sẵn sàng
- Database schema đã setup
- Lemon Squeezy integration đã hoàn thành
- Extension đã có sẵn

⏳ Cần làm:
- Khởi tạo dự án Next.js 14 với Shadcn/UI
- Setup Google OAuth flow (không dùng Supabase Auth)
- Tạo API client để gọi backend
- Dựng Layout cơ bản:
  - Landing Page (Public) - `/`
  - Dashboard Layout (Protected) - `/account`
  - Success Page - `/success`
  - Terms & Privacy - `/terms`, `/privacy`

**Giai đoạn 2: Subscription Management (Tuần 2) - ⏳ ĐANG CẦN**

✅ Đã hoàn thành:
- Backend subscription endpoints đã sẵn sàng
- Lemon Squeezy webhook handler đã có
- Database migrations đã chạy

⏳ Cần làm:
- Setup Lemon Squeezy Webhook trong dashboard (Task #1 từ SUMMARY.md)
- Tạo trang Account/Dashboard (`/account`):
  - Hiển thị subscription status
  - Nút "Upgrade" → redirect đến Lemon Squeezy checkout
  - Nút "Manage Subscription" → redirect đến Lemon Squeezy portal
  - Nút "Cancel Subscription"
  - Hiển thị usage statistics
- Tích hợp với backend API:
  - `GET /api/subscription/status`
  - `POST /api/subscription/upgrade`
  - `POST /api/subscription/cancel`
  - `POST /api/subscription/portal`
  - `GET /api/usage`

**Giai đoạn 3: Landing Page & Marketing (Tuần 2-3) - ⏳ ĐANG CẦN**

⏳ Cần làm:
- Tạo Landing Page (`/`):
  - Hero section giới thiệu BesideAI
  - Features section
  - Pricing table (Professional, Premium)
  - Call-to-action buttons
  - Footer với links (Terms, Privacy, Contact)
- Tạo Pricing Page (`/pricing`):
  - Chi tiết các gói
  - So sánh features
  - Nút "Get Started" → redirect đến login/checkout
- Tạo Terms & Privacy pages:
  - `/terms` - Terms of Service
  - `/privacy` - Privacy Policy
- Deploy lên Vercel (cùng domain với backend: `besideai.work`)

**Giai đoạn 4: Testing & Integration (Tuần 3) - ⏳ ĐANG CẦN**

⏳ Cần làm:
- Test Google OAuth flow end-to-end
- Test subscription checkout flow:
  - User click upgrade → redirect Lemon Squeezy
  - Complete payment → webhook received
  - Subscription activated → verify trong database
- Test subscription management:
  - Cancel subscription
  - Portal access
  - Usage display
- Update Extension URLs:
  - Update `UserMenu.js` → redirect đến `/account`
  - Update `TokenUsageMenu.js` → redirect đến `/account?action=upgrade`

**Giai đoạn 5: Admin Dashboard (Tuần 4) - ⏳ OPTIONAL**

⏳ Có thể làm sau:
- Tạo trang `/admin` (chỉ admin mới vào được)
- Hiển thị thống kê:
  - Tổng số users
  - Subscription statistics
  - Usage analytics
  - Revenue (từ Lemon Squeezy)
- Admin features:
  - Manage API keys (đã có endpoint `/api/admin/add-api-key`)
  - Manage models (có thể thêm UI)
  - View user details

**Giai đoạn 6: Chat Interface (Tuần 5+) - ⏳ OPTIONAL**

⏳ Có thể làm sau nếu cần:
- Tạo Chat interface trên web (tương tự Extension)
- Lưu chat history vào database (cần thêm bảng `chats` và `messages`)
- Sync chat history giữa Extension và Web

---

## 🎯 PRIORITY HIỆN TẠI

**HIGH PRIORITY (Cần làm ngay):**
1. ✅ Setup Lemon Squeezy Webhook (Task #1)
2. ⏳ Tạo Frontend website với Next.js (Task #2)
3. ⏳ Tích hợp subscription management (Task #3)

**MEDIUM PRIORITY:**
4. ⏳ Test checkout flow (Task #4)
5. ⏳ Update Extension URLs (Task #5)

**LOW PRIORITY (Có thể làm sau):**
6. ⏳ Admin dashboard
7. ⏳ Chat interface trên web
8. ⏳ Monitoring & Logging
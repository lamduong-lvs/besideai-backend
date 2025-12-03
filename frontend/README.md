# BesideAI Frontend

Frontend website cho BesideAI, được xây dựng với Next.js 14 (App Router), TypeScript, và Tailwind CSS.

## Tính năng

- Landing page với hero section, features, và pricing table
- Trang pricing chi tiết với FAQ
- Trang account để quản lý subscription
- Google OAuth authentication (đang hoàn thiện)
- Terms of Service và Privacy Policy pages
- Responsive design với dark mode support

## Getting Started

### Development

```bash
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) để xem kết quả.

### Build

```bash
npm run build
npm start
```

## Environment Variables

Tạo file `.env.local` với các biến sau:

```env
NEXT_PUBLIC_API_URL=https://besideai.work
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
NEXT_PUBLIC_GOOGLE_REDIRECT_URI=http://localhost:3000/callback
```

## Cấu trúc thư mục

```
app/
  (auth)/          # Authentication pages (login, callback)
  (dashboard)/     # Protected dashboard pages (account, settings)
  (marketing)/     # Public marketing pages (home, pricing)
  terms/           # Terms of Service
  privacy/         # Privacy Policy
  success/         # Success page sau checkout
lib/               # Utilities (API client, auth helpers)
```

## Deployment trên Vercel

### Bước 1: Push code lên Git

```bash
git add .
git commit -m "Add frontend Next.js app"
git push origin main
```

### Bước 2: Deploy trên Vercel

1. Truy cập [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import repository từ Git
4. Cấu hình:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### Bước 3: Environment Variables

Thêm các biến môi trường trong Vercel Dashboard:

- `NEXT_PUBLIC_API_URL`: `https://besideai.work`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: Google OAuth Client ID
- `NEXT_PUBLIC_GOOGLE_REDIRECT_URI`: `https://besideai.work/callback`

### Bước 4: Configure Domain

1. Vào Project Settings → Domains
2. Thêm domain `besideai.work`
3. Cấu hình DNS records theo hướng dẫn của Vercel
4. Đợi DNS propagation (có thể mất vài phút đến vài giờ)

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Next.js Deployment](https://nextjs.org/docs/app/building-your-application/deploying)

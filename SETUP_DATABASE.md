# Database Setup Guide

## ✅ Connection String Received

Bạn đã có connection string:
```
postgresql://postgres:Dv007009##@@@db.gvllnfqmddsqqjybxczz.supabase.co:5432/postgres
```

## 📝 Bước 1: Tạo file .env

Tạo file `.env` trong thư mục `backend/` với nội dung:

```env
NODE_ENV=development
PORT=3000

# Database Configuration
DATABASE_URL=postgresql://postgres:Dv007009##@@@db.gvllnfqmddsqqjybxczz.supabase.co:5432/postgres

# Google OAuth (sẽ thêm sau)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Stripe (sẽ thêm sau)
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret

# CORS
CORS_ORIGIN=chrome-extension://your-extension-id

# API
API_BASE_URL=https://besideai.work

# Cron
CRON_SECRET=your-random-secret
```

**Lưu ý:** File `.env` đã được thêm vào `.gitignore`, không commit lên Git.

## 🧪 Bước 2: Test Connection

Sau khi tạo file `.env`, test connection:

```bash
npm run test-connection
```

Expected output:
```
[Test] Testing database connection...
[Test] DATABASE_URL: Set ✓
[Test] ✅ Database connection successful!
[Test] Current time: 2025-01-01T00:00:00.000Z
[Test] PostgreSQL version: PostgreSQL 15.x
[Test] ⚠️  No tables found. Run migrations: npm run migrate
```

## 🗄️ Bước 3: Run Migrations

Nếu connection thành công, chạy migrations để tạo tables:

```bash
npm run migrate
```

Expected output:
```
[Migrations] Starting database migrations...
[Migrations] Running 001_create_users_table.sql...
[Migrations] ✓ 001_create_users_table.sql completed
[Migrations] Running 002_create_subscriptions_table.sql...
[Migrations] ✓ 002_create_subscriptions_table.sql completed
[Migrations] Running 003_create_usage_table.sql...
[Migrations] ✓ 003_create_usage_table.sql completed
[Migrations] All migrations completed successfully!
```

## ✅ Bước 4: Verify Tables

Sau khi migrations chạy xong, verify lại:

```bash
npm run test-connection
```

Expected output:
```
[Test] ✅ Database connection successful!
[Test] ✅ Found tables: subscriptions, usage, users
```

Hoặc kiểm tra trong Supabase Dashboard:
1. Vào Supabase Dashboard
2. Table Editor
3. Kiểm tra có 3 tables: `users`, `subscriptions`, `usage`

## 🚨 Troubleshooting

### Connection Failed

**Error: password authentication failed**
- Kiểm tra lại password trong connection string
- Đảm bảo không có khoảng trắng thừa

**Error: getaddrinfo ENOTFOUND**
- Kiểm tra hostname trong connection string
- Kiểm tra network connection

**Error: timeout**
- Kiểm tra firewall settings
- Kiểm tra Supabase project có active không

### Migration Failed

**Error: relation already exists**
- Tables đã tồn tại, có thể skip hoặc drop và tạo lại

**Error: permission denied**
- Kiểm tra database user có quyền tạo tables không

## 📋 Next Steps

Sau khi database setup xong:
1. ✅ Test connection
2. ✅ Run migrations
3. ✅ Verify tables
4. ⏭️ Setup Google OAuth
5. ⏭️ Setup Stripe
6. ⏭️ Deploy to Vercel


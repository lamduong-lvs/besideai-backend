# 🔧 Run Migrations Manually (Quick Fix)

Nếu Vercel chưa deploy code mới, bạn có thể chạy migrations trực tiếp trên Supabase:

## Step 1: Open Supabase SQL Editor

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **SQL Editor**
4. Click **New Query**

## Step 2: Run Migration 004 (Models Table)

Copy và paste nội dung file `migrations/004_create_models_table.sql` vào SQL Editor, sau đó click **Run**.

File này sẽ:
- Tạo `models` table
- Insert default models (GPT-4o, Claude, Gemini, etc.)

## Step 3: Run Migration 005 (API Keys Table)

Copy và paste nội dung file `migrations/005_create_api_keys_table.sql` vào SQL Editor, sau đó click **Run**.

File này sẽ:
- Tạo `api_keys` table
- Setup indexes và triggers

## Step 4: Verify

Chạy query sau để verify:

```sql
-- Check models table
SELECT COUNT(*) as model_count FROM models;
SELECT * FROM models WHERE enabled = true ORDER BY tier, priority DESC;

-- Check api_keys table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'api_keys';
```

## ✅ Success Criteria

- `models` table exists với ít nhất 8 models
- `api_keys` table exists với đúng structure
- Không có lỗi khi chạy SQL

---

**Sau khi chạy xong, tiếp tục với Step 3: Add API Keys**


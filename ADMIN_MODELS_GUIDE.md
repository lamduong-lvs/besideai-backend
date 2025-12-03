# 📘 Hướng Dẫn Admin: Quản Lý Models và Default Model

## 🎯 Tổng Quan

Admin có thể quản lý AI models và set default model cho Extension thông qua:
1. **Admin API** - REST API endpoints
2. **SQL Scripts** - Trực tiếp trong database
3. **Priority System** - Set default model thông qua priority

---

## 📋 Cấu Trúc Models Table

Models được lưu trong table `models` với các fields:

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | VARCHAR(100) | Model ID (unique) | `gpt-4o` |
| `name` | VARCHAR(255) | Display name | `GPT-4o` |
| `provider` | VARCHAR(50) | Provider ID | `openai`, `anthropic`, `google`, `groq` |
| `provider_name` | VARCHAR(255) | Provider display name | `OpenAI` |
| `tier` | VARCHAR(20) | Subscription tier | `free`, `pro`, `premium` |
| `priority` | INTEGER | Display priority | `20` (higher = shown first) |
| `enabled` | BOOLEAN | Enable/disable | `true` |
| `description` | TEXT | Model description | `Most capable model` |
| `max_tokens` | INTEGER | Max tokens | `16384` |
| `supports_streaming` | BOOLEAN | Supports streaming | `true` |
| `category` | VARCHAR(50) | Model category | `llm`, `tts`, `image`, `video`, `coding` |
| `config` | JSONB | Additional config | `{"temperature": 0.7}` |

---

## 🔧 Cách 1: Sử dụng Admin API

### 1.1. Add New Model

**Endpoint:** `POST /api/admin/models`

**Request:**
```bash
curl -X POST https://your-backend-url.vercel.app/api/admin/models \
  -H "Authorization: Bearer YOUR_GOOGLE_OAUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "gpt-4o",
    "name": "GPT-4o",
    "provider": "openai",
    "providerName": "OpenAI",
    "tier": "pro",
    "priority": 20,
    "enabled": true,
    "description": "Most capable GPT-4 model",
    "maxTokens": 16384,
    "supportsStreaming": true,
    "category": "llm",
    "config": {
      "temperature": 0.7,
      "defaultMaxTokens": 4000
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "model": {
    "id": "gpt-4o",
    "name": "GPT-4o",
    "provider": "openai",
    "providerName": "OpenAI",
    "tier": "pro",
    "priority": 20,
    "enabled": true,
    "description": "Most capable GPT-4 model",
    "maxTokens": 16384,
    "supportsStreaming": true,
    "category": "llm",
    "config": {
      "temperature": 0.7,
      "defaultMaxTokens": 4000
    },
    "createdAt": "2025-01-15T10:00:00Z",
    "updatedAt": "2025-01-15T10:00:00Z"
  },
  "message": "Model created successfully"
}
```

### 1.2. Update Model

**Endpoint:** `PUT /api/admin/models/:id`

**Request:**
```bash
curl -X PUT https://your-backend-url.vercel.app/api/admin/models/gpt-4o \
  -H "Authorization: Bearer YOUR_GOOGLE_OAUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "priority": 30,
    "tier": "premium"
  }'
```

### 1.3. Disable Model

**Endpoint:** `DELETE /api/admin/models/:id`

**Request:**
```bash
curl -X DELETE https://your-backend-url.vercel.app/api/admin/models/old-model-id \
  -H "Authorization: Bearer YOUR_GOOGLE_OAUTH_TOKEN"
```

### 1.4. List All Models

**Endpoint:** `GET /api/admin/models`

**Request:**
```bash
curl -X GET https://your-backend-url.vercel.app/api/admin/models \
  -H "Authorization: Bearer YOUR_GOOGLE_OAUTH_TOKEN"
```

---

## 🔧 Cách 2: Sử dụng SQL Scripts

### 2.1. Add Model bằng SQL

Sử dụng file `backend/scripts/add-model.sql` hoặc chạy SQL trực tiếp:

```sql
INSERT INTO models (
    id,
    name,
    provider,
    provider_name,
    tier,
    priority,
    enabled,
    description,
    max_tokens,
    supports_streaming,
    category,
    config
) VALUES (
    'gpt-4o',
    'GPT-4o',
    'openai',
    'OpenAI',
    'pro',
    20,
    true,
    'Most capable GPT-4 model',
    16384,
    true,
    'llm',
    '{"temperature": 0.7, "defaultMaxTokens": 4000}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    priority = EXCLUDED.priority,
    updated_at = CURRENT_TIMESTAMP;
```

### 2.2. Update Model Priority (Set Default Model)

**Default model được chọn từ model có priority cao nhất trong tier.**

Ví dụ: Set GPT-4o làm default cho free tier:

```sql
-- Set priority cao nhất cho model muốn làm default
UPDATE models
SET priority = 100
WHERE id = 'gpt-4o' AND tier = 'free';

-- Hoặc set priority thấp hơn cho các model khác
UPDATE models
SET priority = 10
WHERE tier = 'free' AND id != 'gpt-4o';
```

---

## 🎯 Set Default Model cho Extension

### Cách hoạt động:

1. **Default model được chọn tự động** từ model có **priority cao nhất** trong tier của user
2. **Extension sẽ fetch** default model từ `/api/models` khi:
   - User cài Extension lần đầu
   - User chưa có preferred model

### Các bước set default model:

#### Bước 1: Xác định tier
- `free` - Free tier users
- `pro` - Professional tier users  
- `premium` - Premium tier users

#### Bước 2: Set priority cho model muốn làm default

**Ví dụ: Set GPT-4o làm default cho free tier**

```sql
-- Option 1: Set priority cao nhất
UPDATE models
SET priority = 100
WHERE id = 'gpt-4o' AND tier = 'free';

-- Option 2: Set priority thấp hơn cho các model khác
UPDATE models
SET priority = 10
WHERE tier = 'free' AND id != 'gpt-4o';
```

**Hoặc dùng API:**

```bash
curl -X PUT https://your-backend-url.vercel.app/api/admin/models/gpt-4o \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"priority": 100}'
```

#### Bước 3: Verify

Test API endpoint:
```bash
curl https://your-backend-url.vercel.app/api/models?tier=free
```

Response sẽ có:
```json
{
  "success": true,
  "defaultModel": "gpt-4o",  // Model có priority cao nhất
  "models": [...]
}
```

---

## 📝 Categories

Models được phân loại theo `category`:

- **`llm`** - Large Language Models (chat, text generation)
- **`tts`** - Text-to-Speech
- **`image`** - Image generation
- **`video`** - Video generation
- **`coding`** - Code generation

---

## 🔐 Authentication

Admin API yêu cầu Google OAuth token:

1. Login vào Extension với Google account
2. Lấy token từ Extension storage hoặc Chrome DevTools
3. Sử dụng token trong `Authorization: Bearer` header

**Lưu ý:** Hiện tại bất kỳ authenticated user nào cũng có thể quản lý models. Nên thêm admin role check sau.

---

## 📚 Examples

### Example 1: Add GPT-4o cho Premium tier

```bash
curl -X POST https://your-backend-url.vercel.app/api/admin/models \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "gpt-4o-premium",
    "name": "GPT-4o Premium",
    "provider": "openai",
    "providerName": "OpenAI",
    "tier": "premium",
    "priority": 30,
    "enabled": true,
    "description": "Premium GPT-4o model",
    "maxTokens": 16384,
    "supportsStreaming": true,
    "category": "llm",
    "config": {
      "temperature": 0.7,
      "defaultMaxTokens": 8000
    }
  }'
```

### Example 2: Set Default Model cho Free tier

```sql
-- Set GPT-3.5 Turbo làm default (priority cao nhất)
UPDATE models
SET priority = 100
WHERE id = 'gpt-3.5-turbo' AND tier = 'free';

-- Set các model khác priority thấp hơn
UPDATE models
SET priority = 10
WHERE tier = 'free' AND id != 'gpt-3.5-turbo';
```

### Example 3: Disable Model

```bash
curl -X DELETE https://your-backend-url.vercel.app/api/admin/models/old-model \
  -H "Authorization: Bearer TOKEN"
```

---

## ✅ Checklist

- [ ] Model được add vào database với đúng tier
- [ ] Priority được set đúng (cao nhất = default)
- [ ] Category được set đúng (llm, tts, image, video, coding)
- [ ] Config được set đúng (temperature, maxTokens)
- [ ] Test API endpoint `/api/models?tier=free` để verify default model
- [ ] Test Extension để verify default model được load đúng

---

## 🐛 Troubleshooting

### Model không hiển thị trong Extension

1. Check `enabled = true`
2. Check tier mapping trong `models-service.js`
3. Check Extension có fetch từ `/api/models` không

### Default model không đúng

1. Check priority của model (phải cao nhất trong tier)
2. Check tier của user
3. Check Extension có cache không (reload Extension)

### API trả về 401

1. Check Google OAuth token còn valid không
2. Check token được gửi đúng trong header không

---

## 📞 Support

Nếu có vấn đề, check:
- Backend logs trong Vercel Dashboard
- Database connection
- API routes trong `vercel.json`


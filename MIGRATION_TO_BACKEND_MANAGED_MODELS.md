# 🔄 Migration to Backend-Managed Models - Checklist

## 📋 Tổng Quan

Chuyển đổi từ **User-Managed API Keys** sang **Backend-Managed Models**:
- ❌ User không cần nhập API keys nữa
- ✅ Backend cung cấp danh sách models cho user chọn
- ✅ Backend quản lý API keys và routing requests
- ✅ Priority/preference settings từ backend
- ✅ Usage tracking và limits theo subscription tier

---

## 🎯 Phase 1: Backend API Endpoints

### 1.1 Models Management API

#### ✅ GET `/api/models`
**Purpose:** Lấy danh sách models available cho user

**Response:**
```json
{
  "success": true,
  "models": [
    {
      "id": "gpt-4o",
      "name": "GPT-4o",
      "provider": "openai",
      "providerName": "OpenAI",
      "tier": "pro", // free, pro, premium
      "priority": 1, // 1 = highest priority
      "enabled": true,
      "description": "Most capable model",
      "maxTokens": 4096,
      "supportsStreaming": true,
      "category": "chat" // chat, code, image, etc.
    },
    {
      "id": "claude-3-5-sonnet",
      "name": "Claude 3.5 Sonnet",
      "provider": "anthropic",
      "providerName": "Anthropic",
      "tier": "pro",
      "priority": 2,
      "enabled": true,
      "description": "Fast and capable",
      "maxTokens": 4096,
      "supportsStreaming": true,
      "category": "chat"
    }
  ],
  "defaultModel": "gpt-4o",
  "recommendedModels": ["gpt-4o", "claude-3-5-sonnet"]
}
```

**Implementation:**
- [ ] Tạo table `models` trong database
- [ ] Tạo endpoint `/api/models` trong `backend/api/models.js`
- [ ] Filter models theo user's subscription tier
- [ ] Sort theo priority
- [ ] Cache models list (optional)

#### ✅ GET `/api/models/:modelId`
**Purpose:** Lấy thông tin chi tiết của một model

**Response:**
```json
{
  "success": true,
  "model": {
    "id": "gpt-4o",
    "name": "GPT-4o",
    "provider": "openai",
    "tier": "pro",
    "priority": 1,
    "enabled": true,
    "config": {
      "temperature": 0.7,
      "maxTokens": 4096,
      "supportsStreaming": true
    }
  }
}
```

**Implementation:**
- [ ] Tạo endpoint `/api/models/:modelId`
- [ ] Validate model exists và user có quyền access

---

### 1.2 AI Call Proxy API

#### ✅ POST `/api/ai/call`
**Purpose:** Proxy AI requests, backend quản lý API keys

**Request:**
```json
{
  "model": "gpt-4o",
  "messages": [
    {"role": "user", "content": "Hello"}
  ],
  "options": {
    "temperature": 0.7,
    "maxTokens": 2000,
    "stream": true
  }
}
```

**Response (Streaming):**
```
data: {"type": "chunk", "content": "Hello"}
data: {"type": "chunk", "content": " there"}
data: {"type": "done", "tokens": {"input": 5, "output": 10, "total": 15}}
```

**Implementation:**
- [ ] Tạo endpoint `/api/ai/call` trong `backend/api/ai/call.js`
- [ ] Verify user authentication
- [ ] Check subscription tier và limits
- [ ] Route request đến đúng provider (OpenAI, Anthropic, etc.)
- [ ] Handle streaming responses
- [ ] Track usage
- [ ] Error handling và fallback

**Files to create:**
- [ ] `backend/api/ai/call.js`
- [ ] `backend/src/lib/ai-providers/openai.js`
- [ ] `backend/src/lib/ai-providers/anthropic.js`
- [ ] `backend/src/lib/ai-providers/google.js`
- [ ] `backend/src/lib/ai-providers/index.js`

---

### 1.3 Database Schema

#### ✅ Create `models` table
```sql
CREATE TABLE models (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  provider VARCHAR(50) NOT NULL, -- openai, anthropic, google, etc.
  provider_name VARCHAR(255) NOT NULL,
  tier VARCHAR(20) NOT NULL, -- free, pro, premium
  priority INTEGER DEFAULT 0, -- Higher = more priority
  enabled BOOLEAN DEFAULT true,
  description TEXT,
  max_tokens INTEGER DEFAULT 4096,
  supports_streaming BOOLEAN DEFAULT true,
  category VARCHAR(50) DEFAULT 'chat',
  config JSONB, -- Additional config (temperature, etc.)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_models_tier ON models(tier);
CREATE INDEX idx_models_enabled ON models(enabled);
CREATE INDEX idx_models_priority ON models(priority DESC);
```

**Implementation:**
- [ ] Tạo migration file `004_create_models_table.sql`
- [ ] Insert default models data
- [ ] Create indexes

#### ✅ Create `api_keys` table (Backend-managed)
```sql
CREATE TABLE api_keys (
  id SERIAL PRIMARY KEY,
  provider VARCHAR(50) NOT NULL, -- openai, anthropic, etc.
  key_name VARCHAR(255), -- Optional: name for this key
  encrypted_key TEXT NOT NULL, -- Encrypted API key
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_api_keys_provider ON api_keys(provider, is_active);
```

**Implementation:**
- [ ] Tạo migration file `005_create_api_keys_table.sql`
- [ ] Implement encryption/decryption utilities
- [ ] Create API key management functions

---

## 🎯 Phase 2: Backend Implementation

### 2.1 Models Management

#### ✅ Models Service
**File:** `backend/src/services/models-service.js`

**Functions:**
- [ ] `getAvailableModels(userId, tier)` - Get models for user
- [ ] `getModelById(modelId)` - Get model details
- [ ] `getDefaultModel(tier)` - Get default model for tier
- [ ] `getRecommendedModels(tier)` - Get recommended models

**Implementation:**
- [ ] Create `backend/src/services/models-service.js`
- [ ] Implement database queries
- [ ] Add caching (optional)

#### ✅ API Keys Management
**File:** `backend/src/services/api-keys-service.js`

**Functions:**
- [ ] `getApiKey(provider)` - Get active API key for provider
- [ ] `rotateApiKey(provider)` - Rotate API key
- [ ] `encryptKey(key)` - Encrypt API key
- [ ] `decryptKey(encryptedKey)` - Decrypt API key

**Implementation:**
- [ ] Create `backend/src/services/api-keys-service.js`
- [ ] Implement encryption using `crypto`
- [ ] Add key rotation logic

---

### 2.2 AI Providers Integration

#### ✅ OpenAI Provider
**File:** `backend/src/lib/ai-providers/openai.js`

**Functions:**
- [ ] `call(messages, options)` - Make OpenAI API call
- [ ] `stream(messages, options, callback)` - Streaming call
- [ ] `getModels()` - Get available OpenAI models

**Implementation:**
- [ ] Create OpenAI provider
- [ ] Handle streaming
- [ ] Error handling
- [ ] Token counting

#### ✅ Anthropic Provider
**File:** `backend/src/lib/ai-providers/anthropic.js`

**Functions:**
- [ ] `call(messages, options)` - Make Anthropic API call
- [ ] `stream(messages, options, callback)` - Streaming call
- [ ] `getModels()` - Get available Anthropic models

**Implementation:**
- [ ] Create Anthropic provider
- [ ] Handle streaming
- [ ] Error handling
- [ ] Token counting

#### ✅ Google AI Provider
**File:** `backend/src/lib/ai-providers/google.js`

**Functions:**
- [ ] `call(messages, options)` - Make Google AI API call
- [ ] `stream(messages, options, callback)` - Streaming call
- [ ] `getModels()` - Get available Google models

**Implementation:**
- [ ] Create Google AI provider
- [ ] Handle streaming
- [ ] Error handling
- [ ] Token counting

#### ✅ Provider Factory
**File:** `backend/src/lib/ai-providers/index.js`

**Functions:**
- [ ] `getProvider(providerName)` - Get provider instance
- [ ] `call(modelId, messages, options)` - Unified call interface
- [ ] `stream(modelId, messages, options, callback)` - Unified streaming

**Implementation:**
- [ ] Create provider factory
- [ ] Register all providers
- [ ] Unified error handling

---

### 2.3 Usage Tracking Enhancement

#### ✅ Update Usage Tracking
**File:** `backend/src/models/Usage.js`

**Enhancements:**
- [ ] Track model usage (which model was used)
- [ ] Track provider usage
- [ ] Track token usage per model
- [ ] Track cost per request (if applicable)

**Implementation:**
- [ ] Update `usage` table schema (add `model_id`, `provider`, `cost`)
- [ ] Update Usage model
- [ ] Update tracking logic

---

## 🎯 Phase 3: Extension Changes

### 3.1 Remove API Key Inputs

#### ✅ Update Settings UI
**Files:**
- `modules/panel/panel.html`
- `modules/panel/controllers/settings-controller.js`
- `setting/setting.html`
- `setting/services/model-settings.js`

**Changes:**
- [ ] Remove API key input fields
- [ ] Remove "Save API Key" buttons
- [ ] Remove API key validation
- [ ] Update UI to show "Backend-managed" message

**Implementation:**
- [ ] Comment out or remove API key inputs
- [ ] Add info message: "Models are managed by backend"
- [ ] Update settings controller

---

### 3.2 Models Selection UI

#### ✅ Create Models Selection Component
**File:** `modules/panel/components/ModelsSelector.js`

**Features:**
- [ ] Fetch models from `/api/models`
- [ ] Display models grouped by tier
- [ ] Show model priority/ranking
- [ ] Allow user to select default model
- [ ] Show recommended models
- [ ] Filter by category (chat, code, etc.)

**Implementation:**
- [ ] Create ModelsSelector component
- [ ] Add to settings panel
- [ ] Implement model selection logic
- [ ] Save selected model to storage

#### ✅ Update Model Selection Logic
**Files:**
- `utils/api.js`
- `modules/panel/controllers/settings-controller.js`
- `setting/services/model-settings.js`

**Changes:**
- [ ] Remove local model configs
- [ ] Fetch models from backend
- [ ] Update model selection dropdown
- [ ] Save selected model ID (not full config)

**Implementation:**
- [ ] Update `apiManager` to fetch from backend
- [ ] Update model selection UI
- [ ] Update storage structure

---

### 3.3 API Gateway Updates

#### ✅ Update PaidAPIHandler
**File:** `modules/api-gateway/paid-api-handler.js`

**Changes:**
- [ ] Remove API key handling
- [ ] Always use `/api/ai/call` endpoint
- [ ] Send model ID instead of full config
- [ ] Handle streaming responses

**Implementation:**
- [ ] Update `call()` method
- [ ] Update `callBackendAPI()` method
- [ ] Remove `getBackendURL()` (use default)
- [ ] Update error handling

#### ✅ Update FreeAPIHandler (Optional)
**File:** `modules/api-gateway/free-api-handler.js`

**Decision:**
- [ ] Keep free tier using local API keys? (BYOK)
- [ ] Or migrate free tier to backend too?

**If migrating free tier:**
- [ ] Update to use `/api/ai/call`
- [ ] Remove local API key handling

---

### 3.4 Remove Local API Key Storage

#### ✅ Clean Up Storage
**Files:**
- `utils/api.js`
- `modules/panel/controllers/settings-controller.js`
- `setting/services/model-settings.js`

**Changes:**
- [ ] Remove API key from `DEFAULT_CONFIGS`
- [ ] Remove API key from storage
- [ ] Remove API key validation
- [ ] Update migration script (optional)

**Implementation:**
- [ ] Update `apiManager` to not store API keys
- [ ] Clean up old API key data
- [ ] Update settings controllers

---

## 🎯 Phase 4: Migration & Testing

### 4.1 Data Migration

#### ✅ Migrate Existing Users
**Script:** `backend/scripts/migrate-to-backend-models.js`

**Tasks:**
- [ ] Identify users with local API keys
- [ ] Migrate selected models to backend preference
- [ ] Clear local API keys
- [ ] Set default model from backend

**Implementation:**
- [ ] Create migration script
- [ ] Test with sample users
- [ ] Run migration for all users

---

### 4.2 Testing

#### ✅ Backend Testing
- [ ] Test `/api/models` endpoint
- [ ] Test `/api/ai/call` with different models
- [ ] Test streaming responses
- [ ] Test error handling
- [ ] Test rate limiting
- [ ] Test usage tracking

#### ✅ Extension Testing
- [ ] Test models selection UI
- [ ] Test API calls through backend
- [ ] Test streaming responses
- [ ] Test error handling
- [ ] Test with different subscription tiers
- [ ] Test model switching

#### ✅ Integration Testing
- [ ] End-to-end flow: Select model → Make request → Receive response
- [ ] Test with multiple users
- [ ] Test concurrent requests
- [ ] Test rate limiting
- [ ] Test usage tracking

---

## 🎯 Phase 5: Documentation & Deployment

### 5.1 Documentation

#### ✅ Update Documentation
- [ ] Update `API_DOCUMENTATION.md` với new endpoints
- [ ] Update `SECURITY_AND_CONFIGURATION.md`
- [ ] Create `BACKEND_MANAGED_MODELS.md` guide
- [ ] Update user-facing documentation

---

### 5.2 Deployment

#### ✅ Backend Deployment
- [ ] Deploy database migrations
- [ ] Deploy new API endpoints
- [ ] Set up API keys in backend
- [ ] Configure models in database
- [ ] Test production endpoints

#### ✅ Extension Deployment
- [ ] Update extension code
- [ ] Test in development
- [ ] Deploy to Chrome Web Store
- [ ] Monitor for issues

---

## 📊 Implementation Priority

### High Priority (Must Have)
1. ✅ Backend `/api/models` endpoint
2. ✅ Backend `/api/ai/call` endpoint
3. ✅ Database schema (models, api_keys)
4. ✅ AI providers integration (OpenAI, Anthropic)
5. ✅ Extension models selection UI
6. ✅ Update PaidAPIHandler

### Medium Priority (Should Have)
1. ⏭️ Google AI provider
2. ⏭️ Models caching
3. ⏭️ Usage tracking enhancements
4. ⏭️ Error handling improvements
5. ⏭️ Rate limiting

### Low Priority (Nice to Have)
1. ⏭️ Model recommendations
2. ⏭️ Model analytics
3. ⏭️ A/B testing for models
4. ⏭️ Cost tracking
5. ⏭️ Model performance metrics

---

## 🔐 Security Considerations

### API Keys Management
- [ ] Encrypt API keys in database
- [ ] Use environment variables for encryption key
- [ ] Implement key rotation
- [ ] Monitor API key usage
- [ ] Set up alerts for unusual usage

### Rate Limiting
- [ ] Implement rate limiting per user
- [ ] Implement rate limiting per model
- [ ] Implement rate limiting per provider
- [ ] Handle rate limit errors gracefully

### Authentication
- [ ] Verify user authentication for all requests
- [ ] Check subscription tier before allowing model access
- [ ] Validate model access permissions
- [ ] Log all API calls for audit

---

## 📝 Notes

### Backward Compatibility
- [ ] Consider keeping BYOK (Bring Your Own Key) option for advanced users
- [ ] Or provide migration path for existing users
- [ ] Handle both old and new model selection methods during transition

### Performance
- [ ] Cache models list (TTL: 5-10 minutes)
- [ ] Use connection pooling for database
- [ ] Implement request queuing if needed
- [ ] Monitor response times

### Cost Management
- [ ] Track costs per model/provider
- [ ] Set up cost alerts
- [ ] Implement cost-based routing (use cheaper models when possible)
- [ ] Monitor API key usage

---

## ✅ Checklist Summary

### Backend (15 tasks)
- [ ] Models API endpoints (2)
- [ ] AI call proxy endpoint (1)
- [ ] Database migrations (2)
- [ ] Models service (1)
- [ ] API keys service (1)
- [ ] AI providers (3-4)
- [ ] Usage tracking updates (1)
- [ ] Testing (4-5)

### Extension (10 tasks)
- [ ] Remove API key inputs (3-4)
- [ ] Models selection UI (2)
- [ ] Update API gateway (2)
- [ ] Clean up storage (2)
- [ ] Testing (2-3)

### Deployment (5 tasks)
- [ ] Data migration (1)
- [ ] Backend deployment (2)
- [ ] Extension deployment (1)
- [ ] Documentation (1)

**Total: ~30 tasks**

---

**Created:** 2025-12-01  
**Status:** 📋 Planning Phase  
**Estimated Time:** 2-3 weeks


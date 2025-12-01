# 🚀 Migration Quick Reference

## 📋 Quick Checklist

### Phase 1: Backend APIs (Week 1)
- [ ] Create `models` table migration
- [ ] Create `api_keys` table migration  
- [ ] Implement `GET /api/models` endpoint
- [ ] Implement `POST /api/ai/call` endpoint
- [ ] Create OpenAI provider
- [ ] Create Anthropic provider

### Phase 2: Extension Updates (Week 2)
- [ ] Remove API key inputs from UI
- [ ] Create models selection component
- [ ] Update PaidAPIHandler to use `/api/ai/call`
- [ ] Update model selection logic
- [ ] Clean up local API key storage

### Phase 3: Testing & Deployment (Week 3)
- [ ] Test all endpoints
- [ ] Test extension integration
- [ ] Deploy backend changes
- [ ] Deploy extension update
- [ ] Monitor and fix issues

---

## 🔗 Key Files to Modify

### Backend
```
backend/
├── migrations/
│   ├── 004_create_models_table.sql
│   └── 005_create_api_keys_table.sql
├── api/
│   ├── models.js (NEW)
│   └── ai/
│       └── call.js (NEW)
├── src/
│   ├── services/
│   │   ├── models-service.js (NEW)
│   │   └── api-keys-service.js (NEW)
│   └── lib/
│       └── ai-providers/
│           ├── index.js (NEW)
│           ├── openai.js (NEW)
│           └── anthropic.js (NEW)
```

### Extension
```
modules/
├── api-gateway/
│   └── paid-api-handler.js (MODIFY)
├── panel/
│   ├── components/
│   │   └── ModelsSelector.js (NEW)
│   └── controllers/
│       └── settings-controller.js (MODIFY)
└── subscription/
    └── subscription-api-client.js (MODIFY)

utils/
└── api.js (MODIFY - remove API key handling)

setting/
├── setting.html (MODIFY - remove API key inputs)
└── services/
    └── model-settings.js (MODIFY)
```

---

## 🎯 Key Endpoints

### GET `/api/models`
Get available models for user based on subscription tier.

### POST `/api/ai/call`
Proxy AI requests, backend manages API keys.

**Request:**
```json
{
  "model": "gpt-4o",
  "messages": [...],
  "options": {...}
}
```

---

## 🔐 Environment Variables Needed

Add to Vercel:
```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...
ENCRYPTION_KEY=... (for encrypting API keys in DB)
```

---

## 📊 Database Tables

### `models`
- `id`, `name`, `provider`, `tier`, `priority`, `enabled`

### `api_keys`
- `id`, `provider`, `encrypted_key`, `is_active`

---

## ⚡ Quick Start

1. **Start with Backend:**
   - Create migrations
   - Create `/api/models` endpoint
   - Test with Postman/curl

2. **Then Extension:**
   - Update models selection UI
   - Update API gateway
   - Test integration

3. **Finally:**
   - Deploy backend
   - Deploy extension
   - Monitor

---

**See full details:** `MIGRATION_TO_BACKEND_MANAGED_MODELS.md`


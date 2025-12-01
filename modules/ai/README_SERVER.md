# Server Integration Guide

## Tổng quan

Extension hỗ trợ 2 chế độ thực thi AI:
1. **Local Mode** (mặc định): Thực thi trên extension, API keys lưu local
2. **Server Mode**: Gửi requests lên server, API keys lưu trên server

## Cấu hình Server Mode

### 1. Trong Extension Settings

1. Mở Settings → Chế độ Phản hồi
2. Bật toggle "Sử dụng Server (Bảo mật API Keys)"
3. Nhập Server URL (ví dụ: `https://api.example.com`)
4. (Tùy chọn) Bật "Tự động chuyển về Local nếu Server lỗi"
5. Click "Test Kết nối Server" để kiểm tra
6. Settings tự động lưu khi thay đổi

### 2. Server Configuration

Config được lưu trong `chrome.storage.local` với key `aiServerConfig`:

```javascript
{
  enabled: true,
  serverUrl: 'https://api.example.com',
  timeout: 60000,
  retryAttempts: 3,
  retryDelay: 1000,
  fallbackToLocal: true
}
```

## Server API Specification

### Endpoint: POST `/api/ai/execute`

**Request:**
```json
{
  "mode": "single" | "run-race" | "test-race",
  "messages": [
    {
      "role": "user" | "assistant" | "system",
      "content": "Message content",
      "images": ["base64 or url"] // Optional
    }
  ],
  "config": {
    "models": ["openai/gpt-4o", "anthropic/claude-3-5-sonnet"]
  }
}
```

**Response:**
```json
{
  "content": "AI response text",
  "providerId": "openai",
  "fullModelId": "openai/gpt-4o",
  "streamed": false
}
```

### Endpoint: POST `/api/ai/stream`

**Request:** (Same as `/execute` but with `stream: true`)

**Response:** Server-Sent Events (SSE)
```
data: {"chunk": "Hello"}
data: {"chunk": " world"}
data: {"chunk": "!"}
data: [DONE]
```

### Endpoint: GET `/health`

**Response:**
```json
{
  "status": "ok"
}
```

## Error Handling

### HTTP Status Codes

- `200`: Success
- `400`: Bad Request (invalid request format)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (server rejected request)
- `429`: Rate Limit Exceeded
- `500+`: Server Error

### Error Response Format

```json
{
  "error": "Error message",
  "message": "Detailed error message",
  "statusCode": 500
}
```

## Retry Logic

Server client tự động retry khi:
- Network errors (connection failed)
- Timeout errors
- 5xx server errors

**Retry behavior:**
- Max attempts: 3 (configurable)
- Delay: Exponential backoff (1s, 2s, 3s)
- Không retry cho 4xx errors (client errors)

## Fallback to Local

Khi `fallbackToLocal = true`:
- Nếu server không phản hồi → tự động chuyển về local execution
- Nếu server trả về error → tự động chuyển về local execution
- User không cần can thiệp

## Security Considerations

1. **API Keys**: Không bao giờ gửi API keys từ extension lên server
2. **Authentication**: Server nên implement authentication (API key, JWT, etc.)
3. **HTTPS**: Luôn dùng HTTPS cho server URL
4. **CORS**: Server cần config CORS để cho phép extension requests

## Testing

### Test Connection
```javascript
import { testServerConnection } from './modules/ai/config/server-config.js';

const result = await testServerConnection('https://api.example.com');
console.log(result.success ? 'Connected!' : result.error);
```

### Test Execution
```javascript
import { AIDispatcher } from './modules/ai/index.js';

const dispatcher = new AIDispatcher({...});
const result = await dispatcher.dispatch({
  mode: 'single',
  messages: [{ role: 'user', content: 'Hello' }],
  config: { models: ['openai/gpt-4o'] }
});
```

## Implementation Example (Node.js/Express)

```javascript
// Server example
app.post('/api/ai/execute', async (req, res) => {
  const { mode, messages, config } = req.body;
  
  // Validate request
  if (!mode || !messages || !config) {
    return res.status(400).json({ error: 'Invalid request' });
  }
  
  // Execute AI request (using your API keys)
  let result;
  if (mode === 'single') {
    result = await callAIProvider(config.models[0], messages);
  } else if (mode === 'run-race') {
    result = await raceAIProviders(config.models, messages);
  }
  
  // Return response
  res.json({
    content: result.content,
    providerId: result.providerId,
    fullModelId: result.fullModelId,
    streamed: false
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});
```

## Notes

- Server mode mặc định **disabled**
- Extension hoạt động bình thường khi server mode disabled
- Fallback to local đảm bảo reliability
- Server URL phải là valid HTTP/HTTPS URL


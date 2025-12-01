# AI Module

Module xử lý tất cả các yêu cầu AI trong extension, hỗ trợ nhiều chế độ vận hành và sẵn sàng cho việc chuyển sang server-side execution.

## Cấu trúc

```
modules/ai/
├── dispatcher.js              # Dispatcher tổng quản - điều phối các mode
├── modes/                     # Các chế độ vận hành
│   ├── single/               # Single mode - gọi 1 model
│   │   └── index.js
│   └── run-race/             # Run Race mode - gọi nhiều model, lấy kết quả nhanh nhất
│       └── index.js
├── adapters/                  # Adapters cho các provider
│   ├── base-adapter.js
│   ├── openai-adapter.js
│   ├── anthropic-adapter.js
│   ├── googleai-adapter.js
│   └── index.js
├── client/                    # Client interface
│   ├── base-client.js
│   ├── local-client.js       # Local execution (hiện tại)
│   └── server-client.js      # Server execution (tương lai)
└── utils/                     # Utilities
    ├── error-handler.js
    └── message-processor.js
```

## Sử dụng

### Khởi tạo Dispatcher

```javascript
import { AIDispatcher } from './modules/ai/index.js';
import { apiManager } from './utils/api.js';

const dispatcher = new AIDispatcher({
  apiManager: apiManager,
  getLang: (key, params) => Lang.get(key, params),
  debugLog: (tag, ...args) => console.log(`[${tag}]`, ...args)
});
```

### Single Mode

```javascript
const result = await dispatcher.dispatch({
  mode: 'single',
  messages: [
    { role: 'user', content: 'Hello' }
  ],
  config: {
    models: ['openai/gpt-4o']
  }
});

console.log(result.content); // AI response
```

### Run Race Mode

```javascript
const result = await dispatcher.dispatch({
  mode: 'run-race',
  messages: [
    { role: 'user', content: 'Hello' }
  ],
  config: {
    models: ['openai/gpt-4o', 'anthropic/claude-3-5-sonnet']
  }
});

console.log(result.content); // Response from fastest model
console.log(result.providerId); // Which provider won
```

### Streaming

```javascript
const result = await dispatcher.dispatch({
  mode: 'single',
  messages: [
    { role: 'user', content: 'Hello' }
  ],
  config: {
    models: ['openai/gpt-4o']
  },
  streamCallback: (message) => {
    if (message.type === 'chunk') {
      console.log('Chunk:', message.chunk);
    } else if (message.type === 'done') {
      console.log('Complete:', message.finalContent);
    }
  }
});
```

### Test Race Condition

```javascript
const results = await dispatcher.dispatch({
  mode: 'test-race',
  messages: [
    { role: 'user', content: 'Test message' }
  ],
  config: {
    models: ['openai/gpt-4o', 'anthropic/claude-3-5-sonnet', 'googleai/gemini-1.5-flash']
  }
});

// results is an array of test results with latency and status
results.forEach(result => {
  console.log(`${result.name}: ${result.latency}ms - ${result.status}`);
});
```

## Client Interface

### Local Client (hiện tại)

```javascript
import { LocalClient } from './modules/ai/index.js';

const client = new LocalClient(dispatcher);
const result = await client.execute('single', messages, config);
```

### Server Client (tương lai)

```javascript
import { ServerClient } from './modules/ai/index.js';

const client = new ServerClient('https://api.example.com/ai');
const result = await client.execute('single', messages, config);
```

## Thêm Mode Mới

Để thêm mode mới (ví dụ: TTS, Video, Image):

1. Tạo thư mục mới trong `modes/`:
   ```
   modes/tts/
   └── index.js
   ```

2. Implement mode handler:
   ```javascript
   export async function executeTTSMode(text, options) {
     // Implementation
   }
   ```

3. Thêm vào dispatcher:
   ```javascript
   case 'tts':
     return await this._dispatchTTS(messages, config, options);
   ```

## Lưu ý

- Tất cả các mode đều đi qua dispatcher để đảm bảo tính nhất quán
- Error handling được xử lý thống nhất qua `error-handler.js`
- Message processing được chuẩn hóa qua `message-processor.js`
- Adapters đảm bảo tương thích với các provider khác nhau


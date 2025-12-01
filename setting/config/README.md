# Provider Configuration

Cấu hình API cho các nhà cung cấp AI khác nhau.

## Cấu trúc

```
setting/config/
├── index.js                  # Export tất cả providers và utilities
├── types.js                  # Type definitions và validation
└── providers/                # Config cho từng provider
    ├── openai.js
    ├── anthropic.js
    ├── googleai.js
    ├── groq.js
    ├── cerebras.js
    ├── dify.js
    └── custom.js
```

## Sử dụng

### Lấy config của provider

```javascript
import { getProviderConfig, getDefaultProviderConfig } from './setting/config/index.js';

// Lấy config object
const openaiConfig = getProviderConfig('openai');

// Lấy default config
const defaultConfig = getDefaultProviderConfig('openai');
```

### Validate config

```javascript
import { validateProviderConfig } from './setting/config/index.js';

const result = validateProviderConfig('openai', {
  apiKey: 'sk-...',
  baseURL: 'https://api.openai.com/v1'
});

if (result.isValid) {
  console.log('Config is valid');
} else {
  console.error('Errors:', result.errors);
}
```

### Thêm provider mới

1. Tạo file mới trong `providers/`:
   ```javascript
   // providers/newprovider.js
   export const newproviderConfig = {
     providerId: 'newprovider',
     name: 'New Provider',
     type: 'openai-compatible',
     // ... config
   };
   ```

2. Export trong `index.js`:
   ```javascript
   import { newproviderConfig } from './providers/newprovider.js';
   
   export const PROVIDER_CONFIGS = {
     // ... existing
     newprovider: newproviderConfig
   };
   ```

## Cấu trúc Config

Mỗi provider config có các thuộc tính:

- `providerId`: ID duy nhất của provider
- `name`: Tên hiển thị
- `type`: Loại API (`openai-compatible`, `anthropic`, `google-ai`, `dify`)
- `defaultBaseURL`: URL mặc định
- `defaultModel`: Model mặc định
- `requiredFields`: Các trường bắt buộc
- `optionalFields`: Các trường tùy chọn
- `validation`: Hàm validation cho từng trường
- `getDefaultConfig()`: Hàm trả về config mặc định


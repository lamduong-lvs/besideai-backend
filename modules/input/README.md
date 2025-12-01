# Input Module - Module Mới

Module Input đơn giản, dễ bảo trì, không phức tạp, dễ nâng cấp.

## Cấu Trúc

```
modules/input/
├── index.js                 # Entry point - Export API
├── input-manager.js         # Singleton quản lý instances
├── input-instance.js        # Một instance input
├── config/
│   └── input-config.js      # Cấu hình cho các loại input
├── components/
│   ├── toolbar.js           # Toolbar component
│   ├── textarea.js          # Textarea component
│   ├── actions.js           # Actions component
│   ├── footer.js            # Footer component
│   └── attachments.js       # Attachments component
├── handlers/
│   ├── events.js            # Events handler
│   └── keyboard.js         # Keyboard handler (với @ và / support)
├── styles/
│   ├── input.css            # Base styles
│   ├── toolbar.css          # Toolbar styles
│   ├── textarea.css         # Textarea styles
│   ├── actions.css          # Actions styles
│   ├── footer.css           # Footer styles
│   └── attachments.css      # Attachments styles
└── templates/
    └── input-template.js    # Template loader
```

## Sử Dụng

### Khởi tạo Input

```javascript
import { inputManager } from './modules/input/index.js';

// Tạo input cho chat
const chatInput = inputManager.create('chat', 'chat-input-container', {
  onSubmit: (value) => {
    console.log('Submitted:', value);
  }
});

// Chuyển sang input khác
inputManager.switchTo('translate', 'translate-input-container');

// Lấy input hiện tại
const currentInput = inputManager.getCurrent();

// Lấy input theo containerId
const chatInput = inputManager.get('chat-input-container');
```

### API InputInstance

```javascript
// Lấy giá trị
const value = input.getValue();

// Đặt giá trị
input.setValue('New value');

// Focus
input.focus();

// Clear
input.clear();

// Show/Hide
input.show();
input.hide();

// Update model name
input.updateModelName('GPT-4');

// Update token usage
input.updateTokenUsage(100, 1000);

// Update gift count
input.updateGiftCount(5);
```

## Events

Module emit các events sau:

- `input:initialized` - Input đã được khởi tạo
- `input:submitted` - Input đã được submit
- `input:action-clicked` - Action button đã được click
- `input:toolbar-action` - Toolbar button đã được click
- `input:footer-action` - Footer button đã được click
- `input:mention` - @ mention được detect
- `input:command` - / command được detect
- `input:textarea-input` - Textarea input event
- `input:textarea-focus` - Textarea focus event
- `input:textarea-blur` - Textarea blur event

## Tính Năng

### Đã Có

- ✅ Toolbar với model selector, buttons
- ✅ Textarea với auto-resize
- ✅ Action buttons (Think, Deep Research, Mic, Send)
- ✅ Footer (Token, Gift, Upgrade, Heart, Help, Messages)
- ✅ Attachments (file upload, drag & drop)
- ✅ Keyboard shortcuts (Enter submit, Shift+Enter newline)
- ✅ @ mentions detection
- ✅ / commands detection

### Các Loại Input

- **chat**: Đầy đủ tính năng
- **translate**: Đơn giản, chỉ textarea và footer
- **pdfChat**: Toolbar, textarea, actions, footer
- **gmail**: Toolbar, textarea, actions, attachments

## Nguyên Tắc Thiết Kế

1. **Đơn giản**: Một file = Một trách nhiệm
2. **Dễ bảo trì**: Code rõ ràng, comment đầy đủ
3. **Không phức tạp**: Không có state management phức tạp
4. **Dễ nâng cấp**: API rõ ràng, components độc lập


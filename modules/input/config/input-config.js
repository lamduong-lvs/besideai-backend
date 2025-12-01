/**
 * Input Configuration
 * Cấu hình cho các loại input khác nhau
 */

export const InputConfig = {
  chat: {
    showToolbar: true,
    showActions: false, // Không còn actions area, buttons đã chuyển xuống footer
    showAttachments: true, // Enable attachments để có file input
    showFooter: true,
    toolbar: ['model', 'crop', 'attach', 'history', 'newChat'], // Thêm crop và attach vào toolbar
    actions: [], // Không còn actions, đã chuyển xuống footer
    footer: ['token', 'mic', 'send'], // Thêm mic và send vào footer
    placeholder: 'Hỏi bất cứ điều gì',
    storageKey: 'chatInputText',
    submitHandler: 'chatSubmit'
  },
  pdfChat: {
    showToolbar: true,
    showActions: false, // Không còn actions area, buttons đã chuyển xuống footer
    showAttachments: false,
    showFooter: true,
    toolbar: ['model', 'history', 'newChat'], // Model ở toolbar-left, history và newChat ở toolbar-right
    actions: [], // Không còn actions, đã chuyển xuống footer
    footer: ['token', 'mic', 'send'], // Thêm mic và send vào footer
    placeholder: 'Hỏi về tài liệu PDF...',
    storageKey: 'pdfChatInputText',
    submitHandler: 'pdfChatSubmit'
  },
  gmail: {
    showToolbar: true,
    showActions: true,
    showAttachments: true,
    showFooter: false,
    toolbar: ['model', 'crop', 'attach', 'history', 'newChat'],
    actions: ['think', 'deepResearch', 'mic', 'send'],
    placeholder: 'Soạn email...',
    storageKey: 'gmailInputText',
    submitHandler: 'gmailCompose'
  }
};

// Cấu hình chung
export const CommonConfig = {
  maxTextareaHeight: 120,
  debounceTime: 300,
  animationDuration: 200,
  storageSyncInterval: 1000
};

// Cấu hình cho các action buttons
export const ActionButtonsConfig = {
  think: {
    id: 'thinkBtn',
    icon: '../../icons/svg/icon/Messages, Conversation/Chat Round Dots.svg',
    label: 'Suy nghĩ',
    tooltip: 'tooltips.panel.thinkBtn'
  },
  deepResearch: {
    id: 'deepResearchBtn',
    icon: '../../icons/svg/icon/Search/Magnifer Zoom In.svg',
    label: 'Deep Research',
    tooltip: 'tooltips.panel.deepResearchBtn'
  },
  mic: {
    id: 'micBtn',
    icon: null, // SVG inline
    label: 'Microphone',
    tooltip: 'tooltips.panel.micBtn'
  },
  send: {
    id: 'sendBtn',
    icon: '../../icons/svg/icon/Arrows Action/Send Square.svg',
    label: 'Gửi',
    tooltip: 'tooltips.panel.sendBtn'
  }
};

// Cấu hình cho toolbar buttons
export const ToolbarButtonsConfig = {
  model: {
    id: 'modelSelector',
    icon: null, // SVG inline
    label: 'Model',
    tooltip: 'tooltips.panel.modelSelector'
  },
  crop: {
    id: 'cropImageBtn',
    icon: '../../icons/svg/icon/Design, Tools/Crop.svg',
    label: 'Crop',
    tooltip: 'tooltips.panel.cropImageBtn'
  },
  attach: {
    id: 'attachBtn',
    icon: '../../icons/svg/icon/Messages, Conversation/Paperclip.svg',
    label: 'Attach',
    tooltip: 'tooltips.panel.attachBtn'
  },
  book: {
    id: 'bookBtn',
    icon: '../../icons/svg/icon/Essentional, UI/Book.svg',
    label: 'Knowledge Base',
    tooltip: 'tooltips.panel.bookBtn'
  },
  settings: {
    id: 'settingsBtn',
    icon: '../../icons/svg/icon/Settings/Settings.svg',
    label: 'Settings',
    tooltip: 'tooltips.panel.settingsBtn'
  },
  history: {
    id: 'historyBtn',
    icon: '../../icons/svg/icon/Time/History.svg',
    label: 'History',
    tooltip: 'tooltips.panel.historyBtn'
  },
  newChat: {
    id: 'newChatBtn',
    icon: '../../icons/svg/icon/Messages, Conversation/Pen New Square.svg',
    label: 'New Chat',
    tooltip: 'tooltips.panel.newChatBtn'
  },
  regenerate: {
    id: 'regenerateBtn',
    icon: null, // SVG inline
    label: 'Regenerate',
    tooltip: 'tooltips.panel.regenerateBtn'
  }
};


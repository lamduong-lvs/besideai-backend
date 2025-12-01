# 📄 PDF Chat - Complete Documentation

## 📋 Table of Contents
1. [Overview](#overview)
2. [Features](#features)
3. [User Guide](#user-guide)
4. [Technical Architecture](#technical-architecture)
5. [API Reference](#api-reference)
6. [Performance](#performance)
7. [Troubleshooting](#troubleshooting)
8. [FAQ](#faq)

---

## 🎯 Overview

**PDF Chat** is an AI-powered feature that allows users to upload PDF documents and have natural conversations with Google Gemini AI about the content. It supports document analysis, question answering, and exporting conversations to Google Docs or Sheets.

### Key Capabilities
- 📄 Upload and analyze PDF files (up to 50MB, 200 pages)
- 💬 Natural conversation with AI about document content
- 📊 Export conversations to Google Docs or Sheets
- 🌍 Multi-language support (Vietnamese & English)
- 🎨 Beautiful, responsive UI with dark mode
- ♿ Full accessibility support (ARIA)

---

## ✨ Features

### 1. PDF Upload & Analysis
- **Drag & Drop:** Simply drag PDF files onto the upload zone
- **Click to Upload:** Traditional file picker interface
- **Validation:** Automatic file type, size, and integrity checks
- **Progress Tracking:** Real-time progress indicators

### 2. AI Chat Interface
- **Powered by Gemini:** Uses Google's latest AI models
- **Context-Aware:** AI remembers the conversation
- **Markdown Support:** Rich text formatting in responses
- **History:** Chat history persists during session

### 3. Export Functionality
- **Google Docs:** Export full conversation with formatting
- **Google Sheets:** Export as structured data table
- **One-Click:** Direct links to created documents
- **OAuth Integration:** Secure Google API access

### 4. User Experience
- **4 UI States:** Not configured, Empty, Processing, Ready
- **Smooth Animations:** Polished transitions and effects
- **Error Handling:** User-friendly error messages
- **Responsive:** Works on all screen sizes

---

## 📖 User Guide

### Getting Started

#### Step 1: Configure Gemini API
1. Open Extension Settings (⚙️)
2. Navigate to "Gemini AI" section
3. Enter your Gemini API Key
   - Get free key at: https://aistudio.google.com/app/apikey
4. (Optional) Select PDF Chat model in "Cấu hình chung"

#### Step 2: Upload PDF
1. Click "PDF Chat" icon (7th in sidebar)
2. Click "Tải lên file PDF" or drag & drop
3. Wait for AI to analyze (10-30 seconds)
4. See welcome message when ready

#### Step 3: Chat
1. Type your question in the input box
2. Press Enter or click Send (📤)
3. AI responds based on PDF content
4. Continue conversation naturally

#### Step 4: Export (Optional)
1. Click "Xuất ra Word" for Google Doc
2. Or "Xuất ra Excel" for Google Sheet
3. Click "Mở file" in success notification
4. Document opens in new tab

### Supported Questions

**General:**
- "Tóm tắt tài liệu này"
- "What is this document about?"
- "Có bao nhiêu trang?"

**Specific:**
- "Tìm thông tin về [topic]"
- "Liệt kê các điểm chính"
- "Giải thích phần [section]"

**Analysis:**
- "So sánh [A] và [B]"
- "Trích xuất tất cả số liệu"
- "Tạo bảng tóm tắt"

---

## 🏗️ Technical Architecture

### Module Structure

```
modules/pdf-chat/
├── config/
│   └── pdf-chat-config.js       # Configuration & storage
├── core/
│   ├── pdf-processor.js         # File validation & base64 conversion
│   ├── pdf-gemini-client.js     # Gemini API communication
│   ├── pdf-chat-controller.js   # Main orchestration logic
│   └── pdf-export-handler.js    # Google Docs/Sheets export
├── ui/
│   ├── pdf-chat-ui.js           # UI rendering & state management
│   └── pdf-chat.css             # Styling & animations
├── storage/
│   └── pdf-storage.js           # Local storage management
├── pdf-chat.js                  # Module entry point
├── README.md                    # This file
├── TEST_PHASE2.md               # Phase 2 test plan
└── TEST_PHASE3.md               # Phase 3 test plan
```

### Data Flow

```
┌─────────────┐
│   User      │
│   Upload    │
└─────┬───────┘
      │
      ▼
┌─────────────────┐
│ PDFProcessor    │  ← Validate & Convert to base64
└─────┬───────────┘
      │
      ▼
┌─────────────────┐
│ PDFGeminiClient │  ← Send to Gemini API
└─────┬───────────┘
      │
      ▼
┌─────────────────┐
│ PDFChatUI       │  ← Render chat interface
└─────────────────┘
```

### Key Technologies
- **Chrome Extension API:** Manifest V3
- **Google Gemini AI:** 2.0 Flash & 1.5 Pro/Flash
- **Google APIs:** Docs, Sheets, Drive
- **Marked.js:** Markdown rendering
- **OAuth 2.0:** Secure authentication

---

## 🔧 API Reference

### PDFChatController

Main controller class managing the entire PDF chat workflow.

```javascript
const controller = new PDFChatController();
await controller.initialize();
```

**Methods:**
- `initialize()` - Setup controller and UI
- `handleFileUpload(file)` - Process uploaded PDF
- `handleSendMessage()` - Send chat message to AI
- `handleExportToDocs()` - Export to Google Docs
- `handleExportToSheets()` - Export to Google Sheets
- `handleDeletePDF()` - Clear PDF and chat history

### PDFProcessor

Handles PDF file validation and processing.

```javascript
const processor = new PDFProcessor();
const result = await processor.processFile(file);
```

**Methods:**
- `validateFile(file)` - Check file type, size, etc.
- `processFile(file)` - Convert PDF to base64
- `getFileDataForAPI()` - Get formatted data for Gemini
- `clear()` - Free memory

### PDFGeminiClient

Manages communication with Gemini API.

```javascript
const client = new PDFGeminiClient(apiKey, modelId);
await client.initializeWithPDF(pdfData);
const response = await client.chat(message);
```

**Methods:**
- `initializeWithPDF(pdfData)` - Send PDF to AI
- `chat(message)` - Send chat message
- `getChatHistory()` - Get conversation history
- `reset()` - Clear context and history

### PDFExportHandler

Handles export to Google Docs and Sheets.

```javascript
const exporter = new PDFExportHandler();
const result = await exporter.exportToDocs(pdfInfo, chatHistory);
```

**Methods:**
- `exportToDocs(pdfInfo, chatHistory)` - Create Google Doc
- `exportToSheets(pdfInfo, chatHistory)` - Create Google Sheet

---

## ⚡ Performance

### Optimization Features
- **Memory Management:** Automatic cleanup of base64 data
- **History Trimming:** Limits chat history to 100 messages
- **Lazy Loading:** Components loaded only when needed
- **RequestAnimationFrame:** Smooth scrolling and animations
- **Debouncing:** Input event optimization

### Performance Metrics
| Operation | Target | Typical |
|-----------|--------|---------|
| PDF Upload (10 pages) | < 10s | 5-8s |
| AI Response | < 5s | 2-4s |
| Export to Docs | < 15s | 8-12s |
| Memory Usage | < 100MB | 50-80MB |

### File Size Limits
- **Max File Size:** 50MB
- **Max Pages:** 200 pages (recommended)
- **Supported Format:** PDF only

---

## 🔧 Troubleshooting

### Common Issues

#### 1. "Gemini AI chưa được cấu hình"
**Problem:** No API key configured

**Solution:**
1. Open Settings
2. Add Gemini API Key
3. Save and return to PDF Chat

#### 2. PDF Upload Fails
**Problem:** File rejected or processing error

**Solutions:**
- Check file size < 50MB
- Verify file is valid PDF
- Try smaller/simpler PDF
- Check internet connection

#### 3. AI Not Responding
**Problem:** Chat message stuck

**Solutions:**
- Check API key is valid
- Verify internet connection
- Check Gemini API quota
- Try refreshing extension

#### 4. Export Fails
**Problem:** Cannot create Docs/Sheets

**Solutions:**
- Sign in to Google Account
- Grant permissions to extension
- Check Google API quotas
- Try exporting again

#### 5. Chat History Lost
**Problem:** Messages disappear

**Cause:** Session cleared or storage full

**Prevention:**
- Export important conversations
- Avoid deleting PDF prematurely
- Check storage quota

---

## ❓ FAQ

### General

**Q: Is my PDF data secure?**
A: PDFs are sent to Google Gemini API for processing. They are not stored on our servers. See Google's privacy policy for Gemini API.

**Q: Can I use this offline?**
A: No, internet connection required for AI processing.

**Q: What languages are supported?**
A: UI supports Vietnamese and English. AI (Gemini) supports 100+ languages for content.

### Features

**Q: Can I upload multiple PDFs?**
A: Currently one PDF at a time. V2 will support multiple PDFs.

**Q: Does it work with scanned PDFs?**
A: Yes! Gemini has built-in OCR capabilities.

**Q: Can I edit exported documents?**
A: Yes, exported Docs and Sheets are fully editable.

**Q: Is there a limit on questions?**
A: No hard limit, but history trimmed after 100 messages.

### Technical

**Q: Which Gemini model is best?**
A: Gemini 2.0 Flash (Experimental) is recommended for speed. Use 1.5 Pro for complex documents.

**Q: Can I use my own API key?**
A: Yes, configure in Settings. Get free key at Google AI Studio.

**Q: Does it support other AI models?**
A: Currently Gemini only (required for PDF processing).

---

## 📊 Limitations

### Current Limitations
1. **Single PDF:** One PDF per session
2. **File Size:** Max 50MB, 200 pages
3. **No Annotations:** Cannot highlight or annotate PDF
4. **Text Only:** No image generation in responses
5. **Session-Based:** History cleared on deletion

### Planned Enhancements (V2)
- Multi-PDF support
- PDF search and highlights
- Voice input for chat
- PDF comparison
- Cloud sync for history
- Custom export templates

---

## 🎓 Best Practices

### For Users
1. **Use clear questions:** Be specific about what you want to know
2. **Break down complex queries:** Ask one thing at a time
3. **Export important chats:** Save valuable conversations
4. **Check PDF quality:** Better quality = better results
5. **Use appropriate model:** Pro for complex, Flash for quick

### For Developers
1. **Memory management:** Always clear resources
2. **Error handling:** Provide helpful error messages
3. **Performance:** Monitor API usage and response times
4. **Testing:** Test with various PDF types and sizes
5. **Accessibility:** Maintain ARIA attributes

---

## 📞 Support

### Getting Help
- **Documentation:** Check this README first
- **Test Guides:** See TEST_PHASE2.md and TEST_PHASE3.md
- **Code:** Review inline comments in source files
- **Issues:** Check browser console for errors

### Contributing
1. Follow existing code style
2. Add tests for new features
3. Update documentation
4. Test thoroughly before submitting

---

## 📜 License & Credits

### Credits
- **AI:** Google Gemini
- **Markdown:** Marked.js
- **Icons:** Project icon set
- **Design:** Modern Material Design

### Version History
- **v1.0** - Initial release (Phases 1-5)
  - PDF upload and chat
  - Export to Docs/Sheets
  - Full i18n support
  - Accessibility features

---

**Last Updated:** 2025-11-21
**Version:** 1.0.0
**Status:** ✅ Production Ready


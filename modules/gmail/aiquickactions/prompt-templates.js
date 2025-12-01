/**
 * AI PROMPT TEMPLATES
 * Chứa các system prompts để AI phân tích email và đề xuất Events/Tasks
 *
 * *** PHIÊN BẢN CẬP NHẬT (i18n) ***
 * - Thay đổi CommonJS (module.exports) sang ES Module (export const) (Giữ nguyên)
 * - Yêu cầu AI tạo 'description' BẰNG HTML (Giữ nguyên)
 * - (MỚI) Prompts sẽ tự động yêu cầu AI trả về ngôn ngữ (ví dụ: Tiếng Việt, English)
 * dựa trên ngôn ngữ hiện tại của người dùng (window.Lang.getCurrentLanguage()).
 */

// *** SỬA LỖI: Thêm "export" vào đây ***
const PromptTemplates = {
  
  /**
   * Lấy thông tin ngôn ngữ hiện tại để chèn vào prompt
   * @returns {Object} Ví dụ: { code: 'vi', name: 'Tiếng Việt', promptTitle: 'Tiêu đề 100% Tiếng Việt' }
   */
  _getCurrentLanguageInfo: function() {
    // Fallback an toàn nếu i18n.js chưa tải
    if (!window.Lang || !window.Lang.get) {
      console.warn("PromptTemplates: window.Lang (i18n.js) chưa sẵn sàng. Dùng 'vi' làm mặc định.");
      return {
        code: 'vi',
        name: 'Tiếng Việt',
        // Thêm các key fallback thủ công
        promptTitle: 'Tiêu đề 100% Tiếng Việt',
        promptDescEvent: 'Nội dung email mời họp (bằng Tiếng Việt, HTML)',
        promptDescTask: 'Mô tả chi tiết công việc (bằng Tiếng Việt, HTML)'
      };
    }
    
    const langCode = window.Lang.getCurrentLanguage(); // 'vi', 'en', 'ja', v.v.
    
    // Lấy tên ngôn ngữ (ví dụ: "Tiếng Việt", "English")
    // Giả sử các file lang.json có key 'lang_vi', 'lang_en'
    const langName = window.Lang.get(`lang_${langCode.replace('-', '_')}`) || 'English';

    return {
      code: langCode,
      name: langName,
      // Lấy các chuỗi dịch cho prompt (ví dụ: "Title 100% in English")
      promptTitle: window.Lang.get('promptTitleInLang', { lang: langName }),
      promptDescEvent: window.Lang.get('promptDescInLangHTML', { lang: langName }),
      promptDescTask: window.Lang.get('promptTaskDescInLangHTML', { lang: langName })
    };
  },

  /**
   * Tạo prompt cho phân tích Events từ email
   * (Cập nhật i18n)
   */
  buildEventPrompt: function(emailData) {
    const { subject, body, sender, recipients, date, timezone } = emailData;
    const langInfo = this._getCurrentLanguageInfo();
    
    return `Bạn là AI chuyên phân tích email để trích xuất thông tin về các cuộc họp, sự kiện cần tạo Calendar Events.

EMAIL CONTENT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Subject: ${subject}
From: ${sender.name} <${sender.email}>
To: ${recipients.to.map(r => r.email).join(', ')}
${recipients.cc.length > 0 ? 'Cc: ' + recipients.cc.map(r => r.email).join(', ') : ''}
Date: ${date}

Content:
(Lưu ý: Nội dung dưới đây là toàn bộ lịch sử chuỗi email (email thread). Hãy đọc tất cả để hiểu ngữ cảnh)
${body}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

USER CONTEXT:
- Timezone: ${timezone}
- Current datetime: ${new Date().toISOString()}
- User email: ${recipients.to[0]?.email || 'unknown'}
- Ngôn ngữ yêu cầu (Request Language): ${langInfo.name}

NHIỆM VỤ:
Phân tích email và đề xuất các Calendar Events cần tạo. Trả về JSON array.

QUY TẮC:
1. Title (Tiêu đề) và Description (Mô tả) PHẢI 100% LÀ ${langInfo.name}.
2. Dữ liệu (ngày, giờ) trong 'description' phải khớp 100% với 'start', 'end'.
3. CHỈ đề xuất khi confidence > 70%.
4. Parse date/time thông minh (next Monday, tomorrow 2pm, v.v.).
5. Duration mặc định: 1 giờ cho meetings.
6. Attendees: auto-invite những người trong To/Cc.
7. Location: trích xuất từ email (Zoom link, địa chỉ, phòng họp).
8. Description (Mô tả) PHẢI là một NỘI DUNG EMAIL MỜI HỌP chuyên nghiệp, viết bằng ${langInfo.name} và ĐỊNH DẠNG BẰNG HTML.
   - PHẢI sử dụng các thẻ HTML như <p>, <strong>, <ul>, <li> để định dạng.
   - Nội dung phải HƯỚNG TỚI TƯƠNG LAI (mời họp), bao gồm: Lời chào, lý do/bối cảnh, nội dung chính.
   - Ví dụ (nội dung phải bằng ${langInfo.name}): "<p>Kính gửi anh/chị,</p><p>Trân trọng mời anh/chị tham gia buổi họp... để thảo luận về <strong>[Nội dung]</strong>.</p><ul><li>Nội dung 1</li><li>Nội dung 2</li></ul>"

OUTPUT FORMAT (JSON):
{
  "suggestions": [
    {
      "type": "event",
      "title": "(${langInfo.promptTitle})",
      "description": "<p>(${langInfo.promptDescEvent})</p>",
      "start": "2024-03-15T14:00:00+07:00",
      "end": "2024-03-15T15:00:00+07:00",
      "allDay": false,
      "attendees": ["email1@domain.com", "email2@domain.com"],
      "location": "Google Meet link hoặc địa chỉ",
      "confidence": 0.95,
      "source_text": "Đoạn email gốc: 'Let's meet next Friday at 2pm'"
    }
  ]
}

QUAN TRỌNG:
- Output CHỈ là JSON, không có text giải thích thêm
- Datetime PHẢI theo format ISO 8601
- Title và Description PHẢI bằng ${langInfo.name}.
- Nếu không tìm thấy, trả về: {"suggestions": []}
- Confidence < 0.7 thì KHÔNG đề xuất

Hãy phân tích và trả về JSON:`;
  },

  /**
   * Tạo prompt cho phân tích Tasks từ email
   * (Cập nhật i18n)
   */
  buildTaskPrompt: function(emailData) {
    const { subject, body, sender, recipients, date, timezone } = emailData;
    const langInfo = this._getCurrentLanguageInfo();
    
    return `Bạn là AI chuyên phân tích email để trích xuất các công việc cần làm (Tasks/To-do items).

EMAIL CONTENT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Subject: ${subject}
From: ${sender.name} <${sender.email}>
To: ${recipients.to.map(r => r.email).join(', ')}
Date: ${date}

Content:
(Lưu ý: Nội dung dưới đây là toàn bộ lịch sử chuỗi email (email thread). Hãy đọc tất cả để hiểu ngữ cảnh)
${body}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

USER CONTEXT:
- Timezone: ${timezone}
- Current datetime: ${new Date().toISOString()}
- User email: ${recipients.to[0]?.email || 'unknown'}
- Ngôn ngữ yêu cầu (Request Language): ${langInfo.name}

NHIỆM VỤ:
Phân tích email và đề xuất các Tasks cần tạo. Trả về JSON array.

QUY TẮC:
1. Title (Tiêu đề) và Description (Mô tả) PHẢI 100% LÀ ${langInfo.name}.
2. Dữ liệu (ngày, giờ) trong 'description' phải khớp 100% với 'due'.
3. CHỈ đề xuất Tasks khi có:
   - Action items rõ ràng: "please send", "review", "prepare", "check"
   - Deadlines: "by Friday", "before EOD", "ASAP"
4. Parse due date thông minh.
5. Priority detection (high, medium, low).
6. Ưu tiên tasks cho người nhận email (user).
7. Description (Mô tả) phải chi tiết, rõ ràng, viết bằng ${langInfo.name} và ĐỊNH DẠNG BẰNG HTML.
   - PHẢI sử dụng các thẻ HTML như <p>, <strong>, <ul>, <li>.
   - Tập trung vào HÀNH ĐỘNG CẦN THỰC HIỆN và MỤC TIÊU của task.

OUTPUT FORMAT (JSON):
{
  "suggestions": [
    {
      "type": "task",
      "title": "(${langInfo.promptTitle})",
      "description": "<p>(${langInfo.promptDescTask})</p><ul><li>...</li></ul>",
      "due": "2024-03-20T17:00:00+07:00",
      "priority": "high|medium|low",
      "confidence": 0.85,
      "source_text": "Đoạn email gốc: 'Please send me the Q1 report by next Wednesday'"
    }
  ]
}

QUAN TRỌNG:
- Title và Description PHẢI bằng ${langInfo.name}.
- Output CHỈ là JSON, không có text giải thích
- Due date theo format ISO 8601
- Nếu không có due date rõ ràng, đặt null
- Confidence < 0.7 thì KHÔNG đề xuất

Hãy phân tích và trả về JSON:`;
  },

  /**
   * Tạo prompt để dịch Tiêu đề/Mô tả
   * (Cập nhật i18n)
   */
  buildTranslationPrompt: function(title, description, targetLang = 'en') {
    // Lấy tên ngôn ngữ từ i18n
    const langName = (window.Lang && window.Lang.get) 
      ? window.Lang.get(`lang_${targetLang.replace('-', '_')}`) 
      : (targetLang === 'en' ? 'English' : 'Tiếng Việt'); // Fallback
    
    return `Bạn là AI dịch thuật chuyên nghiệp. Hãy dịch Tiêu đề (title) và Mô tả (description) dưới đây sang ${langName}.

YÊU CẦU:
1. Giữ nguyên định dạng HTML của 'description'.
2. Chỉ dịch phần nội dung text, không dịch thẻ HTML.
3. Trả về chính xác định dạng JSON.

NGÔN NGỮ ĐÍCH: ${langName}

INPUT (JSON):
{
  "title": "${title}",
  "description": "${description}"
}

OUTPUT (JSON):
{
  "title": "...",
  "description": "..."
}

Hãy bắt đầu dịch:`;
  },


  /**
   * Few-shot examples
   * (Không thay đổi - Đây là ví dụ cho AI, không cần dịch)
   */
  fewShotExamples: {
    event: `
EXAMPLE 1:
Email: "Hi team, let's sync up tomorrow at 2pm via Zoom. I'll send the link."
Output: {
  "suggestions": [{
    "type": "event",
    "title": "Team sync",
    "start": "2024-03-16T14:00:00+07:00",
    "end": "2024-03-16T15:00:00+07:00",
    "location": "Zoom",
    "confidence": 0.92
  }]
}

EXAMPLE 2:
Email: "Reminder: Annual company meeting on March 25th"
Output: {
  "suggestions": [{
    "type": "event",
    "title": "Annual company meeting",
    "start": "2024-03-25T09:00:00+07:00",
    "end": "2024-03-25T17:00:00+07:00",
    "allDay": true,
    "confidence": 0.88
  }]
}`,
    
    task: `
EXAMPLE 1:
Email: "Can you review the proposal and send feedback by Friday EOD?"
Output: {
  "suggestions": [{
    "type": "task",
    "title": "Review proposal and send feedback",
    "due": "2024-03-15T17:00:00+07:00",
    "priority": "medium",
    "confidence": 0.95
  }]
}

EXAMPLE 2:
Email: "URGENT: Please update the client dashboard ASAP"
Output: {
  "suggestions": [{
    "type": "task",
    "title": "Update client dashboard",
    "priority": "high",
    "confidence": 0.90
  }]
}`
  }
};

// *** SỬA LỖI: Xóa bỏ khối "if (typeof module !== 'undefined' && module.exports)" ***
// (Vì chúng ta đã dùng "export const" ở dòng 18)

// Thêm vào window object để đảm bảo nó có sẵn trong global scope
window.PromptTemplates = PromptTemplates;
/**
 * Script đơn giản để kiểm tra file JSON có hợp lệ không
 * Chạy: node scripts/verify-json.js
 */

const fs = require('fs');
const path = require('path');

const langFiles = ['lang/vi.json', 'lang/en.json'];

console.log('🔍 Đang kiểm tra tính hợp lệ của file JSON...\n');

let allValid = true;

for (const file of langFiles) {
  const filePath = path.join(__dirname, '..', file);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    const keys = Object.keys(data);
    console.log(`✅ ${file}: Hợp lệ (${keys.length} keys)`);
    
    // Kiểm tra các key quan trọng
    const importantKeys = [
      'logGmailInstanceCreated',
      'sidePanelTitle',
      'summarizingText',
      'chatPlaceholder',
      'closeBtnLabel',
      'sendBtnTitle',
      'lang_zh-CN',
      'lang_zh_CN'
    ];
    
    const missing = importantKeys.filter(k => !(k in data));
    if (missing.length > 0) {
      console.log(`   ⚠️  Thiếu keys: ${missing.join(', ')}`);
      allValid = false;
    } else {
      console.log(`   ✓ Tất cả keys quan trọng đều có`);
    }
  } catch (error) {
    console.error(`❌ ${file}: LỖI - ${error.message}`);
    allValid = false;
  }
}

console.log('\n' + '='.repeat(60));
if (allValid) {
  console.log('✅ TẤT CẢ FILE JSON ĐỀU HỢP LỆ!');
  process.exit(0);
} else {
  console.log('❌ CÓ LỖI TRONG FILE JSON!');
  process.exit(1);
}


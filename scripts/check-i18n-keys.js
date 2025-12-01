/**
 * Script để rà soát toàn bộ code và tìm các key i18n còn thiếu
 * Chạy: node scripts/check-i18n-keys.js
 */

const fs = require('fs');
const path = require('path');

// Đường dẫn thư mục gốc
const ROOT_DIR = path.join(__dirname, '..');
const LANG_DIR = path.join(ROOT_DIR, 'lang');

// Đọc các file ngôn ngữ
function loadLangFiles() {
  const langFiles = {};
  const files = fs.readdirSync(LANG_DIR).filter(f => f.endsWith('.json'));
  
  for (const file of files) {
    const langCode = file.replace('.json', '');
    const filePath = path.join(LANG_DIR, file);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      langFiles[langCode] = JSON.parse(content);
      console.log(`✓ Đã tải ${file} (${Object.keys(langFiles[langCode]).length} keys)`);
    } catch (error) {
      console.error(`✗ Lỗi khi đọc ${file}:`, error.message);
    }
  }
  
  return langFiles;
}

// Tìm tất cả các key được sử dụng trong code
function findUsedKeys(dir, extensions = ['.js', '.html']) {
  const usedKeys = new Set();
  const patterns = [
    // window.Lang.get('key')
    /window\.Lang\.get\(['"]([^'"]+)['"]/g,
    // Lang.get('key')
    /Lang\.get\(['"]([^'"]+)['"]/g,
    // getLang('key')
    /getLang\(['"]([^'"]+)['"]/g,
    // data-i18n="key"
    /data-i18n=['"]([^'"]+)['"]/g,
    // data-i18n-placeholder="key"
    /data-i18n-placeholder=['"]([^'"]+)['"]/g,
    // data-i18n-title="key"
    /data-i18n-title=['"]([^'"]+)['"]/g,
    // data-i18n-value="key"
    /data-i18n-value=['"]([^'"]+)['"]/g,
  ];

  function scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          usedKeys.add(match[1]);
        }
      }
    } catch (error) {
      // Bỏ qua lỗi đọc file
    }
  }

  function scanDirectory(dirPath) {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        // Bỏ qua node_modules, .git, và các thư mục không cần thiết
        if (entry.name.startsWith('.') || 
            entry.name === 'node_modules' || 
            entry.name === 'scripts' ||
            entry.name === 'lang') {
          continue;
        }
        
        if (entry.isDirectory()) {
          scanDirectory(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (extensions.includes(ext)) {
            scanFile(fullPath);
          }
        }
      }
    } catch (error) {
      // Bỏ qua lỗi đọc thư mục
    }
  }

  scanDirectory(dir);
  return usedKeys;
}

// So sánh keys
function compareKeys(usedKeys, langFiles) {
  const results = {};
  
  for (const [langCode, langKeys] of Object.entries(langFiles)) {
    const missing = [];
    const extra = [];
    
    // Tìm keys thiếu
    for (const usedKey of usedKeys) {
      if (!(usedKey in langKeys)) {
        missing.push(usedKey);
      }
    }
    
    // Tìm keys thừa (có trong file nhưng không dùng)
    for (const langKey of Object.keys(langKeys)) {
      if (!usedKeys.has(langKey)) {
        extra.push(langKey);
      }
    }
    
    results[langCode] = {
      missing: missing.sort(),
      extra: extra.sort(),
      total: Object.keys(langKeys).length,
      used: usedKeys.size
    };
  }
  
  return results;
}

// Main
console.log('🔍 Đang rà soát i18n keys...\n');

// 1. Tải các file ngôn ngữ
console.log('📂 Đang tải các file ngôn ngữ...');
const langFiles = loadLangFiles();
console.log('');

// 2. Tìm tất cả keys được sử dụng
console.log('🔎 Đang quét code để tìm các key được sử dụng...');
const usedKeys = findUsedKeys(ROOT_DIR);
console.log(`✓ Tìm thấy ${usedKeys.size} keys được sử dụng trong code\n`);

// 3. So sánh
console.log('📊 Đang so sánh...\n');
const results = compareKeys(usedKeys, langFiles);

// 4. Hiển thị kết quả
for (const [langCode, result] of Object.entries(results)) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📄 ${langCode}.json`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Tổng số keys: ${result.total}`);
  console.log(`Keys được sử dụng: ${result.used}`);
  console.log(`Keys thiếu: ${result.missing.length}`);
  console.log(`Keys thừa (không dùng): ${result.extra.length}`);
  
  if (result.missing.length > 0) {
    console.log(`\n❌ CÁC KEY THIẾU (${result.missing.length}):`);
    result.missing.forEach(key => {
      console.log(`   - "${key}"`);
    });
  }
  
  if (result.extra.length > 0 && result.extra.length < 50) {
    console.log(`\n⚠️  CÁC KEY THỪA (${result.extra.length} - có thể không dùng):`);
    result.extra.slice(0, 20).forEach(key => {
      console.log(`   - "${key}"`);
    });
    if (result.extra.length > 20) {
      console.log(`   ... và ${result.extra.length - 20} keys khác`);
    }
  }
}

// 5. Tạo file báo cáo JSON
const reportPath = path.join(ROOT_DIR, 'i18n-report.json');
const report = {
  timestamp: new Date().toISOString(),
  usedKeysCount: usedKeys.size,
  results: results
};

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\n\n📝 Đã tạo báo cáo chi tiết tại: ${reportPath}`);

// 6. Tổng kết
const allMissing = new Set();
for (const result of Object.values(results)) {
  result.missing.forEach(key => allMissing.add(key));
}

if (allMissing.size > 0) {
  console.log(`\n\n⚠️  TỔNG KẾT: Còn ${allMissing.size} keys thiếu trong ít nhất một file ngôn ngữ`);
  process.exit(1);
} else {
  console.log(`\n\n✅ TẤT CẢ CÁC KEY ĐỀU ĐÃ CÓ ĐẦY ĐỦ!`);
  process.exit(0);
}


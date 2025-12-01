#!/usr/bin/env python3
"""
Script để rà soát toàn bộ code và tìm các key i18n còn thiếu
Chạy: python scripts/check-i18n-keys.py
"""

import os
import json
import re
from pathlib import Path

ROOT_DIR = Path(__file__).parent.parent
LANG_DIR = ROOT_DIR / 'lang'

# Patterns để tìm keys
PATTERNS = [
    r"window\.Lang\.get\(['\"]([^'\"]+)['\"]",
    r"Lang\.get\(['\"]([^'\"]+)['\"]",
    r"getLang\(['\"]([^'\"]+)['\"]",
    r"data-i18n=['\"]([^'\"]+)['\"]",
    r"data-i18n-placeholder=['\"]([^'\"]+)['\"]",
    r"data-i18n-title=['\"]([^'\"]+)['\"]",
    r"data-i18n-value=['\"]([^'\"]+)['\"]",
]

def load_lang_files():
    """Tải tất cả các file ngôn ngữ"""
    lang_files = {}
    for file_path in LANG_DIR.glob('*.json'):
        lang_code = file_path.stem
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lang_files[lang_code] = json.load(f)
            print(f"✓ Đã tải {file_path.name} ({len(lang_files[lang_code])} keys)")
        except Exception as e:
            print(f"✗ Lỗi khi đọc {file_path.name}: {e}")
    return lang_files

def find_used_keys(root_dir):
    """Tìm tất cả các key được sử dụng trong code"""
    used_keys = set()
    
    # Các thư mục và file cần bỏ qua
    ignore_dirs = {'.git', 'node_modules', 'scripts', 'lang', '__pycache__'}
    ignore_files = {'.gitignore', '.gitattributes'}
    
    # Các extension cần quét
    extensions = {'.js', '.html', '.jsx', '.ts', '.tsx'}
    
    def scan_file(file_path):
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                for pattern in PATTERNS:
                    matches = re.findall(pattern, content)
                    used_keys.update(matches)
        except Exception:
            pass
    
    def scan_directory(dir_path):
        try:
            for item in dir_path.iterdir():
                if item.name.startswith('.') or item.name in ignore_dirs:
                    continue
                if item.is_dir():
                    scan_directory(item)
                elif item.is_file() and item.suffix in extensions:
                    if item.name not in ignore_files:
                        scan_file(item)
        except Exception:
            pass
    
    scan_directory(root_dir)
    return used_keys

def compare_keys(used_keys, lang_files):
    """So sánh keys được sử dụng với keys có trong file ngôn ngữ"""
    results = {}
    
    for lang_code, lang_keys in lang_files.items():
        missing = sorted([k for k in used_keys if k not in lang_keys])
        extra = sorted([k for k in lang_keys if k not in used_keys])
        
        results[lang_code] = {
            'missing': missing,
            'extra': extra,
            'total': len(lang_keys),
            'used': len(used_keys)
        }
    
    return results

def main():
    print('🔍 Đang rà soát i18n keys...\n')
    
    # 1. Tải các file ngôn ngữ
    print('📂 Đang tải các file ngôn ngữ...')
    lang_files = load_lang_files()
    print()
    
    # 2. Tìm tất cả keys được sử dụng
    print('🔎 Đang quét code để tìm các key được sử dụng...')
    used_keys = find_used_keys(ROOT_DIR)
    print(f"✓ Tìm thấy {len(used_keys)} keys được sử dụng trong code\n")
    
    # 3. So sánh
    print('📊 Đang so sánh...\n')
    results = compare_keys(used_keys, lang_files)
    
    # 4. Hiển thị kết quả
    all_missing = set()
    for lang_code, result in results.items():
        print(f"\n{'='*60}")
        print(f"📄 {lang_code}.json")
        print(f"{'='*60}")
        print(f"Tổng số keys: {result['total']}")
        print(f"Keys được sử dụng: {result['used']}")
        print(f"Keys thiếu: {len(result['missing'])}")
        print(f"Keys thừa (không dùng): {len(result['extra'])}")
        
        if result['missing']:
            print(f"\n❌ CÁC KEY THIẾU ({len(result['missing'])}):")
            for key in result['missing']:
                print(f"   - \"{key}\"")
                all_missing.add(key)
        
        if result['extra'] and len(result['extra']) < 50:
            print(f"\n⚠️  CÁC KEY THỪA (mẫu - {len(result['extra'])} tổng cộng):")
            for key in result['extra'][:20]:
                print(f"   - \"{key}\"")
            if len(result['extra']) > 20:
                print(f"   ... và {len(result['extra']) - 20} keys khác")
    
    # 5. Tổng kết
    print(f"\n\n{'='*60}")
    if all_missing:
        print(f"⚠️  TỔNG KẾT: Còn {len(all_missing)} keys thiếu trong ít nhất một file ngôn ngữ")
        print("\nDanh sách keys cần thêm:")
        for key in sorted(all_missing):
            print(f"  - {key}")
        return 1
    else:
        print("✅ TẤT CẢ CÁC KEY ĐỀU ĐÃ CÓ ĐẦY ĐỦ!")
        return 0

if __name__ == '__main__':
    exit(main())


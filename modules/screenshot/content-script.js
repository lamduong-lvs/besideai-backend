// screenshot/content-script.js

/**
 * File này hiện tại không cần thiết cho việc chụp ảnh màn hình hiển thị
 * vì lệnh được gửi trực tiếp từ popup -> background.
 *
 * Tuy nhiên, nó VẪN CẦN THIẾT cho các chức năng tương tác với trang web
 * như "Chụp vùng tùy chọn" (screenshot-area) trong tương lai.
 *
 * Chúng ta sẽ giữ lại cấu trúc lắng nghe này để sẵn sàng mở rộng.
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // File này có thể lắng nghe các lệnh khác trong tương lai
    // ví dụ: lệnh để hiển thị UI chọn vùng chụp.
    // Hiện tại, không cần xử lý gì thêm cho các chức năng bạn đã yêu cầu.
});

console.log('Content Script cho chụp ảnh đã được tải.');
// modules/auth/config/oauth-config.js

/**
 * OAuth2 Configuration for Google Authentication
 * Using Chrome Identity API
 */

export const OAUTH_CONFIG = {
  // Provider information
  provider: 'google',
  
  // Scopes - quyền cần xin từ Google
  scopes: [
    'openid',     // ✅ THÊM OPENID
    'email',      // Lấy email
    'profile'     // Lấy tên và ảnh đại diện
  ],
  
  // ✅ FIXED: Xóa accountHint khỏi default options
  identityOptions: {
    interactive: true  // Chỉ giữ interactive
    // ❌ KHÔNG CÓ accountHint ở đây nữa
  },
  
  // Token settings
  tokenSettings: {
    // Cache token trong bao lâu (milliseconds)
    cacheDuration: 55 * 60 * 1000,  // 55 minutes
    
    // Tự động refresh trước khi hết hạn bao lâu
    refreshBeforeExpiry: 5 * 60 * 1000  // 5 minutes
  }
};

/**
 * Get Google User Info endpoint
 */
export const GOOGLE_USER_INFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

/**
 * OAuth Error codes và messages
 * CẬP NHẬT i18n: 'message' đã được thay thế bằng 'messageKey'.
 * File JS nào bắt lỗi này sẽ cần gọi window.Lang.get(error.messageKey)
 */
export const OAUTH_ERRORS = {
  USER_CANCELLED: {
    code: 'USER_CANCELLED',
    messageKey: 'errorUserCancelled' // Đã thay đổi
  },
  NETWORK_ERROR: {
    code: 'NETWORK_ERROR', 
    messageKey: 'errorNetwork' // Đã thay đổi
  },
  INVALID_TOKEN: {
    code: 'INVALID_TOKEN',
    messageKey: 'errorInvalidToken' // Đã thay đổi
  },
  TOKEN_REVOKED: {
    code: 'TOKEN_REVOKED',
    messageKey: 'errorTokenRevoked' // Đã thay đổi
  },
  UNKNOWN_ERROR: {
    code: 'UNKNOWN_ERROR',
    messageKey: 'errorUnknown' // Đã thay đổi
  }
};

/**
 * ✅ FIXED: Helper function to build identity options
 * KHÔNG BAO GIỜ TRUYỀN accountHint
 */
export function buildIdentityOptions(accountHint = null) {
  // ⚠️ accountHint parameter bị ignore hoàn toàn
  // Chrome Identity API không hỗ trợ nó
  return {
    interactive: true
    // ❌ KHÔNG CÓ accountHint
  };
}

/**
 * Check if scopes are sufficient
 */
export function hasRequiredScopes(grantedScopes) {
  return OAUTH_CONFIG.scopes.every(scope => 
    grantedScopes.includes(scope)
  );
}
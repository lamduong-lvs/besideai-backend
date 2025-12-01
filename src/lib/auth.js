/**
 * Authentication Utilities
 * Google OAuth 2.0 token verification
 */

/**
 * Verify Google OAuth token
 * @param {string} token - Google OAuth token
 * @returns {Promise<Object>} User info from Google
 */
export async function verifyGoogleToken(token) {
  if (!token) {
    throw new Error('Token is required');
  }

  try {
    // Verify token with Google API
    const response = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        const error = new Error('Invalid or expired token');
        error.status = 401;
        error.code = 'INVALID_TOKEN';
        throw error;
      }
      const error = new Error(`Google API error: ${response.status}`);
      error.status = response.status;
      throw error;
    }

    const userInfo = await response.json();
    
    // Validate required fields
    if (!userInfo.email) {
      const error = new Error('Invalid token: email not found');
      error.status = 401;
      error.code = 'MISSING_EMAIL';
      throw error;
    }

    return {
      googleId: userInfo.id,
      email: userInfo.email,
      name: userInfo.name || userInfo.email.split('@')[0],
      picture: userInfo.picture || null,
      verified: userInfo.verified_email || false
    };
  } catch (error) {
    console.error('[Auth] Token verification failed:', error);
    // Re-throw with status code if not already set
    if (!error.status && error.message.includes('fetch')) {
      error.status = 503;
      error.code = 'GOOGLE_API_UNAVAILABLE';
    }
    throw error;
  }
}

/**
 * Extract token from Authorization header
 * @param {Object} req - Express request object
 * @returns {string|null} Token or null
 */
export function extractToken(req) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return null;
  }

  // Format: "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}


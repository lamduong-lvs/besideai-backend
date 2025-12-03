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
    console.log('[Auth] Verifying token with Google API...');
    
    // Verify token with Google API
    const response = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('[Auth] Google API response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      let errorMessage = `Google API error: ${response.status}`;
      let errorCode = 'GOOGLE_API_ERROR';
      
      if (response.status === 401) {
        errorMessage = 'Invalid or expired token';
        errorCode = 'INVALID_TOKEN';
        
        // Try to get more details from response
        try {
          const errorData = await response.json();
          if (errorData.error_description) {
            errorMessage = errorData.error_description;
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
      } else if (response.status === 403) {
        errorMessage = 'Token access forbidden';
        errorCode = 'TOKEN_FORBIDDEN';
      } else if (response.status >= 500) {
        errorMessage = 'Google API temporarily unavailable';
        errorCode = 'GOOGLE_API_UNAVAILABLE';
      }
      
      const error = new Error(errorMessage);
      error.status = response.status;
      error.code = errorCode;
      throw error;
    }

    const userInfo = await response.json();
    
    console.log('[Auth] Google user info received:', {
      id: userInfo.id,
      email: userInfo.email,
      hasName: !!userInfo.name
    });
    
    // Validate required fields
    if (!userInfo.email) {
      const error = new Error('Invalid token: email not found');
      error.status = 401;
      error.code = 'MISSING_EMAIL';
      throw error;
    }

    if (!userInfo.id) {
      const error = new Error('Invalid token: user ID not found');
      error.status = 401;
      error.code = 'MISSING_USER_ID';
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
    console.error('[Auth] Token verification failed:', {
      message: error.message,
      code: error.code,
      status: error.status,
      name: error.name
    });
    
    // Re-throw with status code if not already set
    if (!error.status) {
      if (error.message.includes('fetch') || error.message.includes('network')) {
        error.status = 503;
        error.code = error.code || 'GOOGLE_API_UNAVAILABLE';
      } else {
        error.status = 401;
        error.code = error.code || 'TOKEN_VERIFICATION_FAILED';
      }
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
  // Vercel serverless functions may have headers in different formats
  const headers = req.headers || {};
  
  // Try multiple header formats and case variations
  const authHeader = headers.authorization || 
                     headers.Authorization || 
                     headers['authorization'] ||
                     headers['Authorization'] ||
                     headers['AUTHORIZATION'];
  
  if (!authHeader) {
    console.warn('[Auth] No Authorization header found');
    console.warn('[Auth] Available header keys:', Object.keys(headers));
    console.warn('[Auth] Request headers:', JSON.stringify(headers, null, 2));
    return null;
  }

  console.log('[Auth] Authorization header found, length:', authHeader.length);
  console.log('[Auth] Authorization header preview:', authHeader.substring(0, 30) + '...');

  // Format: "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2) {
    console.warn('[Auth] Invalid Authorization header format (expected "Bearer <token>")');
    console.warn('[Auth] Header parts count:', parts.length);
    console.warn('[Auth] Header value:', authHeader.substring(0, 50));
    return null;
  }
  
  if (parts[0] !== 'Bearer' && parts[0] !== 'bearer' && parts[0] !== 'BEARER') {
    console.warn('[Auth] Authorization header does not start with "Bearer"');
    console.warn('[Auth] First part:', parts[0]);
    return null;
  }

  const token = parts[1];
  if (!token || token.length === 0) {
    console.warn('[Auth] Token is empty');
    return null;
  }

  console.log('[Auth] Token extracted successfully, length:', token.length);
  return token;
}


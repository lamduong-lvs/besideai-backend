/**
 * Authentication Middleware
 * Verifies Google OAuth token and attaches user to request
 */

import { verifyGoogleToken, extractToken } from '../lib/auth.js';
import { User } from '../models/index.js';

/**
 * Verify authentication middleware
 * Verifies Google token, gets/creates user from database, and attaches to req.user
 */
export async function verifyAuth(req, res, next) {
  try {
    // Log request details for debugging
    // Vercel serverless functions may have headers in different formats
    const allHeaders = req.headers || {};
    const authHeader = allHeaders.authorization || 
                      allHeaders.Authorization || 
                      allHeaders['authorization'] ||
                      allHeaders['Authorization'];
    
    console.log('[Auth Middleware] Request:', {
      method: req.method,
      path: req.path,
      url: req.url,
      hasAuthHeader: !!authHeader,
      authHeaderPrefix: authHeader ? authHeader.substring(0, 30) + '...' : 'none',
      allHeaderKeys: Object.keys(allHeaders).filter(k => k.toLowerCase().includes('auth'))
    });

    const token = extractToken(req);

    if (!token) {
      console.warn('[Auth Middleware] No token found in request');
      console.warn('[Auth Middleware] Available headers:', Object.keys(allHeaders));
      console.warn('[Auth Middleware] Authorization header value:', authHeader || 'NOT FOUND');
      return res.status(401).json({
        success: false,
        error: 'unauthorized',
        message: 'Authorization token is required',
        code: 'MISSING_TOKEN'
      });
    }

    console.log('[Auth Middleware] Token extracted, verifying with Google...');

    // Verify token with Google
    const googleUserInfo = await verifyGoogleToken(token);

    console.log('[Auth Middleware] Token verified, user:', {
      googleId: googleUserInfo.googleId,
      email: googleUserInfo.email
    });

    // Get or create user in database
    const user = await User.findOrCreateByGoogleId({
      googleId: googleUserInfo.googleId,
      email: googleUserInfo.email,
      name: googleUserInfo.name,
      picture: googleUserInfo.picture
    });

    console.log('[Auth Middleware] User found/created:', {
      userId: user.id,
      email: user.email
    });

    // Attach user to request
    req.user = user;
    req.googleUserInfo = googleUserInfo;
    req.token = token;

    next();
  } catch (error) {
    console.error('[Auth Middleware] Authentication failed:', {
      error: error.message,
      code: error.code,
      status: error.status,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    
    const status = error.status || 401;
    const code = error.code || 'AUTH_FAILED';
    
    return res.status(status).json({
      success: false,
      error: 'unauthorized',
      message: error.message || 'Invalid or expired token',
      code: code
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches user if token is present, but doesn't require it
 */
export async function optionalAuth(req, res, next) {
  try {
    const token = extractToken(req);

    if (token) {
      // Verify token with Google
      const googleUserInfo = await verifyGoogleToken(token);
      
      // Get or create user in database
      const user = await User.findOrCreateByGoogleId({
        googleId: googleUserInfo.googleId,
        email: googleUserInfo.email,
        name: googleUserInfo.name,
        picture: googleUserInfo.picture
      });

      // Attach user to request
      req.user = user;
      req.googleUserInfo = googleUserInfo;
      req.token = token;
    }

    next();
  } catch (error) {
    // Continue without auth if token is invalid
    console.warn('[Auth Middleware] Optional auth failed:', error.message);
    next();
  }
}


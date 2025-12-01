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
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'unauthorized',
        message: 'Authorization token is required'
      });
    }

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

    next();
  } catch (error) {
    console.error('[Auth Middleware] Error:', error);
    
    const status = error.status || 401;
    
    return res.status(status).json({
      success: false,
      error: 'unauthorized',
      message: error.message || 'Invalid or expired token',
      code: error.code || 'AUTH_FAILED'
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


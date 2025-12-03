/**
 * Admin Authorization Middleware
 * Verifies that the authenticated user has admin role
 */

import { User } from '../models/index.js';

/**
 * Verify admin authorization
 * Must be called after verifyAuth middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export async function verifyAdmin(req, res, next) {
  try {
    // Ensure user is authenticated (should be set by verifyAuth)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'unauthorized',
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // Get user with role from database
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'user_not_found',
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if user has admin role
    // Role can be stored in database or environment variable for admin emails
    const isAdmin = user.role === 'admin' || 
                    (process.env.ADMIN_EMAILS && 
                     process.env.ADMIN_EMAILS.split(',').includes(user.email));

    if (!isAdmin) {
      console.warn('[Admin Middleware] Access denied for user:', {
        userId: user.id,
        email: user.email,
        role: user.role
      });
      
      return res.status(403).json({
        success: false,
        error: 'forbidden',
        message: 'Admin access required',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // Attach admin flag to request
    req.isAdmin = true;
    
    console.log('[Admin Middleware] Admin access granted:', {
      userId: user.id,
      email: user.email
    });

    next();
  } catch (error) {
    console.error('[Admin Middleware] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'internal_error',
      message: error.message || 'Failed to verify admin access',
      code: 'ADMIN_CHECK_FAILED'
    });
  }
}


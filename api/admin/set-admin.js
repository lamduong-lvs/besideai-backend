/**
 * Admin API: Set Admin User
 * POST /api/admin/set-admin
 * 
 * Security: Requires CRON_SECRET or admin token
 * Usage: Set user role to admin by email
 */

import { query } from '../../src/lib/db.js';

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'method_not_allowed',
      message: 'Only POST method is allowed'
    });
  }

  // Security check
  const { secret, email } = req.body || {};
  
  if (!secret || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({
      success: false,
      error: 'unauthorized',
      message: 'Invalid or missing secret'
    });
  }

  // Validate required fields
  if (!email) {
    return res.status(400).json({
      success: false,
      error: 'missing_fields',
      message: 'email is required'
    });
  }

  try {
    // Check if user exists
    const userCheck = await query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [email]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'user_not_found',
        message: `User with email ${email} not found`
      });
    }

    // Update user role to admin
    const result = await query(
      'UPDATE users SET role = $1 WHERE email = $2 RETURNING id, email, role',
      ['admin', email]
    );

    return res.status(200).json({
      success: true,
      message: `User ${email} has been set as admin`,
      user: {
        id: result.rows[0].id,
        email: result.rows[0].email,
        role: result.rows[0].role
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Set Admin] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'internal_error',
      message: error.message
    });
  }
}


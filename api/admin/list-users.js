/**
 * Admin API: List Users
 * GET /api/admin/list-users
 * 
 * Security: Requires CRON_SECRET
 * Usage: List all users to find email for admin setup
 */

import { query } from '../../src/lib/db.js';

export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'method_not_allowed',
      message: 'Only GET method is allowed'
    });
  }

  // Security check
  const secret = req.query.secret || req.headers['x-cron-secret'];
  
  if (!secret || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({
      success: false,
      error: 'unauthorized',
      message: 'Invalid or missing secret'
    });
  }

  try {
    const result = await query(
      'SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC LIMIT 50'
    );

    return res.status(200).json({
      success: true,
      users: result.rows,
      count: result.rows.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[List Users] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'internal_error',
      message: error.message
    });
  }
}


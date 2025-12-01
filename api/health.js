/**
 * Health Check Endpoint
 * Vercel serverless function
 */

import { getDbPool } from '../src/lib/db.js';

export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'method_not_allowed',
      message: 'Only GET method is allowed'
    });
  }

  try {
    // Check database connection
    const pool = getDbPool();
    await pool.query('SELECT 1');

    return res.status(200).json({
      success: true,
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('[Health Check] Error:', error);
    
    return res.status(503).json({
      success: false,
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
}


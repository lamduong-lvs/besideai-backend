/**
 * OAuth Config Test Endpoint
 * Returns OAuth configuration (without secrets) for debugging
 * GET /api/auth/test-config
 */

import { setCorsHeaders, handleCorsPreflight } from '../../src/middleware/cors-helper.js';

export default async function handler(req, res) {
  // Set CORS headers first
  setCorsHeaders(req, res);

  // Handle preflight
  if (handleCorsPreflight(req, res)) {
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'method_not_allowed',
      message: 'Only GET method is allowed'
    });
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    const corsOrigin = process.env.CORS_ORIGIN;

    return res.status(200).json({
      success: true,
      config: {
        hasClientId: !!clientId,
        clientId: clientId || null,
        clientIdLength: clientId?.length || 0,
        hasClientSecret: !!clientSecret,
        clientSecretLength: clientSecret?.length || 0,
        redirectUri: redirectUri || null,
        corsOrigin: corsOrigin || null,
        environment: process.env.NODE_ENV || 'development'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[OAuth Test Config] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message || 'Internal server error'
    });
  }
}


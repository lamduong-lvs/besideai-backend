/**
 * Google OAuth Callback Handler
 * Exchanges authorization code for access token
 */

import { User } from '../../src/models/index.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'method_not_allowed',
      message: 'Only POST method is allowed'
    });
  }

  try {
    const { code, redirect_uri } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'invalid_request',
        message: 'Authorization code is required'
      });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const finalRedirectUri = redirect_uri || process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret) {
      console.error('[OAuth Callback] Missing Google OAuth credentials');
      return res.status(500).json({
        success: false,
        error: 'server_error',
        message: 'OAuth configuration error'
      });
    }

    // Exchange authorization code for access token
    console.log('[OAuth Callback] Exchanging code for token...');
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: finalRedirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      console.error('[OAuth Callback] Token exchange failed:', errorData);
      return res.status(400).json({
        success: false,
        error: 'token_exchange_failed',
        message: errorData.error_description || 'Failed to exchange code for token'
      });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'invalid_token',
        message: 'Access token not received from Google'
      });
    }

    // Get user info from Google using access token
    console.log('[OAuth Callback] Fetching user info from Google...');
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!userInfoResponse.ok) {
      console.error('[OAuth Callback] Failed to fetch user info');
      return res.status(400).json({
        success: false,
        error: 'user_info_failed',
        message: 'Failed to fetch user information from Google'
      });
    }

    const googleUserInfo = await userInfoResponse.json();
    
    // Get or create user in database
    const user = await User.findOrCreateByGoogleId({
      googleId: googleUserInfo.id,
      email: googleUserInfo.email,
      name: googleUserInfo.name,
      picture: googleUserInfo.picture
    });

    console.log('[OAuth Callback] User authenticated:', {
      userId: user.id,
      email: user.email
    });

    // Return access token to frontend
    // Frontend will use this token for subsequent API calls
    return res.json({
      success: true,
      token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture
      }
    });

  } catch (error) {
    console.error('[OAuth Callback] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message || 'Internal server error'
    });
  }
}


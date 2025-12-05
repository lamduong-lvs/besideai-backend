/**
 * Google OAuth Callback Handler
 * Exchanges authorization code for access token
 */

import { User } from '../../src/models/index.js';
import { setCorsHeaders, handleCorsPreflight } from '../../src/middleware/cors-helper.js';

export default async function handler(req, res) {
  // Set CORS headers
  setCorsHeaders(req, res);

  // Handle preflight
  if (handleCorsPreflight(req, res)) {
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'method_not_allowed',
      message: 'Only POST method is allowed'
    });
  }

  try {
    const { code, redirect_uri } = req.body;

    console.log('[OAuth Callback] Received request:', {
      hasCode: !!code,
      hasRedirectUri: !!redirect_uri,
      redirectUri: redirect_uri
    });

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'invalid_request',
        message: 'Authorization code is required'
      });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const envRedirectUri = process.env.GOOGLE_REDIRECT_URI;
    const finalRedirectUri = redirect_uri || envRedirectUri;

    console.log('[OAuth Callback] OAuth config:', {
      hasClientId: !!clientId,
      clientId: clientId ? `${clientId.substring(0, 20)}...` : null,
      hasClientSecret: !!clientSecret,
      clientSecret: clientSecret ? `${clientSecret.substring(0, 10)}...` : null,
      envRedirectUri: envRedirectUri,
      finalRedirectUri: finalRedirectUri
    });

    if (!clientId || !clientSecret) {
      console.error('[OAuth Callback] Missing Google OAuth credentials');
      return res.status(500).json({
        success: false,
        error: 'server_error',
        message: 'OAuth configuration error'
      });
    }

    if (!finalRedirectUri) {
      console.error('[OAuth Callback] Missing redirect URI');
      return res.status(400).json({
        success: false,
        error: 'invalid_request',
        message: 'Redirect URI is required'
      });
    }

    // Exchange authorization code for access token
    const tokenRequestParams = {
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: finalRedirectUri,
      grant_type: 'authorization_code',
    };
    
    console.log('[OAuth Callback] Exchanging code for token:', {
      redirect_uri: finalRedirectUri,
      client_id: clientId,
      client_id_length: clientId?.length,
      client_secret_length: clientSecret?.length,
      code_length: code?.length,
      code_prefix: code ? code.substring(0, 20) + '...' : null,
      request_url: 'https://oauth2.googleapis.com/token'
    });
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(tokenRequestParams),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      let errorData = {};
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        console.error('[OAuth Callback] Failed to parse error response:', errorText);
      }
      
      console.error('[OAuth Callback] Token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorData,
        clientId: clientId ? `${clientId.substring(0, 20)}...` : null,
        clientId_full: clientId, // Log full client ID for debugging
        redirectUri: finalRedirectUri,
        code_prefix: code ? code.substring(0, 20) + '...' : null,
        request_body: {
          code: code ? code.substring(0, 20) + '...' : null,
          client_id: clientId,
          redirect_uri: finalRedirectUri,
          grant_type: 'authorization_code'
        }
      });
      
      return res.status(400).json({
        success: false,
        error: 'token_exchange_failed',
        message: errorData.error_description || errorData.error || 'Failed to exchange code for token',
        details: errorData // Always include details for debugging
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


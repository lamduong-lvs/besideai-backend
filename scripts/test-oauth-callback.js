/**
 * Test OAuth Callback Flow
 * Simulates the OAuth callback to test token exchange
 * 
 * Usage: node scripts/test-oauth-callback.js [authorization_code] [redirect_uri]
 */

const API_BASE_URL = process.env.API_BASE_URL || 'https://besideai-backend.vercel.app';

async function testOAuthCallback(code, redirectUri) {
  if (!code) {
    console.error('❌ Error: Authorization code is required');
    console.log('\nUsage: node scripts/test-oauth-callback.js <authorization_code> [redirect_uri]');
    console.log('\nExample:');
    console.log('  node scripts/test-oauth-callback.js "4/0Ab32j91..." "https://besideai.work/callback"');
    process.exit(1);
  }

  const finalRedirectUri = redirectUri || 'https://besideai.work/callback';

  console.log('=== Testing OAuth Callback ===\n');
  console.log('Backend URL:', API_BASE_URL);
  console.log('Authorization Code:', code.substring(0, 20) + '...');
  console.log('Redirect URI:', finalRedirectUri);
  console.log('');

  try {
    console.log('📤 Sending request to backend...');
    const response = await fetch(`${API_BASE_URL}/api/auth/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        redirect_uri: finalRedirectUri,
      }),
    });

    console.log('📥 Response Status:', response.status, response.statusText);
    console.log('');

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Failed to parse response as JSON');
      console.log('Raw response:', responseText);
      return;
    }

    if (response.ok) {
      console.log('✅ Success!');
      console.log('Response:', JSON.stringify(responseData, null, 2));
      console.log('');
      console.log('Token received:', responseData.token ? responseData.token.substring(0, 20) + '...' : 'N/A');
      console.log('User:', responseData.user?.email || 'N/A');
    } else {
      console.error('❌ Error Response:');
      console.log(JSON.stringify(responseData, null, 2));
      console.log('');
      
      if (responseData.details) {
        console.log('🔍 Error Details from Google:');
        console.log(JSON.stringify(responseData.details, null, 2));
      }
      
      if (responseData.error === 'token_exchange_failed') {
        console.log('');
        console.log('💡 Possible causes:');
        console.log('  1. Authorization code has expired (codes expire quickly)');
        console.log('  2. Redirect URI mismatch with Google Cloud Console');
        console.log('  3. Client ID/Secret mismatch');
        console.log('  4. Code was already used (codes are single-use)');
      }
    }
  } catch (error) {
    console.error('❌ Network Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const code = args[0];
const redirectUri = args[1];

testOAuthCallback(code, redirectUri);


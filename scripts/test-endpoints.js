/**
 * Script to test backend endpoints
 * 
 * Usage:
 *   node scripts/test-endpoints.js [baseUrl]
 * 
 * Example:
 *   node scripts/test-endpoints.js https://besideai.work
 */

const BASE_URL = process.argv[2] || 'https://besideai.work';

async function testEndpoint(name, url, options = {}) {
  try {
    console.log(`\n🧪 Testing ${name}...`);
    console.log(`   URL: ${url}`);
    
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    
    if (response.ok) {
      console.log(`   ✅ Status: ${response.status}`);
      if (data.success !== undefined) {
        console.log(`   ✅ Success: ${data.success}`);
      }
      if (data.models) {
        console.log(`   ✅ Models: ${data.models.length} available`);
      }
      return { success: true, data };
    } else {
      console.log(`   ❌ Status: ${response.status}`);
      console.log(`   ❌ Error: ${data.message || data.error || 'Unknown error'}`);
      return { success: false, data };
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Testing Backend Endpoints');
  console.log(`📍 Base URL: ${BASE_URL}\n`);

  const results = [];

  // Test 1: Health check
  results.push(await testEndpoint(
    'Health Check',
    `${BASE_URL}/api/health`
  ));

  // Test 2: Models endpoint (no auth)
  results.push(await testEndpoint(
    'Models Endpoint (Public)',
    `${BASE_URL}/api/models`
  ));

  // Test 3: Models endpoint with tier
  results.push(await testEndpoint(
    'Models Endpoint (Free Tier)',
    `${BASE_URL}/api/models?tier=free`
  ));

  // Test 4: Models endpoint (Pro tier)
  results.push(await testEndpoint(
    'Models Endpoint (Pro Tier)',
    `${BASE_URL}/api/models?tier=pro`
  ));

  // Test 5: AI Call endpoint (should fail without auth)
  results.push(await testEndpoint(
    'AI Call Endpoint (No Auth - Should Fail)',
    `${BASE_URL}/api/ai/call`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }]
      })
    }
  ));

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Summary');
  console.log('='.repeat(50));
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / results.length) * 100).toFixed(1)}%\n`);

  if (failed > 0) {
    console.log('⚠️  Some tests failed. Check the output above for details.\n');
    process.exit(1);
  } else {
    console.log('✅ All tests passed!\n');
    process.exit(0);
  }
}

// Run tests
runTests();


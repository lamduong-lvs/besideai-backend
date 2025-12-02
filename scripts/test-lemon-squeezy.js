/**
 * Test Lemon Squeezy Connection
 * Tests API key, store, and variant IDs
 */

import { getOrCreateCustomer, createCheckoutSession, getSubscription } from '../src/lib/lemon-squeezy.js';
import { PRICING_PLANS } from '../src/lib/lemon-squeezy.js';

async function testLemonSqueezy() {
  console.log('🧪 Testing Lemon Squeezy Integration...\n');

  // Test 1: Check environment variables
  console.log('1️⃣ Checking environment variables...');
  const requiredVars = [
    'LEMON_SQUEEZY_API_KEY',
    'LEMON_SQUEEZY_STORE_ID',
    'LEMON_SQUEEZY_VARIANT_ID_PRO_MONTHLY',
    'LEMON_SQUEEZY_VARIANT_ID_PRO_YEARLY',
    'LEMON_SQUEEZY_VARIANT_ID_PREMIUM_MONTHLY',
    'LEMON_SQUEEZY_VARIANT_ID_PREMIUM_YEARLY'
  ];

  const missing = [];
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    } else {
      const value = process.env[varName];
      const displayValue = varName.includes('KEY') || varName.includes('SECRET') 
        ? `${value.substring(0, 20)}...` 
        : value;
      console.log(`   ✅ ${varName}: ${displayValue}`);
    }
  }

  if (missing.length > 0) {
    console.log(`\n   ❌ Missing variables: ${missing.join(', ')}`);
    return;
  }

  // Test 2: Check pricing plans
  console.log('\n2️⃣ Checking pricing plans configuration...');
  for (const [tier, cycles] of Object.entries(PRICING_PLANS)) {
    for (const [cycle, plan] of Object.entries(cycles)) {
      if (plan.variantId) {
        console.log(`   ✅ ${tier}/${cycle}: Variant ID = ${plan.variantId}`);
      } else {
        console.log(`   ❌ ${tier}/${cycle}: Variant ID not set`);
      }
    }
  }

  // Test 3: Test API connection (get store info)
  console.log('\n3️⃣ Testing API connection...');
  try {
    // Try to make a simple API call to verify connection
    const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
    const storeId = process.env.LEMON_SQUEEZY_STORE_ID;
    
    const response = await fetch(`https://api.lemonsqueezy.com/v1/stores/${storeId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/vnd.api+json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ API connection successful!`);
      console.log(`   ✅ Store: ${data.data.attributes.name}`);
    } else {
      const error = await response.json();
      console.log(`   ❌ API connection failed: ${response.status}`);
      console.log(`   Error: ${JSON.stringify(error, null, 2)}`);
    }
  } catch (error) {
    console.log(`   ❌ API connection error: ${error.message}`);
  }

  // Test 4: Verify variant IDs
  console.log('\n4️⃣ Verifying variant IDs...');
  const variantIds = [
    process.env.LEMON_SQUEEZY_VARIANT_ID_PRO_MONTHLY,
    process.env.LEMON_SQUEEZY_VARIANT_ID_PRO_YEARLY,
    process.env.LEMON_SQUEEZY_VARIANT_ID_PREMIUM_MONTHLY,
    process.env.LEMON_SQUEEZY_VARIANT_ID_PREMIUM_YEARLY
  ];

  for (const variantId of variantIds) {
    if (!variantId) continue;
    
    try {
      const response = await fetch(`https://api.lemonsqueezy.com/v1/variants/${variantId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.LEMON_SQUEEZY_API_KEY}`,
          'Accept': 'application/vnd.api+json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const variant = data.data;
        console.log(`   ✅ Variant ${variantId}: ${variant.attributes.name}`);
        console.log(`      Price: $${(variant.attributes.price / 100).toFixed(2)} ${variant.attributes.currency}`);
        console.log(`      Interval: ${variant.attributes.interval} (${variant.attributes.interval_count})`);
      } else {
        const error = await response.json();
        console.log(`   ❌ Variant ${variantId}: Not found or invalid`);
        console.log(`      Error: ${error.errors?.[0]?.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`   ❌ Variant ${variantId}: Error - ${error.message}`);
    }
  }

  console.log('\n✅ Lemon Squeezy integration test completed!');
}

// Run test
testLemonSqueezy().catch(console.error);


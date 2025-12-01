/**
 * Deploy Database Migrations
 * 
 * Usage:
 *   node scripts/deploy-migrations.js [baseUrl] [cronSecret]
 * 
 * Example:
 *   node scripts/deploy-migrations.js https://besideai.work YOUR_CRON_SECRET
 */

const BASE_URL = process.argv[2] || 'https://besideai.work';
const CRON_SECRET = process.argv[3] || process.env.CRON_SECRET;

if (!CRON_SECRET) {
  console.error('❌ Error: CRON_SECRET is required');
  console.error('   Usage: node scripts/deploy-migrations.js [baseUrl] [cronSecret]');
  console.error('   Or set CRON_SECRET environment variable');
  process.exit(1);
}

async function deployMigrations() {
  try {
    console.log('🚀 Deploying Database Migrations');
    console.log(`📍 Base URL: ${BASE_URL}\n`);

    const response = await fetch(`${BASE_URL}/api/migrate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        secret: CRON_SECRET
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      console.log('✅ Migrations completed successfully!\n');
      console.log('📊 Results:');
      data.results.forEach(result => {
        const icon = result.status === 'success' ? '✅' : '⚠️';
        console.log(`   ${icon} ${result.migration}: ${result.message}`);
      });
      console.log(`\n⏰ Timestamp: ${data.timestamp}\n`);
      process.exit(0);
    } else {
      console.error('❌ Migration failed:');
      console.error(`   Error: ${data.error || data.message || 'Unknown error'}`);
      if (data.stack) {
        console.error(`   Stack: ${data.stack}`);
      }
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

deployMigrations();


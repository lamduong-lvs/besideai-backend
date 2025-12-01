/**
 * Generate Encryption Key
 * 
 * Usage:
 *   node scripts/generate-encryption-key.js
 * 
 * Output: 32-byte hex string for ENCRYPTION_KEY
 */

import crypto from 'crypto';

const encryptionKey = crypto.randomBytes(32).toString('hex');

console.log('\n🔐 Generated Encryption Key:');
console.log('='.repeat(50));
console.log(encryptionKey);
console.log('='.repeat(50));
console.log('\n📝 Add this to Vercel environment variables as ENCRYPTION_KEY');
console.log('⚠️  Keep this key secret! Do not commit it to git.\n');


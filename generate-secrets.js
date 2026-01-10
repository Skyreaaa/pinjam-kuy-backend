// generate-secrets.js
// Script untuk generate random secrets untuk JWT dan Session

const crypto = require('crypto');

console.log('\n🔐 Generated Secrets for Production:\n');
console.log('JWT_SECRET=' + crypto.randomBytes(64).toString('hex'));
console.log('\nSESSION_SECRET=' + crypto.randomBytes(64).toString('hex'));
console.log('\n⚠️  Copy secrets di atas ke environment variables production Anda\n');

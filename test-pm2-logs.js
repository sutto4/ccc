// Ultra simple test for PM2 logging
console.log('🚀 PM2 LOG TEST STARTED');
console.log('Timestamp:', new Date().toISOString());
console.log('PID:', process.pid);
console.log('Node version:', process.version);
console.log('Working directory:', process.cwd());

// Test file access
const fs = require('fs');
try {
  const package = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  console.log('✅ Package.json read successfully:', package.name);
} catch (e) {
  console.log('❌ Failed to read package.json:', e.message);
}

// Test environment
console.log('Environment variables:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- PORT:', process.env.PORT);

// Keep running for a bit to test continuous logging
let counter = 0;
const interval = setInterval(() => {
  counter++;
  console.log(`💓 Heartbeat #${counter} at ${new Date().toISOString()}`);

  if (counter >= 10) {
    console.log('🛑 Test completed, exiting...');
    clearInterval(interval);
    process.exit(0);
  }
}, 2000);

console.log('🧪 Test script initialized, waiting for heartbeats...');

// Handle exit signals
process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, exiting...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, exiting...');
  process.exit(0);
});

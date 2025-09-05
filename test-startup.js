// Test Next.js startup manually
console.log('🧪 Testing Next.js startup manually...');
console.log('PID:', process.pid);
console.log('Working directory:', process.cwd());
console.log('Node version:', process.version);

// Try to start Next.js directly
const { spawn } = require('child_process');

console.log('🚀 Starting Next.js...');

const nextProcess = spawn('npx', ['next', 'start'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: '3000'
  }
});

nextProcess.on('error', (err) => {
  console.error('❌ Failed to start Next.js:', err);
  process.exit(1);
});

nextProcess.on('close', (code) => {
  console.log('Next.js process exited with code:', code);
  process.exit(code);
});

// Keep this process alive briefly to let Next.js start
setTimeout(() => {
  console.log('⏰ Timeout reached, Next.js should be starting...');
}, 5000);

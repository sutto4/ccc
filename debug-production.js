// Debug script for production issues
console.log('🚀 Starting ServerMate Debug...');
console.log('Node version:', process.version);
console.log('Platform:', process.platform);
console.log('Architecture:', process.arch);
console.log('Current directory:', process.cwd());
console.log('Environment:', process.env.NODE_ENV);
console.log('PID:', process.pid);

// Check if .next exists
const fs = require('fs');
const path = require('path');

const nextDir = path.join(process.cwd(), '.next');
console.log('.next directory exists:', fs.existsSync(nextDir));

if (fs.existsSync(nextDir)) {
  const buildIdPath = path.join(nextDir, 'BUILD_ID');
  console.log('BUILD_ID exists:', fs.existsSync(buildIdPath));
  if (fs.existsSync(buildIdPath)) {
    console.log('BUILD_ID content:', fs.readFileSync(buildIdPath, 'utf8').trim());
  }
}

// Check package.json
const packagePath = path.join(process.cwd(), 'package.json');
console.log('package.json exists:', fs.existsSync(packagePath));

// Check node_modules
const nodeModulesPath = path.join(process.cwd(), 'node_modules');
console.log('node_modules exists:', fs.existsSync(nodeModulesPath));

// Check next
const nextPath = path.join(nodeModulesPath, 'next');
console.log('next module exists:', fs.existsSync(nextPath));

console.log('🎯 Debug complete - attempting to start Next.js...');

// Try to start Next.js
try {
  const { spawn } = require('child_process');
  const nextProcess = spawn('npx', ['next', 'start'], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production', PORT: '3000' }
  });

  nextProcess.on('error', (err) => {
    console.error('❌ Failed to start Next.js:', err);
    process.exit(1);
  });

  nextProcess.on('close', (code) => {
    console.log('Next.js process exited with code:', code);
    process.exit(code);
  });

} catch (error) {
  console.error('❌ Error in debug script:', error);
  process.exit(1);
}

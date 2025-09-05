// Simple test to verify logging works
console.log('🧪 SIMPLE TEST STARTING...');
console.log('Timestamp:', new Date().toISOString());
console.log('PID:', process.pid);
console.log('Node version:', process.version);

// Test file system access
const fs = require('fs');
console.log('Can read package.json:', fs.existsSync('./package.json'));

// Simulate a simple HTTP server
const http = require('http');
const server = http.createServer((req, res) => {
  console.log('📨 HTTP Request received:', req.url);
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello from simple test server!\n');
});

server.listen(3001, '0.0.0.0', () => {
  console.log('✅ Simple server listening on port 3001');
  console.log('🧪 Test complete - server should be running');
});

// Keep the process alive
setInterval(() => {
  console.log('💓 Heartbeat at', new Date().toISOString());
}, 10000);

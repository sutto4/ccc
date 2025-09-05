// Test if Next.js can even be imported
console.log('🧪 Testing Next.js import...');

try {
  // Try to import Next.js
  console.log('📦 Attempting to require Next.js...');
  const next = require('next');
  console.log('✅ Next.js imported successfully');

  // Try to create a Next.js app
  console.log('🏗️ Attempting to create Next.js app...');
  const app = next({
    dev: false,
    dir: process.cwd()
  });
  console.log('✅ Next.js app created successfully');

  console.log('🎉 Next.js basic functionality test passed!');
  process.exit(0);

} catch (error) {
  console.error('❌ Next.js test failed:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}

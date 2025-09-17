const fs = require('fs');
const path = require('path');

function findConnectionLeaks(dir = './app/api') {
  const results = [];
  
  function scanDirectory(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (item.endsWith('.ts') || item.endsWith('.js')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          
          // Check for problematic patterns
          const patterns = [
            { pattern: /mysql\.createConnection/g, issue: 'Direct mysql.createConnection() call' },
            { pattern: /getDbConnection/g, issue: 'getDbConnection() function call' },
            { pattern: /connection\.execute/g, issue: 'Direct connection.execute() call' },
            { pattern: /connection\.end/g, issue: 'Manual connection.end() call' },
            { pattern: /import.*mysql.*from.*mysql2/g, issue: 'Direct mysql2 import' }
          ];
          
          for (const { pattern, issue } of patterns) {
            const matches = content.match(pattern);
            if (matches) {
              results.push({
                file: fullPath.replace(/\\/g, '/'),
                issue,
                count: matches.length,
                lines: content.split('\n').map((line, index) => ({
                  number: index + 1,
                  content: line,
                  match: pattern.test(line)
                })).filter(line => line.match)
              });
            }
          }
        } catch (error) {
          console.error(`Error reading ${fullPath}:`, error.message);
        }
      }
    }
  }
  
  scanDirectory(dir);
  return results;
}

console.log('🔍 Scanning for connection leaks...\n');

const leaks = findConnectionLeaks();

if (leaks.length === 0) {
  console.log('✅ No connection leaks found!');
} else {
  console.log(`❌ Found ${leaks.length} files with potential connection leaks:\n`);
  
  leaks.forEach(leak => {
    console.log(`📁 ${leak.file}`);
    console.log(`   Issue: ${leak.issue} (${leak.count} occurrences)`);
    leak.lines.forEach(line => {
      console.log(`   Line ${line.number}: ${line.content.trim()}`);
    });
    console.log('');
  });
}

console.log('\n🎯 Summary:');
console.log(`Total files scanned: ${leaks.length > 0 ? 'Multiple' : 'All clean'}`);
console.log(`Files with leaks: ${leaks.length}`);
console.log(`Total issues: ${leaks.reduce((sum, leak) => sum + leak.count, 0)}`);

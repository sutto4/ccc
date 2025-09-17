const fs = require('fs');
const path = require('path');

// List of files that need to be fixed
const filesToFix = [
  'app/api/guilds/[id]/role-permissions/route.ts',
  'app/api/guilds/[id]/subscription/route.ts',
  'app/api/guilds/[id]/access-control/route.ts',
  'app/api/admin/guilds/[id]/route.ts',
  'app/api/guilds/[id]/moderation/settings/route.ts',
  'app/api/guilds/[id]/moderation/cases/[caseId]/evidence/route.ts',
  'app/api/admin/reset-db/route.ts',
  'app/api/admin/cleanup-premium/route.ts',
  'app/api/stripe/webhook/route.ts',
  'app/api/admin/user-logins/route.ts',
  'app/api/bot/commands/route.ts',
  'app/api/guilds/[id]/moderation/cases/route.ts',
  'app/api/guilds/[id]/moderation/stats/route.ts',
  'app/api/guilds/[id]/moderation/cases/[caseId]/route.ts',
  'app/api/guilds/[id]/moderation/actions/route.ts',
  'app/api/admin/premium-status/route.ts',
  'app/api/guilds/[id]/features/bulk/route.ts',
  'app/api/guilds/[id]/reaction-roles/route.ts',
  'app/api/health/db/route.ts'
];

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Add query import if not present
    if (content.includes('mysql.createConnection') && !content.includes("import { query } from '@/lib/db'")) {
      // Find the last import statement
      const importMatch = content.match(/import.*from.*['"];?\s*$/gm);
      if (importMatch) {
        const lastImport = importMatch[importMatch.length - 1];
        const insertIndex = content.lastIndexOf(lastImport) + lastImport.length;
        content = content.slice(0, insertIndex) + "\nimport { query } from '@/lib/db';" + content.slice(insertIndex);
        modified = true;
      }
    }

    // Replace mysql.createConnection pattern
    const connectionPattern = /let mysql: any;\s*try\s*{\s*\(\{ default: mysql \} = await import\("mysql2\/promise"\)\);\s*\}\s*catch\s*{\s*return NextResponse\.json\(\{ error: "Database driver not installed\. Run: pnpm add mysql2" \}, \{ status: 500 \}\);\s*\}\s*const connection = await mysql\.createConnection\(\{[^}]+\}\);\s*try\s*{/g;
    
    if (connectionPattern.test(content)) {
      content = content.replace(connectionPattern, 'try {');
      modified = true;
    }

    // Replace connection.execute with query
    content = content.replace(/connection\.execute\(/g, 'query(');
    
    // Remove connection.end() calls
    content = content.replace(/\s*await connection\.end\(\);\s*/g, '');
    
    // Fix array destructuring for query results
    content = content.replace(/const \[([^\]]+)\] = await query\(/g, 'const $1 = await query(');

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed: ${filePath}`);
      return true;
    } else {
      console.log(`⏭️  No changes needed: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

console.log('🔧 Fixing connection leaks in API routes...\n');

let fixedCount = 0;
filesToFix.forEach(file => {
  if (fs.existsSync(file)) {
    if (fixFile(file)) {
      fixedCount++;
    }
  } else {
    console.log(`⚠️  File not found: ${file}`);
  }
});

console.log(`\n🎯 Fixed ${fixedCount} files with connection leaks!`);
console.log('💡 This should resolve the ER_TOO_MANY_USER_CONNECTIONS errors.');

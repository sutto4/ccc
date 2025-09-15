const fs = require('fs');
const path = require('path');

// Files that need to be fixed (from our grep results)
const filesToFix = [
  'app/api/guilds/[id]/features/route.ts',
  'lib/auth.ts',
  'app/api/guilds/[id]/roles/route.ts',
  'app/api/guilds/[id]/role-permissions/route.ts',
  'app/guilds/[id]/layout.tsx',
  'app/api/guilds/[id]/subscription/route.ts',
  'app/api/guilds/[id]/access-control/route.ts',
  'app/api/admin/guilds/[id]/route.ts',
  'lib/guilds-server.ts',
  'app/api/guilds/[id]/moderation/settings/route.ts',
  'app/api/guilds/[id]/moderation/cases/[caseId]/evidence/route.ts',
  'app/api/admin/user-logins/route.ts',
  'app/api/bot/commands/route.ts',
  'app/api/guilds/[id]/moderation/cases/route.ts',
  'app/api/guilds/[id]/moderation/stats/route.ts',
  'app/api/guilds/[id]/moderation/cases/[caseId]/route.ts',
  'app/api/guilds/[id]/moderation/actions/route.ts',
  'app/api/guilds/[id]/features/bulk/route.ts',
  'app/api/guilds/[id]/reaction-roles/route.ts',
  'app/api/health/db/route.ts'
];

function fixFile(filePath) {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;

  // Add import for query if not present
  if (!content.includes("import { query } from '@/lib/db'") && 
      !content.includes('import { query } from "@/lib/db"')) {
    
    // Find the last import statement
    const importRegex = /^import\s+.*$/gm;
    const imports = content.match(importRegex) || [];
    
    if (imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      const lastImportIndex = content.indexOf(lastImport) + lastImport.length;
      
      content = content.slice(0, lastImportIndex) + 
                "\nimport { query } from '@/lib/db';" + 
                content.slice(lastImportIndex);
      modified = true;
      console.log(`✅ Added query import to ${filePath}`);
    }
  }

  // Remove old database connection helper functions
  const oldConnectionHelperRegex = /\/\/ Database connection helper[\s\S]*?^}/gm;
  if (oldConnectionHelperRegex.test(content)) {
    content = content.replace(oldConnectionHelperRegex, '');
    modified = true;
    console.log(`✅ Removed old connection helper from ${filePath}`);
  }

  // Replace mysql.createConnection patterns
  const createConnectionRegex = /const connection = await mysql\.createConnection\({[\s\S]*?\}\);/g;
  if (createConnectionRegex.test(content)) {
    content = content.replace(createConnectionRegex, '// Using pooled connection from @/lib/db');
    modified = true;
    console.log(`✅ Replaced createConnection calls in ${filePath}`);
  }

  // Replace connection.execute calls
  const executeRegex = /await connection\.execute\(/g;
  if (executeRegex.test(content)) {
    content = content.replace(executeRegex, 'await query(');
    modified = true;
    console.log(`✅ Replaced connection.execute calls in ${filePath}`);
  }

  // Remove connection.end() calls
  const endRegex = /await connection\.end\(\);?\s*/g;
  if (endRegex.test(content)) {
    content = content.replace(endRegex, '');
    modified = true;
    console.log(`✅ Removed connection.end() calls from ${filePath}`);
  }

  // Remove finally blocks that only contained connection.end()
  const finallyRegex = /} finally {\s*await connection\.end\(\);\s*}/g;
  if (finallyRegex.test(content)) {
    content = content.replace(finallyRegex, '}');
    modified = true;
    console.log(`✅ Removed empty finally blocks from ${filePath}`);
  }

  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`🎉 Successfully fixed ${filePath}`);
  } else {
    console.log(`ℹ️  No changes needed for ${filePath}`);
  }
}

console.log('🔧 Starting connection leak fixes...\n');

filesToFix.forEach(filePath => {
  try {
    fixFile(filePath);
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
});

console.log('\n✅ Connection leak fixes completed!');
console.log('📝 Please review the changes and test the affected endpoints.');

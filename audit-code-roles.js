const fs = require('fs');
const path = require('path');

// Collect all role references from code
function extractRolesFromFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const roles = new Set();
    
    // Pattern untuk mencari role names dalam berbagai format
    const patterns = [
      /'([a-z_]+)'/g,  // Single quotes
      /"([a-z_]+)"/g,  // Double quotes
      /\['([a-z_]+)'\]/g, // Array single quotes
      /\["([a-z_]+)"\]/g, // Array double quotes
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const role = match[1];
        // Filter hanya yang terlihat seperti role names
        if (role && (
          role.includes('admin') ||
          role.includes('editor') ||
          role.includes('manager') ||
          role.includes('supervisor') ||
          role.includes('viewer') ||
          role.includes('org_') ||
          role.includes('ppd') ||
          role.includes('kadiv') ||
          role.includes('dirut') ||
          role.includes('gm') ||
          role.includes('staff') ||
          role.includes('guest') ||
          role.includes('dewas') ||
          role.includes('finance') ||
          role.includes('hrd') ||
          role.includes('sekretaris') ||
          role.includes('komite')
        )) {
          roles.add(role);
        }
      }
    });
    
    return Array.from(roles);
  } catch (error) {
    return [];
  }
}

// Recursive function to scan directory
function scanDirectory(dir, filePattern = /\.(js|ts|tsx|jsx)$/) {
  const results = [];
  
  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules, .next, etc.
        if (!['node_modules', '.next', '.git', 'uploads'].includes(file)) {
          results.push(...scanDirectory(fullPath, filePattern));
        }
      } else if (filePattern.test(file)) {
        const roles = extractRolesFromFile(fullPath);
        if (roles.length > 0) {
          results.push({
            file: fullPath.replace(process.cwd() + '/', ''),
            roles: roles
          });
        }
      }
    }
  } catch (error) {
    // Skip directories we can't read
  }
  
  return results;
}

async function auditCodeRoles() {
  console.log('🔍 CODE ROLE AUDIT');
  console.log('='.repeat(50));
  
  const srcDir = path.join(process.cwd(), 'src');
  const rootFiles = [
    'test-all-user-permissions.js',
    'test-draft-flow.js',
    'database_queries_role_group.sql'
  ];
  
  const allRoles = new Set();
  const fileResults = [];
  
  // Scan src directory
  console.log('\n📁 Scanning src/ directory...');
  const srcResults = scanDirectory(srcDir);
  fileResults.push(...srcResults);
  
  // Scan specific root files
  console.log('📄 Scanning root files...');
  for (const file of rootFiles) {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const roles = extractRolesFromFile(fullPath);
      if (roles.length > 0) {
        fileResults.push({
          file: file,
          roles: roles
        });
      }
    }
  }
  
  console.log('\n📊 ROLES FOUND IN CODE:');
  fileResults.forEach((result, index) => {
    console.log(`${index + 1}. ${result.file}`);
    result.roles.forEach(role => {
      console.log(`   - ${role}`);
      allRoles.add(role);
    });
    console.log('');
  });
  
  const codeRoles = Array.from(allRoles).sort();
  console.log(`\n📋 CODE ROLE SUMMARY: ${codeRoles.length} unique roles`);
  console.log(`Roles: ${codeRoles.join(', ')}`);
  
  return codeRoles;
}

auditCodeRoles();
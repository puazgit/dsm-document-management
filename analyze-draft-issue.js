console.log('🔍 DRAFT Status Flow Analysis\n');

// Check workflow configuration in detail
const fs = require('fs');

console.log('=== 1. WORKFLOW CONFIGURATION ===');

const workflowPath = 'src/config/document-workflow.ts';
if (fs.existsSync(workflowPath)) {
  const content = fs.readFileSync(workflowPath, 'utf8');
  
  // Find all transitions from DRAFT
  const draftPattern = /{\s*from:\s*DocumentStatus\.DRAFT[\s\S]*?}/g;
  const transitions = content.match(draftPattern);
  
  if (transitions) {
    console.log(`Found ${transitions.length} transitions from DRAFT:\n`);
    
    transitions.forEach((transition, index) => {
      console.log(`--- Transition ${index + 1} ---`);
      
      // Extract key details
      const toMatch = transition.match(/to:\s*DocumentStatus\.(\w+)/);
      const roleMatch = transition.match(/requiredRoles:\s*\[(.*?)\]/);
      const permMatch = transition.match(/requiredPermissions:\s*\[(.*?)\]/);
      const descMatch = transition.match(/description:\s*['"`](.*?)['"`]/);
      
      if (toMatch) console.log(`To: ${toMatch[1]}`);
      if (roleMatch) console.log(`Required Roles: ${roleMatch[1].replace(/'/g, '')}`);
      if (permMatch) console.log(`Required Permissions: ${permMatch[1].replace(/'/g, '')}`);
      if (descMatch) console.log(`Description: ${descMatch[1]}`);
      console.log('');
    });
  } else {
    console.log('❌ No DRAFT transitions found');
  }
}

console.log('=== 2. USER ROLE ANALYSIS ===');
console.log('Current test user: kadiv@dsm.com');
console.log('Expected role: org_kadiv');
console.log('From workflow config, DRAFT transitions require:');
console.log('- DRAFT → PENDING_REVIEW: roles include "kadiv", "manager", etc.');
console.log('- DRAFT → ARCHIVED: roles include "administrator", "ppd"');
console.log('\n⚠️  Issue: User has role "org_kadiv" but workflow expects "kadiv"');

console.log('\n=== 3. API ENDPOINT CHECK ===');
console.log('API Route: /api/documents/[id]/status');
console.log('Method: GET - returns allowed transitions');
console.log('Method: POST - performs status change');

const apiRoutePath = 'src/app/api/documents/[id]/status/route.ts';
if (fs.existsSync(apiRoutePath)) {
  const apiContent = fs.readFileSync(apiRoutePath, 'utf8');
  
  if (apiContent.includes('validateUserRoleForTransition')) {
    console.log('✅ API uses role validation function');
  }
  
  if (apiContent.includes('allowedTransitions')) {
    console.log('✅ API returns allowedTransitions');
  }
  
  // Check for role mapping
  if (apiContent.includes('userRole') || apiContent.includes('role')) {
    console.log('✅ API checks user roles');
  }
} else {
  console.log('❌ API route file not found');
}

console.log('\n=== 4. ROLE MAPPING ISSUE ===');
console.log('The problem appears to be role mapping:');
console.log('- Database stores: "org_kadiv"');
console.log('- Workflow expects: "kadiv"');
console.log('- Need to map "org_kadiv" → "kadiv" for workflow validation');

console.log('\n=== 5. SOLUTION ===');
console.log('1. Update workflow validation to handle "org_" prefix');
console.log('2. Or update role mapping in API to strip "org_" prefix');
console.log('3. Or update workflow config to use full role names');

console.log('\n=== 6. TESTING STEPS ===');
console.log('1. Start server: npm run dev');
console.log('2. Login as kadiv@dsm.com');
console.log('3. Go to /documents');
console.log('4. Find "Test Draft Document for Workflow"');
console.log('5. Click "Change Status" dropdown');
console.log('6. Should see: "Submit for Review" option');
console.log('7. If empty, check browser console for API errors');

console.log('\n🔧 IMMEDIATE FIX NEEDED:');
console.log('Check validateUserRoleForTransition function in document-workflow.ts');
console.log('Add role mapping: "org_kadiv" should match "kadiv" requirement');
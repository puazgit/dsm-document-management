// Test the workflow fix
const { getAllowedTransitions, DocumentStatus } = require('./src/config/document-workflow.ts');

console.log('🧪 Testing Workflow Fix\n');

// Test parameters
const currentStatus = 'DRAFT';
const userRole = 'org_kadiv';  // This is what the user actually has
const userPermissions = ['documents.update', 'documents.read'];

console.log('Test Parameters:');
console.log(`- Current Status: ${currentStatus}`);
console.log(`- User Role: ${userRole}`);
console.log(`- User Permissions: ${JSON.stringify(userPermissions)}`);

console.log('\nExpected Results:');
console.log('- DRAFT → PENDING_REVIEW should be allowed (requires kadiv role + documents.update)');
console.log('- DRAFT → ARCHIVED should NOT be allowed (requires administrator/ppd role + documents.delete)');

console.log('\n📋 Testing getAllowedTransitions...');

try {
  const allowedTransitions = getAllowedTransitions(currentStatus, userRole, userPermissions);
  
  if (allowedTransitions.length > 0) {
    console.log(`✅ Found ${allowedTransitions.length} allowed transition(s):`);
    
    allowedTransitions.forEach((transition, index) => {
      console.log(`\n${index + 1}. ${transition.from} → ${transition.to}`);
      console.log(`   Description: ${transition.description}`);
      console.log(`   Required Roles: ${JSON.stringify(transition.requiredRoles)}`);
      console.log(`   Required Permissions: ${JSON.stringify(transition.requiredPermissions)}`);
    });
  } else {
    console.log('❌ No allowed transitions found');
  }
  
} catch (error) {
  console.log('❌ Error testing workflow:');
  console.log(error.message);
}

console.log('\n🔧 Next Steps:');
console.log('1. Start the development server: npm run dev');
console.log('2. Go to http://localhost:3001/documents');
console.log('3. Login as kadiv@dsm.com');
console.log('4. Find "Test Draft Document for Workflow"');
console.log('5. Click "Change Status" dropdown');
console.log('6. You should now see "Submit for Review" option!');
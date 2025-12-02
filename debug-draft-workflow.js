const fs = require('fs');

console.log('🔍 Testing DRAFT Document Workflow API Endpoints\n');

const documentId = 'cmimo3t0o0001kpoq7l2w6vq7'; // The DRAFT document we just created

// Test 1: Get allowed transitions for DRAFT document
console.log('📋 Test 1: Get allowed transitions for DRAFT document');
console.log(`curl -X GET "http://localhost:3001/api/documents/${documentId}/status" -H "Content-Type: application/json"`);

// Test 2: Check document workflow configuration
console.log('\n📋 Test 2: Document workflow configuration');
const workflowPath = 'src/config/document-workflow.ts';
if (fs.existsSync(workflowPath)) {
  const workflowContent = fs.readFileSync(workflowPath, 'utf8');
  
  // Extract DRAFT transitions
  const draftTransitions = workflowContent.match(/from:\s*DocumentStatus\.DRAFT[\s\S]*?(?=\s*\},?\s*\{|$)/g);
  
  if (draftTransitions) {
    console.log('✅ Found DRAFT transitions in workflow:');
    draftTransitions.forEach((transition, index) => {
      console.log(`\n--- Transition ${index + 1} ---`);
      console.log(transition.replace(/\s+/g, ' ').trim());
    });
  } else {
    console.log('❌ No DRAFT transitions found');
  }
} else {
  console.log('❌ Workflow configuration file not found');
}

// Test 3: Check DocumentStatusWorkflow component
console.log('\n📋 Test 3: DocumentStatusWorkflow component import');
const componentPath = 'src/components/documents/document-status-workflow.tsx';
if (fs.existsSync(componentPath)) {
  console.log('✅ DocumentStatusWorkflow component exists');
  
  // Check for key workflow logic
  const componentContent = fs.readFileSync(componentPath, 'utf8');
  
  if (componentContent.includes('allowedTransitions')) {
    console.log('✅ Component has allowedTransitions logic');
  }
  
  if (componentContent.includes('DropdownMenuTrigger')) {
    console.log('✅ Component has dropdown trigger');
  }
  
  if (componentContent.includes('status')) {
    console.log('✅ Component handles status prop');
  }
} else {
  console.log('❌ DocumentStatusWorkflow component not found');
}

// Test 4: Check documents list component integration
console.log('\n📋 Test 4: Documents list component integration');
const listPath = 'src/components/documents/documents-list.tsx';
if (fs.existsSync(listPath)) {
  const listContent = fs.readFileSync(listPath, 'utf8');
  
  if (listContent.includes('DocumentStatusWorkflow')) {
    console.log('✅ Documents list includes DocumentStatusWorkflow component');
  } else {
    console.log('❌ Documents list does not include DocumentStatusWorkflow component');
  }
} else {
  console.log('❌ Documents list component not found');
}

console.log('\n🔧 Debugging Steps:');
console.log('1. Open browser to http://localhost:3001/documents');
console.log('2. Login as kadiv@dsm.com');
console.log('3. Look for "Test Draft Document for Workflow" in the list');
console.log('4. Check if there\'s a status dropdown or workflow buttons');
console.log('5. If no workflow options appear, check browser console for errors');

console.log('\n💡 Expected behavior:');
console.log('- Document should show status "DRAFT" badge');
console.log('- There should be a dropdown menu or workflow actions');
console.log('- Available actions: "Submit for Review" and "Archive"');

console.log('\n🐛 If workflow options are missing, possible causes:');
console.log('- User role (org_kadiv) may not have required permissions');
console.log('- Component may not be properly imported/rendered');
console.log('- API endpoint may be failing to return transitions');
console.log('- JavaScript errors in browser console');
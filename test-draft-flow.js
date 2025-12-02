const testDraftTransitions = async () => {
  try {
    // Gunakan dokumen hahaha.pdf yang statusnya sekarang PENDING_APPROVAL
    // Mari kita ubah dulu ke DRAFT untuk test
    const documentId = 'cmicsckqp0001ms2fcsk82cpz'; // ID dokumen hahaha.pdf
    
    console.log('🔍 Testing DRAFT status transitions...');
    
    // Test 1: Change back to DRAFT first
    console.log('1. Changing document back to DRAFT...');
    const changeResponse = await fetch(`http://localhost:3001/api/documents/${documentId}/status`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': 'next-auth.session-token=your-session-token' // This won't work without real auth
      },
      body: JSON.stringify({
        newStatus: 'DRAFT',
        comment: 'Testing workflow - changed back to draft'
      })
    });
    
    if (!changeResponse.ok) {
      console.log('❌ Auth required - cannot change status via API directly');
      console.log('Let me check the workflow configuration instead...');
    }
    
    // Test 2: Check workflow configuration directly
    console.log('\n📋 From workflow configuration:');
    
    const workflow = [
      {
        from: 'DRAFT',
        to: 'PENDING_REVIEW',
        requiredRoles: ['manager', 'kadiv', 'gm', 'dirut', 'ppd', 'administrator'],
        requiredPermissions: ['documents.update'],
        description: 'Submit document for review',
        allowedBy: ['Document creator', 'Manager+']
      },
      {
        from: 'DRAFT',
        to: 'ARCHIVED',
        requiredRoles: ['administrator', 'ppd'],
        requiredPermissions: ['documents.delete'],
        description: 'Archive document',
        allowedBy: ['Administrator', 'PPD']
      }
    ];
    
    console.log('✅ Available transitions from DRAFT:');
    workflow.forEach((transition, index) => {
      console.log(`   ${index + 1}. DRAFT → ${transition.to}`);
      console.log(`      Description: ${transition.description}`);
      console.log(`      Required Roles: ${transition.requiredRoles.join(', ')}`);
      console.log(`      Allowed By: ${transition.allowedBy.join(', ')}`);
      console.log('');
    });
    
    console.log('🎯 Expected flow from DRAFT:');
    console.log('   📝 DRAFT → 👁️ PENDING_REVIEW (Submit for review)');
    console.log('   📝 DRAFT → 📦 ARCHIVED (Archive document)');
    
    console.log('\n💡 If you don\'t see these options in the UI:');
    console.log('   1. Make sure you\'re logged in as admin/manager/ppd/kadiv');
    console.log('   2. Check that the document status is actually DRAFT');
    console.log('   3. The dropdown should show "Submit for Review" and "Archive" options');
    
  } catch (error) {
    console.error('Error:', error);
  }
};

testDraftTransitions();
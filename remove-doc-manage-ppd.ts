import { prisma } from './src/lib/prisma';

async function removeDocumentManage() {
  console.log('🔄 Removing DOCUMENT_MANAGE from ppd.pusat...\n');
  
  // Get role
  const role = await prisma.role.findUnique({
    where: { name: 'ppd.pusat' }
  });
  
  if (!role) {
    console.log('❌ Role ppd.pusat not found');
    return;
  }
  
  // Get DOCUMENT_MANAGE capability
  const capability = await prisma.roleCapability.findUnique({
    where: { name: 'DOCUMENT_MANAGE' }
  });
  
  if (!capability) {
    console.log('❌ DOCUMENT_MANAGE capability not found');
    return;
  }
  
  // Remove assignment
  const deleted = await prisma.roleCapabilityAssignment.deleteMany({
    where: {
      roleId: role.id,
      capabilityId: capability.id
    }
  });
  
  console.log(`✅ Removed ${deleted.count} assignment(s)`);
  console.log('\n📋 DOCUMENT_MANAGE is a SUPER capability that bypasses all checks!');
  console.log('   It grants access to ALL workflow transitions including approve.\n');
  
  console.log('✅ Now ppd.pusat will have:');
  console.log('   - DOCUMENT_FULL_ACCESS: View ALL documents');
  console.log('   - DOCUMENT_EDIT/CREATE/DELETE: Manage documents');
  console.log('   - DOCUMENT_PUBLISH: Publish approved documents');
  console.log('   - But NO approve capability!\n');
  
  console.log('⚠️  User must LOGOUT and LOGIN again!\n');
  
  await prisma.$disconnect();
}

removeDocumentManage();

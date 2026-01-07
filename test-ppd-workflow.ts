import { prisma } from './src/lib/prisma';
import { getAllowedTransitions, DocumentStatus } from './src/config/document-workflow';
import { getUserCapabilities, type CapabilityUser } from './src/lib/capabilities';

async function testPpdWorkflow() {
  console.log('🔍 Testing ppd.pusat workflow transitions...\n');
  
  // Get user
  const user = await prisma.user.findUnique({
    where: { email: 'ppd.pusat@dsm.com' },
    include: {
      userRoles: {
        where: { isActive: true },
        include: {
          role: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    }
  });
  
  if (!user) {
    console.log('❌ User not found');
    return;
  }
  
  // Build capability user
  const capUser: CapabilityUser = {
    id: user.id,
    email: user.email,
    roles: user.userRoles.map(ur => ({
      id: ur.role.id,
      name: ur.role.name
    }))
  };
  
  // Get capabilities
  const userCapabilities = await getUserCapabilities(capUser);
  
  console.log('User:', user.email);
  console.log('Capabilities:', userCapabilities);
  console.log('');
  
  // Check specific capabilities
  console.log('Has DOCUMENT_APPROVE?', userCapabilities.includes('DOCUMENT_APPROVE') ? '❌ YES (PROBLEM!)' : '✅ NO');
  console.log('Has DOCUMENT_MANAGE?', userCapabilities.includes('DOCUMENT_MANAGE') ? '❌ YES (PROBLEM!)' : '✅ NO');
  console.log('Has ADMIN_ACCESS?', userCapabilities.includes('ADMIN_ACCESS') ? '⚠️  YES' : '✅ NO');
  console.log('');
  
  // Test workflow for PENDING_APPROVAL status
  console.log('📋 Testing transitions from PENDING_APPROVAL status:\n');
  
  const allowedTransitions = await getAllowedTransitions(
    DocumentStatus.PENDING_APPROVAL,
    userCapabilities
  );
  
  console.log(`Found ${allowedTransitions.length} allowed transition(s):`);
  allowedTransitions.forEach(t => {
    console.log(`  • ${t.from} → ${t.to}`);
    console.log(`    Required: ${t.requiredCapabilities.join(', ')}`);
    console.log(`    Description: ${t.description}`);
    console.log('');
  });
  
  // Check if APPROVED and REJECTED are in the list
  const hasApproved = allowedTransitions.some(t => t.to === DocumentStatus.APPROVED);
  const hasRejected = allowedTransitions.some(t => t.to === DocumentStatus.REJECTED);
  
  console.log('Results:');
  console.log('  PENDING_APPROVAL → APPROVED:', hasApproved ? '❌ VISIBLE (PROBLEM!)' : '✅ HIDDEN (CORRECT)');
  console.log('  PENDING_APPROVAL → REJECTED:', hasRejected ? '❌ VISIBLE (PROBLEM!)' : '✅ HIDDEN (CORRECT)');
  console.log('');
  
  if (hasApproved || hasRejected) {
    console.log('❌ PROBLEM DETECTED!');
    console.log('   User can still see approve/reject options.');
    console.log('');
    console.log('🔍 Debugging:');
    
    // Check database transitions
    const dbTransitions = await prisma.workflowTransition.findMany({
      where: {
        fromStatus: 'PENDING_APPROVAL',
        toStatus: { in: ['APPROVED', 'REJECTED'] },
        isActive: true
      }
    });
    
    console.log(`   Database has ${dbTransitions.length} transition(s):`);
    dbTransitions.forEach(t => {
      console.log(`     • ${t.fromStatus} → ${t.toStatus}`);
      console.log(`       Required: ${t.requiredPermission}`);
      console.log(`       User has it? ${userCapabilities.includes(t.requiredPermission || '')}`);
    });
  } else {
    console.log('✅ TEST PASSED!');
    console.log('   User correctly cannot see approve/reject options.');
  }
  
  await prisma.$disconnect();
}

testPpdWorkflow();

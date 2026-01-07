import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkWorkflowTransition() {
  console.log('🔍 Checking IN_REVIEW → PENDING_APPROVAL Transition for ppd.pusat\n');
  console.log('='.repeat(80));
  
  try {
    // 1. Get ppd.pusat capabilities
    const ppdRole = await prisma.role.findUnique({
      where: { name: 'ppd.pusat' },
      include: {
        capabilityAssignments: {
          include: {
            capability: true
          }
        }
      }
    });

    if (!ppdRole) {
      console.log('❌ ppd.pusat role not found');
      return;
    }

    const capabilities = ppdRole.capabilityAssignments.map(ca => ca.capability.name);
    
    console.log('\n📋 PPD.PUSAT CAPABILITIES:');
    console.log('─'.repeat(80));
    console.log(`Total: ${capabilities.length}`);
    
    const relevantCaps = [
      'ADMIN_ACCESS',
      'DOCUMENT_FULL_ACCESS',
      'DOCUMENT_EDIT',
      'DOCUMENT_APPROVE',
      'WORKFLOW_APPROVE',
      'WORKFLOW_MANAGE'
    ];
    
    relevantCaps.forEach(cap => {
      const has = capabilities.includes(cap);
      console.log(`   ${has ? '✅' : '❌'} ${cap}`);
    });

    // 2. Check workflow transition in database
    console.log('\n\n🔄 WORKFLOW TRANSITION: IN_REVIEW → PENDING_APPROVAL');
    console.log('─'.repeat(80));
    
    const transition = await prisma.workflowTransition.findFirst({
      where: {
        fromStatus: 'IN_REVIEW',
        toStatus: 'PENDING_APPROVAL',
        isActive: true
      }
    });

    if (!transition) {
      console.log('❌ Transition not found in database');
    } else {
      console.log('✅ Transition exists in database:');
      console.log(`   Min Level: ${transition.minLevel}`);
      console.log(`   Required Permission: ${transition.requiredPermission || 'N/A'}`);
      console.log(`   Allowed By: ${transition.allowedByLabel || 'N/A'}`);
      console.log(`   Description: ${transition.description}`);
      console.log(`   Is Active: ${transition.isActive}`);
    }

    // 3. Check hardcoded config
    console.log('\n\n📝 HARDCODED CONFIG (document-workflow.ts):');
    console.log('─'.repeat(80));
    console.log('   From: IN_REVIEW');
    console.log('   To: PENDING_APPROVAL');
    console.log('   Min Level: 70 (Manager+)');
    console.log('   Required Permissions: [\'documents.update\'] ← OLD FORMAT!');
    console.log('   Allowed By: [\'Manager\', \'Administrator\']');

    // 4. Analyze access
    console.log('\n\n🔐 ACCESS ANALYSIS:');
    console.log('─'.repeat(80));
    
    const hasAdminAccess = capabilities.includes('ADMIN_ACCESS');
    const hasFullAccess = capabilities.includes('DOCUMENT_FULL_ACCESS');
    const hasDocEdit = capabilities.includes('DOCUMENT_EDIT');
    const hasWorkflowApprove = capabilities.includes('WORKFLOW_APPROVE');
    
    console.log('\n📊 Based on HARDCODED config (OLD):');
    console.log(`   Required: 'documents.update' permission (OLD FORMAT)`);
    console.log(`   ❌ ppd.pusat does NOT have 'documents.update' (old format)`);
    console.log(`   ❌ Config uses old permission format, not capabilities!`);
    
    console.log('\n📊 Based on CAPABILITIES (NEW):');
    console.log(`   ADMIN_ACCESS: ${hasAdminAccess ? '✅' : '❌'}`);
    console.log(`   DOCUMENT_FULL_ACCESS: ${hasFullAccess ? '✅' : '❌'}`);
    console.log(`   DOCUMENT_EDIT: ${hasDocEdit ? '✅' : '❌'}`);
    console.log(`   WORKFLOW_APPROVE: ${hasWorkflowApprove ? '✅' : '❌'}`);

    // 5. Check database transition permission
    if (transition && transition.requiredPermission) {
      const hasRequiredPerm = capabilities.includes(transition.requiredPermission);
      console.log(`\n📊 Based on DATABASE transition:`);
      console.log(`   Required: ${transition.requiredPermission}`);
      console.log(`   Has it: ${hasRequiredPerm ? '✅' : '❌'}`);
    }

    // 6. Final verdict
    console.log('\n\n📌 VERDICT:');
    console.log('─'.repeat(80));
    
    if (hasAdminAccess || hasFullAccess) {
      console.log('✅ ppd.pusat SHOULD be able to change status (has ADMIN_ACCESS/DOCUMENT_FULL_ACCESS)');
    } else if (transition && transition.requiredPermission && capabilities.includes(transition.requiredPermission)) {
      console.log('✅ ppd.pusat can change status (has required permission from DB)');
    } else if (hasDocEdit) {
      console.log('⚠️  ppd.pusat has DOCUMENT_EDIT but workflow config uses OLD permission format');
      console.log('   Need to update workflow config to use new capabilities!');
    } else {
      console.log('❌ ppd.pusat CANNOT change status - missing required capabilities');
    }

    console.log('\n💡 RECOMMENDATION:');
    console.log('─'.repeat(80));
    console.log('   1. Update workflow transitions in DATABASE to use new capability names');
    console.log('   2. OR ensure ppd.pusat has the required capabilities');
    console.log('   3. Check getAllowedTransitions() function uses capabilities, not old permissions');

    console.log('\n' + '='.repeat(80));
    console.log('✅ Check completed\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkWorkflowTransition();

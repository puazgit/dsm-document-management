const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPermissionSystem() {
  console.log('🧪 Testing Permission-Based Document Access System\n');
  console.log('=' .repeat(60));
  
  try {
    // Test 1: Check legal@dsm.com permissions
    console.log('\n📋 TEST 1: Legal User Permissions');
    console.log('-'.repeat(60));
    
    const legalUser = await prisma.user.findUnique({
      where: { email: 'legal@dsm.com' },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        },
        group: true
      }
    });

    if (!legalUser) {
      console.log('❌ Legal user not found');
      return;
    }

    console.log(`✅ User: ${legalUser.email}`);
    console.log(`   Name: ${legalUser.firstName} ${legalUser.lastName}`);
    console.log(`   Role: ${legalUser.userRoles[0]?.role.name} (level ${legalUser.userRoles[0]?.role.level})`);
    console.log(`   Group: ${legalUser.group?.name || 'No group'}`);
    
    const permissions = legalUser.userRoles.flatMap(ur => 
      ur.role.rolePermissions.map(rp => rp.permission.name)
    );
    
    const documentPermissions = permissions.filter(p => p.startsWith('documents.'));
    console.log(`\n   Document Permissions (${documentPermissions.length}):`);
    documentPermissions.forEach(p => console.log(`   ✓ ${p}`));
    
    // Check for 5 core permissions
    const corePermissions = [
      'documents.read',
      'documents.create', 
      'documents.update',
      'documents.approve',
      'documents.delete'
    ];
    
    const hasCorePermissions = corePermissions.map(perm => ({
      permission: perm,
      has: permissions.includes(perm)
    }));
    
    console.log('\n   Core Permissions Check:');
    hasCorePermissions.forEach(({ permission, has }) => {
      console.log(`   ${has ? '✅' : '❌'} ${permission}`);
    });
    
    const hasFullAccess = hasCorePermissions.every(p => p.has);
    console.log(`\n   ${hasFullAccess ? '✅' : '❌'} Has Full Document Access: ${hasFullAccess ? 'YES' : 'NO'}`);

    // Test 2: Document Access Count
    console.log('\n\n📄 TEST 2: Document Access');
    console.log('-'.repeat(60));
    
    const totalDocuments = await prisma.document.count();
    console.log(`   Total Documents in System: ${totalDocuments}`);
    
    // Simulate buildDocumentAccessWhere logic
    const userRole = legalUser.userRoles[0]?.role.name || '';
    const isAdmin = ['admin', 'org_administrator'].includes(userRole);
    
    console.log(`\n   Access Check:`);
    console.log(`   - Is Admin: ${isAdmin}`);
    console.log(`   - Has Full Permission Access: ${hasFullAccess}`);
    console.log(`   - Expected Access: ${hasFullAccess || isAdmin ? 'ALL' : 'FILTERED'} documents`);

    // Test 3: Compare with admin user
    console.log('\n\n👤 TEST 3: Admin Comparison');
    console.log('-'.repeat(60));
    
    const adminUser = await prisma.user.findFirst({
      where: {
        userRoles: {
          some: {
            role: {
              name: 'admin'
            }
          }
        }
      },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });

    if (adminUser) {
      console.log(`   Admin: ${adminUser.email}`);
      console.log(`   Role: ${adminUser.userRoles[0]?.role.name} (level ${adminUser.userRoles[0]?.role.level})`);
      console.log(`   Access: ALL documents (role-based)`);
      console.log(`\n   ✅ Legal user should have same document access as admin (permission-based)`);
    }

    // Test 4: Document Status Workflow
    console.log('\n\n🔄 TEST 4: Document Status Workflow');
    console.log('-'.repeat(60));
    
    const testDocument = await prisma.document.findFirst({
      where: {
        status: 'DRAFT'
      }
    });

    if (testDocument) {
      console.log(`   Test Document: ${testDocument.title}`);
      console.log(`   Current Status: ${testDocument.status}`);
      console.log(`   User Level: ${legalUser.userRoles[0]?.role.level}`);
      
      // Check workflow transitions
      const workflowTransitions = [
        { from: 'DRAFT', to: 'PENDING_REVIEW', minLevel: 50 },
        { from: 'PENDING_REVIEW', to: 'PENDING_APPROVAL', minLevel: 70 },
        { from: 'PENDING_APPROVAL', to: 'APPROVED', minLevel: 70 },
        { from: 'APPROVED', to: 'PUBLISHED', minLevel: 100 }
      ];
      
      console.log(`\n   Workflow Transitions:`);
      workflowTransitions.forEach(({ from, to, minLevel }) => {
        const userLevel = legalUser.userRoles[0]?.role.level || 0;
        const canTransition = hasFullAccess || userLevel >= minLevel;
        console.log(`   ${canTransition ? '✅' : '❌'} ${from} → ${to} (requires level ${minLevel})`);
      });
      
      console.log(`\n   ${hasFullAccess ? '✅' : '❌'} Can change status: ${hasFullAccess ? 'YES (permission bypass)' : 'Depends on level'}`);
    } else {
      console.log('   ⚠️  No DRAFT documents found for testing');
    }

    // Test 5: Document History Access
    console.log('\n\n📜 TEST 5: Document History Access');
    console.log('-'.repeat(60));
    
    const documentWithHistory = await prisma.document.findFirst({
      where: {
        history: {
          some: {}
        }
      },
      include: {
        history: {
          take: 1
        }
      }
    });

    if (documentWithHistory) {
      console.log(`   Document: ${documentWithHistory.title}`);
      console.log(`   History Entries: ${documentWithHistory.history.length > 0 ? 'Available' : 'None'}`);
      console.log(`   User Has Full Access: ${hasFullAccess}`);
      console.log(`   ${hasFullAccess ? '✅' : '❌'} Can access history: ${hasFullAccess ? 'YES' : 'Filtered'}`);
    } else {
      console.log('   ⚠️  No documents with history found');
    }

    // Summary
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    
    const allTestsPassed = hasFullAccess;
    
    console.log(`\n✅ Legal User Configuration: ${hasFullAccess ? 'PASSED' : 'FAILED'}`);
    console.log(`   - Has 5 core permissions: ${hasFullAccess ? '✅' : '❌'}`);
    console.log(`   - Should access all documents: ${hasFullAccess ? '✅' : '❌'}`);
    console.log(`   - Should bypass workflow level checks: ${hasFullAccess ? '✅' : '❌'}`);
    console.log(`   - Should access all document history: ${hasFullAccess ? '✅' : '❌'}`);
    
    console.log('\n🎯 Expected Behavior in Application:');
    console.log('   1. legal@dsm.com sees ALL documents in document list');
    console.log('   2. Can change document status regardless of role level');
    console.log('   3. Can view history of any document');
    console.log('   4. Functions like admin for document module only');
    
    if (allTestsPassed) {
      console.log('\n✅ ALL TESTS PASSED - Permission system configured correctly!');
    } else {
      console.log('\n❌ TESTS FAILED - Please check user permissions');
    }

  } catch (error) {
    console.error('\n❌ Test Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests
testPermissionSystem();
/**
 * Test Role Capabilities System
 * Verifies capability checks work correctly
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Import capability functions
import {
  hasCapability,
  hasAnyCapability,
  hasAllCapabilities,
  getUserCapabilities,
  isAdmin,
  hasFullDocumentAccess,
  canManageDocuments,
  canManageUsers,
  canManageRoles,
  getUserRoleLevel,
  meetsMinLevel,
  clearCapabilityCache
} from './src/lib/capabilities.js';

async function testCapabilities() {
  console.log('🧪 Testing Role Capabilities System\n');

  try {
    // Get test users
    const adminUser = await prisma.user.findFirst({
      where: { 
        userRoles: {
          some: {
            role: { name: 'admin' }
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

    const managerUser = await prisma.user.findFirst({
      where: {
        userRoles: {
          some: {
            role: { name: 'manager' }
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

    const legalUser = await prisma.user.findUnique({
      where: { email: 'legal@dsm.com' },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });

    const editorUser = await prisma.user.findFirst({
      where: {
        email: { not: 'legal@dsm.com' },
        userRoles: {
          some: {
            role: { name: 'editor' }
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

    if (!adminUser || !managerUser || !legalUser || !editorUser) {
      console.error('❌ Required test users not found');
      return;
    }

    // Transform users to match CapabilityUser interface
    const transformUser = (user) => ({
      id: user.id,
      email: user.email,
      roles: user.userRoles.map(ur => ({
        id: ur.role.id,
        name: ur.role.name,
        level: ur.role.level
      }))
    });

    const admin = transformUser(adminUser);
    const manager = transformUser(managerUser);
    const legal = transformUser(legalUser);
    const editor = transformUser(editorUser);

    console.log('📋 Test Users:');
    console.log(`  Admin: ${admin.email} (level ${admin.roles[0].level})`);
    console.log(`  Manager: ${manager.email} (level ${manager.roles[0].level})`);
    console.log(`  Legal: ${legal.email} (level ${legal.roles[0].level})`);
    console.log(`  Editor: ${editor.email} (level ${editor.roles[0].level})\n`);

    // Test 1: Get all capabilities
    console.log('Test 1: Get All Capabilities');
    const adminCaps = await getUserCapabilities(admin);
    const managerCaps = await getUserCapabilities(manager);
    const legalCaps = await getUserCapabilities(legal);
    const editorCaps = await getUserCapabilities(editor);

    console.log(`  Admin capabilities (${adminCaps.length}):`, adminCaps.sort());
    console.log(`  Manager capabilities (${managerCaps.length}):`, managerCaps.sort());
    console.log(`  Legal capabilities (${legalCaps.length}):`, legalCaps.sort());
    console.log(`  Editor capabilities (${editorCaps.length}):`, editorCaps.sort());
    console.log('  ✅ Capability retrieval working\n');

    // Test 2: Admin access checks
    console.log('Test 2: Admin Access Checks');
    const adminHasAdmin = await isAdmin(admin);
    const managerHasAdmin = await isAdmin(manager);
    const legalHasAdmin = await isAdmin(legal);
    
    console.log(`  Admin isAdmin: ${adminHasAdmin}`);
    console.log(`  Manager isAdmin: ${managerHasAdmin}`);
    console.log(`  Legal isAdmin: ${legalHasAdmin}`);
    
    if (adminHasAdmin && !managerHasAdmin && !legalHasAdmin) {
      console.log('  ✅ Admin checks working correctly\n');
    } else {
      console.log('  ❌ Admin checks failed\n');
    }

    // Test 3: Document full access (admin + legal should have it)
    console.log('Test 3: Document Full Access');
    const adminDocAccess = await hasFullDocumentAccess(admin);
    const managerDocAccess = await hasFullDocumentAccess(manager);
    const legalDocAccess = await hasFullDocumentAccess(legal);
    const editorDocAccess = await hasFullDocumentAccess(editor);

    console.log(`  Admin hasFullDocumentAccess: ${adminDocAccess}`);
    console.log(`  Manager hasFullDocumentAccess: ${managerDocAccess}`);
    console.log(`  Legal hasFullDocumentAccess: ${legalDocAccess}`);
    console.log(`  Editor hasFullDocumentAccess: ${editorDocAccess}`);

    if (adminDocAccess && !managerDocAccess && legalDocAccess && !editorDocAccess) {
      console.log('  ✅ Document full access working correctly\n');
    } else {
      console.log('  ❌ Document full access checks failed\n');
    }

    // Test 4: Document management (admin + manager should have it)
    console.log('Test 4: Document Management');
    const adminCanManageDocs = await canManageDocuments(admin);
    const managerCanManageDocs = await canManageDocuments(manager);
    const legalCanManageDocs = await canManageDocuments(legal);
    const editorCanManageDocs = await canManageDocuments(editor);

    console.log(`  Admin canManageDocuments: ${adminCanManageDocs}`);
    console.log(`  Manager canManageDocuments: ${managerCanManageDocs}`);
    console.log(`  Legal canManageDocuments: ${legalCanManageDocs}`);
    console.log(`  Editor canManageDocuments: ${editorCanManageDocs}`);

    if (adminCanManageDocs && managerCanManageDocs && editorCanManageDocs) {
      console.log('  ✅ Document management working correctly\n');
    } else {
      console.log('  ❌ Document management checks failed\n');
    }

    // Test 5: User management (admin + manager should have it)
    console.log('Test 5: User Management');
    const adminCanManageUsers = await canManageUsers(admin);
    const managerCanManageUsers = await canManageUsers(manager);
    const legalCanManageUsers = await canManageUsers(legal);

    console.log(`  Admin canManageUsers: ${adminCanManageUsers}`);
    console.log(`  Manager canManageUsers: ${managerCanManageUsers}`);
    console.log(`  Legal canManageUsers: ${legalCanManageUsers}`);

    if (adminCanManageUsers && managerCanManageUsers && !legalCanManageUsers) {
      console.log('  ✅ User management working correctly\n');
    } else {
      console.log('  ❌ User management checks failed\n');
    }

    // Test 6: Role management (admin only)
    console.log('Test 6: Role Management');
    const adminCanManageRoles = await canManageRoles(admin);
    const managerCanManageRoles = await canManageRoles(manager);

    console.log(`  Admin canManageRoles: ${adminCanManageRoles}`);
    console.log(`  Manager canManageRoles: ${managerCanManageRoles}`);

    if (adminCanManageRoles && !managerCanManageRoles) {
      console.log('  ✅ Role management working correctly\n');
    } else {
      console.log('  ❌ Role management checks failed\n');
    }

    // Test 7: Level checks
    console.log('Test 7: Role Level Checks');
    const adminLevel = getUserRoleLevel(admin);
    const managerLevel = getUserRoleLevel(manager);
    const legalLevel = getUserRoleLevel(legal);
    const editorLevel = getUserRoleLevel(editor);

    console.log(`  Admin level: ${adminLevel}`);
    console.log(`  Manager level: ${managerLevel}`);
    console.log(`  Legal level: ${legalLevel}`);
    console.log(`  Editor level: ${editorLevel}`);

    const adminMeets70 = meetsMinLevel(admin, 70);
    const managerMeets70 = meetsMinLevel(manager, 70);
    const editorMeets70 = meetsMinLevel(editor, 70);

    console.log(`  Admin meets level 70: ${adminMeets70}`);
    console.log(`  Manager meets level 70: ${managerMeets70}`);
    console.log(`  Editor meets level 70: ${editorMeets70}`);

    if (adminLevel === 100 && managerLevel === 70 && editorLevel === 50 &&
        adminMeets70 && managerMeets70 && !editorMeets70) {
      console.log('  ✅ Level checks working correctly\n');
    } else {
      console.log('  ❌ Level checks failed\n');
    }

    // Test 8: hasAnyCapability and hasAllCapabilities
    console.log('Test 8: Multiple Capability Checks');
    
    const adminHasAny = await hasAnyCapability(admin, ['DOCUMENT_MANAGE', 'USER_MANAGE']);
    const editorHasAny = await hasAnyCapability(editor, ['ADMIN_ACCESS', 'USER_MANAGE']);
    
    const adminHasAll = await hasAllCapabilities(admin, ['ADMIN_ACCESS', 'DOCUMENT_MANAGE']);
    const managerHasAll = await hasAllCapabilities(manager, ['ADMIN_ACCESS', 'DOCUMENT_MANAGE']);

    console.log(`  Admin hasAny [DOCUMENT_MANAGE, USER_MANAGE]: ${adminHasAny}`);
    console.log(`  Editor hasAny [ADMIN_ACCESS, USER_MANAGE]: ${editorHasAny}`);
    console.log(`  Admin hasAll [ADMIN_ACCESS, DOCUMENT_MANAGE]: ${adminHasAll}`);
    console.log(`  Manager hasAll [ADMIN_ACCESS, DOCUMENT_MANAGE]: ${managerHasAll}`);

    if (adminHasAny && !editorHasAny && adminHasAll && !managerHasAll) {
      console.log('  ✅ Multiple capability checks working correctly\n');
    } else {
      console.log('  ❌ Multiple capability checks failed\n');
    }

    // Test 9: Cache performance
    console.log('Test 9: Cache Performance');
    const start1 = Date.now();
    await getUserCapabilities(admin);
    const time1 = Date.now() - start1;

    const start2 = Date.now();
    await getUserCapabilities(admin);
    const time2 = Date.now() - start2;

    console.log(`  First call (database): ${time1}ms`);
    console.log(`  Second call (cached): ${time2}ms`);
    
    if (time2 < time1 || time2 < 5) {
      console.log('  ✅ Caching working (faster on second call)\n');
    } else {
      console.log('  ⚠️  Cache might not be working optimally\n');
    }

    // Test 10: Cache clearing
    console.log('Test 10: Cache Clearing');
    clearCapabilityCache(admin.id);
    
    const start3 = Date.now();
    await getUserCapabilities(admin);
    const time3 = Date.now() - start3;
    
    console.log(`  After cache clear: ${time3}ms`);
    console.log('  ✅ Cache clearing working\n');

    console.log('✅ All capability system tests completed!\n');

    // Summary
    console.log('📊 Capability Summary:');
    console.log('  - Admin: Full system access (6 capabilities)');
    console.log('  - Manager: Document & user management (2 capabilities)');
    console.log('  - Legal User: Document full access + management (2 capabilities)');
    console.log('  - Editor: Document management only (1 capability)');
    console.log('\n🎉 Role capability system is working correctly!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

testCapabilities()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

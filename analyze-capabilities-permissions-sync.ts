import { prisma } from './src/lib/prisma';

(async () => {
  try {
    console.log('🔍 Analyzing Relationship Between Capabilities and Permissions\n');
    console.log('═'.repeat(70));
    
    // Get a sample role with both capabilities and permissions
    const adminRole = await prisma.role.findFirst({
      where: { name: 'admin' },
      include: {
        capabilityAssignments: {
          include: {
            capability: true
          }
        },
        rolePermissions: {
          where: { isGranted: true },
          include: {
            permission: true
          }
        }
      }
    });
    
    if (!adminRole) {
      console.log('❌ Admin role not found');
      return;
    }
    
    console.log('\n📊 ROLE: admin');
    console.log('─'.repeat(70));
    
    console.log('\n1️⃣  CAPABILITIES (from role_capability_assignments table):');
    console.log('   Used by: /admin/capabilities page');
    console.log('   Database: role_capabilities + role_capability_assignments');
    console.log('   Purpose: High-level access control (ADMIN_ACCESS, DOCUMENT_FULL_ACCESS)');
    console.log('');
    if (adminRole.capabilityAssignments.length === 0) {
      console.log('   ⚠️  No capabilities assigned');
    } else {
      adminRole.capabilityAssignments.forEach((assignment, index) => {
        console.log(`   ${index + 1}. ${assignment.capability.name}`);
        console.log(`      - ${assignment.capability.description || 'No description'}`);
        console.log(`      - Category: ${assignment.capability.category || 'none'}`);
      });
    }
    
    console.log('\n2️⃣  PERMISSIONS (from role_permissions table):');
    console.log('   Used by: /admin/roles page');
    console.log('   Database: permissions + role_permissions');
    console.log('   Purpose: Granular access control (pdf.download, documents.create)');
    console.log('');
    if (adminRole.rolePermissions.length === 0) {
      console.log('   ⚠️  No permissions assigned');
    } else {
      const permissionCount = adminRole.rolePermissions.length;
      console.log(`   Total: ${permissionCount} permissions`);
      console.log('   Sample (first 10):');
      adminRole.rolePermissions.slice(0, 10).forEach((rp, index) => {
        console.log(`   ${index + 1}. ${rp.permission.name}`);
        console.log(`      - ${rp.permission.displayName}`);
        console.log(`      - Module: ${rp.permission.module}`);
      });
      if (permissionCount > 10) {
        console.log(`   ... and ${permissionCount - 10} more`);
      }
    }
    
    console.log('\n\n🔗 RELATIONSHIP ANALYSIS:');
    console.log('═'.repeat(70));
    console.log('');
    console.log('❌ NO AUTOMATIC SYNC - They are INDEPENDENT systems!');
    console.log('');
    console.log('┌─────────────────────────────────────────────────────────────────┐');
    console.log('│ /admin/capabilities                                             │');
    console.log('│ - Manages: role_capability_assignments table                    │');
    console.log('│ - Controls: High-level capabilities (ADMIN_ACCESS, etc)         │');
    console.log('│ - Changes: Only affect capability assignments                   │');
    console.log('│ - Does NOT affect: role_permissions table                       │');
    console.log('└─────────────────────────────────────────────────────────────────┘');
    console.log('                             ↓ ↑');
    console.log('                      NO SYNC / INDEPENDENT');
    console.log('                             ↓ ↑');
    console.log('┌─────────────────────────────────────────────────────────────────┐');
    console.log('│ /admin/roles                                                    │');
    console.log('│ - Manages: role_permissions table                               │');
    console.log('│ - Controls: Granular permissions (pdf.download, etc)            │');
    console.log('│ - Changes: Only affect permission assignments                   │');
    console.log('│ - Does NOT affect: role_capability_assignments table            │');
    console.log('└─────────────────────────────────────────────────────────────────┘');
    
    console.log('\n\n📝 PRACTICAL EXAMPLE:');
    console.log('═'.repeat(70));
    console.log('');
    console.log('Scenario: You assign "DOCUMENT_FULL_ACCESS" capability to "editor" role');
    console.log('');
    console.log('What changes:');
    console.log('  ✅ role_capability_assignments table: New row added');
    console.log('  ✅ /admin/capabilities page: Shows editor has DOCUMENT_FULL_ACCESS');
    console.log('  ✅ hasCapability(user, "DOCUMENT_FULL_ACCESS"): Returns true');
    console.log('');
    console.log('What DOES NOT change:');
    console.log('  ❌ role_permissions table: Unchanged');
    console.log('  ❌ /admin/roles page: Still shows same permissions list');
    console.log('  ❌ PDF permissions: User still needs pdf.download permission separately');
    console.log('');
    console.log('To give full access, you must:');
    console.log('  1. Assign capability in /admin/capabilities (high-level)');
    console.log('  2. Assign permissions in /admin/roles (granular control)');
    
    console.log('\n\n💡 RECOMMENDATION:');
    console.log('═'.repeat(70));
    console.log('');
    console.log('Use BOTH systems together:');
    console.log('  • Capabilities = Coarse-grained access (page access, admin bypass)');
    console.log('  • Permissions = Fine-grained access (PDF download, document create)');
    console.log('');
    console.log('Example for "editor" role:');
    console.log('  Capability: DOCUMENT_FULL_ACCESS (can access document pages)');
    console.log('  Permissions: pdf.download, documents.create, documents.update, etc');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();

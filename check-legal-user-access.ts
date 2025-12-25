import { prisma } from './src/lib/prisma';

(async () => {
  try {
    console.log('🔍 Analyzing legal@dsm.com Access Rights\n');
    console.log('═'.repeat(70));
    
    // 1. Get user info with roles
    const user = await prisma.user.findUnique({
      where: { email: 'legal@dsm.com' },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                capabilityAssignments: {
                  include: {
                    capability: true
                  }
                },
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
    
    if (!user) {
      console.log('❌ User legal@dsm.com not found');
      return;
    }
    
    console.log('\n👤 USER INFO:');
    console.log('─'.repeat(70));
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.name}`);
    console.log(`Group: ${user.group?.name || 'No group'}`);
    console.log(`Total Roles: ${user.userRoles.length}`);
    
    if (user.userRoles.length === 0) {
      console.log('\n❌ ERROR: User has NO ROLES assigned!');
      console.log('Action required: Assign Editor role to this user at /admin/users');
      return;
    }
    
    console.log('\n\n🎭 ROLES ASSIGNED:');
    console.log('═'.repeat(70));
    user.userRoles.forEach((ur, index) => {
      const role = ur.role;
      console.log(`\n${index + 1}. ${role.displayName} (${role.name})`);
      console.log(`   Level: ${role.level}`);
      console.log(`   System Role: ${role.isSystem}`);
      console.log(`   Assigned at: ${ur.assignedAt.toISOString()}`);
      
      // Capabilities
      console.log(`\n   📋 CAPABILITIES (${role.capabilityAssignments.length}):`);
      if (role.capabilityAssignments.length === 0) {
        console.log('      ⚠️  No capabilities assigned');
      } else {
        role.capabilityAssignments.forEach(ca => {
          console.log(`      ✅ ${ca.capability.name}`);
          console.log(`         ${ca.capability.description}`);
        });
      }
      
      // Permissions
      console.log(`\n   🔐 PERMISSIONS (${role.rolePermissions.length}):`);
      if (role.rolePermissions.length === 0) {
        console.log('      ⚠️  No permissions assigned');
      } else {
        const permsByResource = role.rolePermissions.reduce((acc, rp) => {
          const resource = rp.permission.resource || 'general';
          if (!acc[resource]) acc[resource] = [];
          acc[resource].push(rp.permission.name);
          return acc;
        }, {} as Record<string, string[]>);
        
        Object.entries(permsByResource).forEach(([resource, perms]) => {
          console.log(`      [${resource}]:`);
          perms.forEach(p => console.log(`        - ${p}`));
        });
      }
    });
    
    console.log('\n\n🔍 CHECKING SPECIFIC ACCESS:');
    console.log('═'.repeat(70));
    
    // Check if user has Editor role
    const hasEditorRole = user.userRoles.some(ur => ur.role.name === 'editor');
    console.log(`\n1. Has Editor Role: ${hasEditorRole ? '✅ YES' : '❌ NO'}`);
    
    if (!hasEditorRole) {
      console.log('   ⚠️  User does NOT have Editor role!');
      console.log('   Action: Go to /admin/users and assign Editor role');
      return;
    }
    
    // Get Editor role details
    const editorUserRole = user.userRoles.find(ur => ur.role.name === 'editor');
    const editorRole = editorUserRole?.role;
    
    if (editorRole) {
      console.log('\n2. Editor Role Capabilities:');
      if (editorRole.capabilityAssignments.length === 0) {
        console.log('   ❌ NO capabilities assigned to Editor role');
        console.log('   Action: Go to /admin/capabilities and assign capabilities');
      } else {
        editorRole.capabilityAssignments.forEach(ca => {
          console.log(`   ✅ ${ca.capability.name}`);
        });
      }
      
      console.log('\n3. Editor Role Permissions:');
      if (editorRole.rolePermissions.length === 0) {
        console.log('   ❌ NO permissions assigned to Editor role');
        console.log('   Action: Go to /admin/roles and assign permissions');
      } else {
        console.log(`   ✅ ${editorRole.rolePermissions.length} permissions assigned`);
      }
    }
    
    console.log('\n\n💡 ACCESS SUMMARY:');
    console.log('═'.repeat(70));
    
    const allCapabilities = user.userRoles.flatMap(ur => 
      ur.role.capabilityAssignments.map(ca => ca.capability.name)
    );
    const allPermissions = user.userRoles.flatMap(ur =>
      ur.role.rolePermissions.map(rp => rp.permission.name)
    );
    
    console.log(`\nTotal Capabilities: ${allCapabilities.length}`);
    if (allCapabilities.length > 0) {
      console.log('Capabilities:');
      allCapabilities.forEach(c => console.log(`  - ${c}`));
    }
    
    console.log(`\nTotal Permissions: ${allPermissions.length}`);
    if (allPermissions.length > 0) {
      const grouped = allPermissions.reduce((acc, p) => {
        const [module] = p.split('.');
        if (!acc[module]) acc[module] = [];
        acc[module].push(p);
        return acc;
      }, {} as Record<string, string[]>);
      
      Object.entries(grouped).forEach(([module, perms]) => {
        console.log(`  [${module}]: ${perms.length} permissions`);
      });
    }
    
    console.log('\n\n🎯 WHAT USER CAN DO:');
    console.log('═'.repeat(70));
    
    // Check key capabilities
    const hasAdminAccess = allCapabilities.includes('ADMIN_ACCESS');
    const hasDocFullAccess = allCapabilities.includes('DOCUMENT_FULL_ACCESS');
    const hasDocManage = allCapabilities.includes('DOCUMENT_MANAGE');
    const hasSystemConfig = allCapabilities.includes('SYSTEM_CONFIGURE');
    
    console.log('\nHigh-Level Access (Capabilities):');
    console.log(`  Access /admin/* pages: ${hasAdminAccess ? '✅ YES' : '❌ NO'}`);
    console.log(`  View all documents: ${hasDocFullAccess ? '✅ YES (bypass)' : '❌ NO (normal rules)'}`);
    console.log(`  Manage document lifecycle: ${hasDocManage ? '✅ YES' : '❌ NO'}`);
    console.log(`  Configure system: ${hasSystemConfig ? '✅ YES' : '❌ NO'}`);
    
    // Check key permissions
    const hasPdfView = allPermissions.includes('pdf.view');
    const hasPdfDownload = allPermissions.includes('pdf.download');
    const hasDocCreate = allPermissions.includes('documents.create');
    const hasDocUpdate = allPermissions.includes('documents.update');
    
    console.log('\nFeature-Level Access (Permissions):');
    console.log(`  View PDF: ${hasPdfView ? '✅ YES' : '❌ NO'}`);
    console.log(`  Download PDF: ${hasPdfDownload ? '✅ YES' : '❌ NO'}`);
    console.log(`  Create documents: ${hasDocCreate ? '✅ YES' : '❌ NO'}`);
    console.log(`  Update documents: ${hasDocUpdate ? '✅ YES' : '❌ NO'}`);
    
    if (allCapabilities.length === 0 && allPermissions.length === 0) {
      console.log('\n\n⚠️  WARNING: User has NO capabilities and NO permissions!');
      console.log('This user cannot do anything in the system.');
      console.log('\nAction Required:');
      console.log('1. Go to /admin/capabilities → Assign capabilities to Editor role');
      console.log('2. Go to /admin/roles → Assign permissions to Editor role');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();

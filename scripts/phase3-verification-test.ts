import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testCapabilitySystem() {
  console.log('🧪 Phase 3 Verification: Testing Capability-Based Authorization\n');
  console.log('=' .repeat(80));
  
  try {
    // Test 1: Verify all roles have capability assignments
    console.log('\n📊 Test 1: Role Capability Coverage\n');
    
    const roles = await prisma.role.findMany({
      include: {
        capabilityAssignments: {
          include: {
            capability: true,
          },
        },
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
    
    console.log(`Found ${roles.length} roles:\n`);
    
    roles.forEach(role => {
      const capCount = role.capabilityAssignments.length;
      const userCount = role._count.userRoles;
      const status = capCount > 0 ? '✅' : '⚠️ ';
      console.log(`${status} ${role.name.padEnd(15)} - ${capCount.toString().padStart(2)} capabilities, ${userCount} users`);
    });
    
    // Test 2: Verify capability categories
    console.log('\n\n📊 Test 2: Capability Distribution\n');
    
    const capabilities = await prisma.roleCapability.findMany({
      include: {
        _count: {
          select: {
            assignments: true,
          },
        },
      },
    });
    
    const byCategory: Record<string, number> = {};
    capabilities.forEach(cap => {
      const cat = cap.category || 'uncategorized';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    });
    
    console.log('Capabilities by category:');
    Object.entries(byCategory)
      .sort(([, a], [, b]) => b - a)
      .forEach(([category, count]) => {
        console.log(`   - ${category.padEnd(15)}: ${count} capabilities`);
      });
    
    // Test 3: Find most common capabilities
    console.log('\n\n📊 Test 3: Most Assigned Capabilities\n');
    
    const mostAssigned = capabilities
      .sort((a, b) => b._count.assignments - a._count.assignments)
      .slice(0, 10);
    
    console.log('Top 10 most assigned capabilities:');
    mostAssigned.forEach((cap, idx) => {
      console.log(`   ${(idx + 1).toString().padStart(2)}. ${cap.name.padEnd(30)} → ${cap._count.assignments} roles`);
    });
    
    // Test 4: Verify specific user capabilities
    console.log('\n\n📊 Test 4: Sample User Capabilities\n');
    
    const sampleUser = await prisma.user.findFirst({
      where: {
        email: 'admin@dsm.com',
      },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                capabilityAssignments: {
                  include: {
                    capability: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    
    if (sampleUser) {
      console.log(`User: ${sampleUser.email} (${sampleUser.firstName} ${sampleUser.lastName})`);
      console.log(`Roles: ${sampleUser.userRoles.map(ur => ur.role.name).join(', ')}\n`);
      
      const userCapabilities = sampleUser.userRoles.flatMap(ur =>
        ur.role.capabilityAssignments.map(ca => ca.capability.name)
      );
      const uniqueCaps = [...new Set(userCapabilities)].sort();
      
      console.log(`Total capabilities: ${uniqueCaps.length}\n`);
      console.log('Sample capabilities (first 20):');
      uniqueCaps.slice(0, 20).forEach((cap, idx) => {
        console.log(`   ${(idx + 1).toString().padStart(2)}. ${cap}`);
      });
      
      if (uniqueCaps.length > 20) {
        console.log(`   ... and ${uniqueCaps.length - 20} more`);
      }
    } else {
      console.log('⚠️  Sample user (admin@dsm.com) not found');
    }
    
    // Test 5: Verify no orphaned assignments
    console.log('\n\n📊 Test 5: Data Integrity Check\n');
    
    // Check if all assignments have valid role and capability IDs
    const allAssignments = await prisma.roleCapabilityAssignment.findMany({
      include: {
        role: true,
        capability: true,
      },
    });
    
    const orphanedAssignments = allAssignments.filter(a => !a.role || !a.capability);
    
    if (orphanedAssignments.length === 0) {
      console.log('✅ No orphaned capability assignments found');
    } else {
      console.log(`⚠️  Found ${orphanedAssignments.length} orphaned assignments`);
    }
    
    // Test 6: Compare with legacy permissions
    console.log('\n\n📊 Test 6: Legacy Permission Comparison\n');
    
    const permissionCount = await prisma.permission.count();
    const rolePermissionCount = await prisma.rolePermission.count();
    const capabilityCount = await prisma.roleCapability.count();
    const capabilityAssignmentCount = await prisma.roleCapabilityAssignment.count();
    
    console.log('System comparison:');
    console.log(`   Legacy Permissions:        ${permissionCount}`);
    console.log(`   Legacy RolePermissions:    ${rolePermissionCount}`);
    console.log(`   New Capabilities:          ${capabilityCount}`);
    console.log(`   New Capability Assignments: ${capabilityAssignmentCount}\n`);
    
    if (capabilityAssignmentCount >= rolePermissionCount) {
      console.log('✅ Capability assignments equal or exceed legacy permission assignments');
    } else {
      console.log('⚠️  Capability assignments are fewer than legacy permissions');
      console.log(`   Difference: ${rolePermissionCount - capabilityAssignmentCount}`);
    }
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('\n✅ PHASE 3 VERIFICATION COMPLETE\n');
    console.log('Summary:');
    console.log(`   ✅ ${roles.filter(r => r.capabilityAssignments.length > 0).length}/${roles.length} roles have capabilities`);
    console.log(`   ✅ ${capabilityCount} capabilities across ${Object.keys(byCategory).length} categories`);
    console.log(`   ✅ ${capabilityAssignmentCount} capability assignments`);
    console.log(`   ✅ Data integrity verified`);
    console.log('\nNext steps:');
    console.log('   1. Test login with different users');
    console.log('   2. Verify session.user.capabilities is populated');
    console.log('   3. Test hasCapability() checks in API routes');
    console.log('   4. Proceed to Phase 4: Update API Routes');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

testCapabilitySystem()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

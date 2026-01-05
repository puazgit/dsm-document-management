import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPpdPusatCapabilities() {
  console.log('🔍 Checking PPD.PUSAT Capabilities\n');
  console.log('='.repeat(80));
  
  try {
    // Find ppd.pusat role
    const ppdPusatRole = await prisma.role.findUnique({
      where: { name: 'ppd.pusat' },
      include: {
        capabilityAssignments: {
          include: {
            capability: true
          },
          orderBy: {
            capability: {
              category: 'asc'
            }
          }
        },
        _count: {
          select: {
            userRoles: true
          }
        }
      }
    });

    if (!ppdPusatRole) {
      console.log('❌ Role ppd.pusat NOT FOUND in database!');
      return;
    }

    console.log('\n📊 Role Information:');
    console.log(`   Name: ${ppdPusatRole.name}`);
    console.log(`   Display Name: ${ppdPusatRole.displayName}`);
    console.log(`   Description: ${ppdPusatRole.description || 'N/A'}`);
    console.log(`   Level: ${ppdPusatRole.level}`);
    console.log(`   Is System: ${ppdPusatRole.isSystem}`);
    console.log(`   Is Active: ${ppdPusatRole.isActive}`);
    console.log(`   Users Assigned: ${ppdPusatRole._count.userRoles}`);
    console.log(`   Total Capabilities: ${ppdPusatRole.capabilityAssignments.length}`);

    console.log('\n📋 Assigned Capabilities by Category:\n');

    // Group capabilities by category
    const capsByCategory = ppdPusatRole.capabilityAssignments.reduce((acc, assignment) => {
      const category = assignment.capability.category || 'uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(assignment.capability);
      return acc;
    }, {} as Record<string, any[]>);

    // Display capabilities by category
    for (const [category, caps] of Object.entries(capsByCategory)) {
      console.log(`\n🏷️  ${category.toUpperCase()}`);
      console.log('─'.repeat(80));
      caps.forEach(cap => {
        console.log(`   ✓ ${cap.name.padEnd(30)} - ${cap.description || 'No description'}`);
      });
    }

    // Compare with expected capabilities from seed file
    console.log('\n\n📝 Expected Capabilities (from seed file):');
    console.log('─'.repeat(80));
    const expectedCapabilities = [
      'ADMIN_ACCESS',
      'USER_MANAGE',
      'USER_VIEW',
      'ROLE_MANAGE',
      'PERMISSION_MANAGE',
      'DOCUMENT_FULL_ACCESS',
      'DOCUMENT_VIEW',
      'DOCUMENT_CREATE',
      'DOCUMENT_EDIT',
      'DOCUMENT_DELETE',
      'DOCUMENT_APPROVE',
      'DOCUMENT_PUBLISH',
      'ORGANIZATION_MANAGE',
      'ORGANIZATION_VIEW',
      'ANALYTICS_VIEW',
      'ANALYTICS_EXPORT',
      'AUDIT_VIEW',
    ];

    const actualCapabilities = ppdPusatRole.capabilityAssignments.map(a => a.capability.name);
    
    console.log(`\nExpected: ${expectedCapabilities.length} capabilities`);
    console.log(`Actual:   ${actualCapabilities.length} capabilities`);

    // Check for missing capabilities
    const missingCapabilities = expectedCapabilities.filter(cap => !actualCapabilities.includes(cap));
    if (missingCapabilities.length > 0) {
      console.log('\n⚠️  MISSING Capabilities:');
      missingCapabilities.forEach(cap => {
        console.log(`   ❌ ${cap}`);
      });
    } else {
      console.log('\n✅ All expected capabilities are assigned!');
    }

    // Check for extra capabilities
    const extraCapabilities = actualCapabilities.filter(cap => !expectedCapabilities.includes(cap));
    if (extraCapabilities.length > 0) {
      console.log('\n➕ EXTRA Capabilities (not in seed):');
      extraCapabilities.forEach(cap => {
        console.log(`   ➕ ${cap}`);
      });
    }

    // Check users with ppd.pusat role
    console.log('\n\n👥 Users with PPD.PUSAT Role:');
    console.log('─'.repeat(80));
    
    const usersWithRole = await prisma.userRole.findMany({
      where: {
        roleId: ppdPusatRole.id,
        isActive: true
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true
          }
        }
      }
    });

    if (usersWithRole.length === 0) {
      console.log('   ⚠️  No users assigned to ppd.pusat role');
    } else {
      usersWithRole.forEach(ur => {
        console.log(`   👤 ${ur.user.email} (${ur.user.firstName} ${ur.user.lastName})`);
        console.log(`      Status: ${ur.user.isActive ? '✅ Active' : '❌ Inactive'}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Check completed\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPpdPusatCapabilities();

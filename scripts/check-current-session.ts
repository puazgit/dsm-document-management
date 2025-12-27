import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCurrentSession() {
  try {
    console.log('🔍 Checking admin user and role configuration...\n');

    // 1. Find admin user
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@dsm.com' },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                capabilityAssignments: {
                  include: {
                    capability: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }

    console.log('✅ Admin user found:', adminUser.email);
    console.log('📌 User ID:', adminUser.id);
    console.log('🔓 Is Active:', adminUser.isActive);

    if (adminUser.userRoles.length === 0) {
      console.log('❌ No roles assigned to admin user');
      return;
    }

    const role = adminUser.userRoles[0].role;
    console.log('\n📋 Role Information:');
    console.log('  - Role ID:', role.id);
    console.log('  - Role Name:', role.name);
    console.log('  - Role Display:', role.displayName);

    console.log('\n🎯 Capabilities assigned to role:');
    if (role.capabilityAssignments.length === 0) {
      console.log('  ❌ No capabilities assigned');
    } else {
      role.capabilityAssignments.forEach(assignment => {
        console.log(`  ✓ ${assignment.capability.name}`);
      });
      console.log(`\n  Total: ${role.capabilityAssignments.length} capabilities`);
    }

    // Check specifically for DASHBOARD_VIEW
    const hasDashboardView = role.capabilityAssignments.some(
      a => a.capability.name === 'DASHBOARD_VIEW'
    );
    console.log('\n🎯 DASHBOARD_VIEW capability:', hasDashboardView ? '✅ ASSIGNED' : '❌ NOT ASSIGNED');

    // Simulate JWT callback logic
    console.log('\n🔄 Simulating JWT callback...');
    
    const capabilities = role.capabilityAssignments.map(
      assignment => assignment.capability.name
    );
    
    console.log('📦 Capabilities that SHOULD be in JWT token:');
    console.log(JSON.stringify(capabilities, null, 2));

    console.log('\n💡 NEXT STEPS:');
    console.log('1. Restart dev server (Ctrl+C in npm run dev terminal, then npm run dev)');
    console.log('2. Close ALL browser tabs of localhost:3000');
    console.log('3. Open new browser tab, go to localhost:3000');
    console.log('4. Login as admin@dsm.com');
    console.log('5. Check dev server terminal for logs:');
    console.log('   - 🔐 JWT Callback - User Login: admin@dsm.com');
    console.log('   - 🔑 Session Callback - Capabilities count: XX');
    console.log('6. If logs show capabilities count > 0, try Dashboard access');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCurrentSession();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixPpdPusatCapabilities() {
  console.log('🔧 Fixing PPD.PUSAT Capabilities\n');
  console.log('='.repeat(80));
  
  try {
    // Expected capabilities for ppd.pusat
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

    // Find ppd.pusat role
    const ppdPusatRole = await prisma.role.findUnique({
      where: { name: 'ppd.pusat' },
      include: {
        capabilityAssignments: {
          include: {
            capability: true
          }
        }
      }
    });

    if (!ppdPusatRole) {
      console.log('❌ Role ppd.pusat NOT FOUND in database!');
      return;
    }

    console.log('📋 Current state:');
    console.log(`   Role: ${ppdPusatRole.name}`);
    console.log(`   Current Level: ${ppdPusatRole.level}`);
    console.log(`   Current Capabilities: ${ppdPusatRole.capabilityAssignments.length}`);

    // Update role level to 100
    console.log('\n📝 Step 1: Updating role level to 100...');
    await prisma.role.update({
      where: { id: ppdPusatRole.id },
      data: { level: 100 }
    });
    console.log('   ✅ Level updated to 100');

    // Get all capabilities
    console.log('\n📝 Step 2: Fetching all capabilities...');
    const allCapabilities = await prisma.roleCapability.findMany({
      where: {
        name: {
          in: expectedCapabilities
        }
      }
    });

    console.log(`   ✅ Found ${allCapabilities.length} capabilities in database`);

    // Find missing capabilities
    const missingCapabilityNames = expectedCapabilities.filter(
      name => !allCapabilities.find(cap => cap.name === name)
    );

    if (missingCapabilityNames.length > 0) {
      console.log('\n⚠️  WARNING: Some capabilities not found in database:');
      missingCapabilityNames.forEach(name => {
        console.log(`   ❌ ${name}`);
      });
      console.log('\n💡 Run seed script to create missing capabilities first:');
      console.log('   npx prisma db seed');
      return;
    }

    // Assign capabilities
    console.log('\n📝 Step 3: Assigning capabilities...');
    let assigned = 0;
    let skipped = 0;

    for (const capability of allCapabilities) {
      try {
        await prisma.roleCapabilityAssignment.upsert({
          where: {
            roleId_capabilityId: {
              roleId: ppdPusatRole.id,
              capabilityId: capability.id
            }
          },
          update: {}, // Already exists, do nothing
          create: {
            roleId: ppdPusatRole.id,
            capabilityId: capability.id
          }
        });
        console.log(`   ✅ ${capability.name}`);
        assigned++;
      } catch (error) {
        console.log(`   ⚠️  ${capability.name} - Already assigned`);
        skipped++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Capabilities assigned: ${assigned}`);
    console.log(`   Already existed: ${skipped}`);
    console.log(`   Total: ${assigned + skipped}`);

    // Verify the result
    console.log('\n🔍 Step 4: Verifying...');
    const updatedRole = await prisma.role.findUnique({
      where: { name: 'ppd.pusat' },
      include: {
        capabilityAssignments: {
          include: {
            capability: true
          }
        }
      }
    });

    if (updatedRole) {
      console.log(`   ✅ Role level: ${updatedRole.level}`);
      console.log(`   ✅ Total capabilities: ${updatedRole.capabilityAssignments.length}`);
      
      // Check if all expected capabilities are assigned
      const actualCapNames = updatedRole.capabilityAssignments.map(a => a.capability.name);
      const stillMissing = expectedCapabilities.filter(name => !actualCapNames.includes(name));
      
      if (stillMissing.length > 0) {
        console.log('\n⚠️  Still missing:');
        stillMissing.forEach(name => console.log(`   ❌ ${name}`));
      } else {
        console.log('\n✅ All expected capabilities are now assigned!');
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Fix completed!\n');
    console.log('💡 Next steps:');
    console.log('   1. Verify: npx tsx scripts/check-ppd-pusat-capabilities.ts');
    console.log('   2. Test: Login as ppd.pusat@dsm.com and check admin access');
    console.log('   3. Clear cache: Users need to logout/login to refresh capabilities\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPpdPusatCapabilities();

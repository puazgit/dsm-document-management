import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPpdPusatFromDB() {
  console.log('🔍 Checking ppd.pusat from Database (Live Query)\n');
  console.log('='.repeat(80));
  
  try {
    // Get role with all capabilities
    const role = await prisma.role.findUnique({
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
        userRoles: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                email: true,
                firstName: true,
                lastName: true,
                isActive: true
              }
            }
          }
        }
      }
    });

    if (!role) {
      console.log('❌ Role ppd.pusat NOT FOUND');
      return;
    }

    console.log('\n📊 ROLE INFO:');
    console.log(`   Name: ${role.name}`);
    console.log(`   Display: ${role.displayName}`);
    console.log(`   Active: ${role.isActive}`);
    console.log(`   System: ${role.isSystem}`);
    console.log(`   Total Capabilities: ${role.capabilityAssignments.length}`);
    console.log(`   Active Users: ${role.userRoles.length}`);

    // Group by category
    const byCategory = role.capabilityAssignments.reduce((acc, a) => {
      const cat = a.capability.category || 'other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(a.capability.name);
      return acc;
    }, {} as Record<string, string[]>);

    console.log('\n📋 CAPABILITIES BY CATEGORY:\n');
    Object.entries(byCategory).sort().forEach(([cat, caps]) => {
      console.log(`\n🏷️  ${cat.toUpperCase()}`);
      console.log('─'.repeat(80));
      caps.sort().forEach(cap => console.log(`   ✓ ${cap}`));
    });

    console.log('\n\n👥 ACTIVE USERS:');
    console.log('─'.repeat(80));
    if (role.userRoles.length === 0) {
      console.log('   ⚠️  No active users');
    } else {
      role.userRoles.forEach(ur => {
        console.log(`   👤 ${ur.user.email}`);
        console.log(`      ${ur.user.firstName} ${ur.user.lastName}`);
        console.log(`      Status: ${ur.user.isActive ? '✅ Active' : '❌ Inactive'}\n`);
      });
    }

    // Check critical capabilities
    const allCaps = role.capabilityAssignments.map(a => a.capability.name);
    const critical = ['ADMIN_ACCESS', 'DOCUMENT_FULL_ACCESS', 'DOCUMENT_APPROVE', 'DOCUMENT_DELETE', 'DOCUMENT_EDIT', 'DOCUMENT_PUBLISH'];
    
    console.log('\n🔐 CRITICAL CAPABILITIES CHECK:');
    console.log('─'.repeat(80));
    critical.forEach(cap => {
      const has = allCaps.includes(cap);
      console.log(`   ${has ? '✅' : '❌'} ${cap}`);
    });

    console.log('\n📋 ALL CAPABILITIES LIST:');
    console.log('─'.repeat(80));
    allCaps.sort().forEach((cap, i) => {
      console.log(`   ${(i + 1).toString().padStart(2)}. ${cap}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ Query completed\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPpdPusatFromDB();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listCredentials() {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        group: { select: { name: true } },
        userRoles: {
          select: {
            role: {
              select: { name: true, displayName: true }
            }
          }
        }
      },
      orderBy: { username: 'asc' }
    });

    console.log('\n' + '='.repeat(80));
    console.log('👥 USER CREDENTIALS - DATABASE');
    console.log('='.repeat(80));
    console.log(`\n📊 Total: ${users.length} active users\n`);

    users.forEach((user, idx) => {
      console.log(`${idx + 1}. ${user.firstName} ${user.lastName}`);
      console.log(`   📧 Email    : ${user.email}`);
      console.log(`   👤 Username : ${user.username}`);
      console.log(`   🔑 Password : ${user.username}123 (default pattern)`);
      console.log(`   🏢 Group    : ${user.group?.name || 'No Group'}`);
      
      if (user.userRoles.length > 0) {
        const roleNames = user.userRoles.map(ur => ur.role.displayName).join(', ');
        console.log(`   🎭 Roles    : ${roleNames}`);
      }
      console.log('');
    });

    console.log('='.repeat(80));
    console.log('📝 COMMON LOGIN CREDENTIALS:');
    console.log('='.repeat(80));
    console.log('');
    console.log('Admin        : admin@dsm.com / admin123');
    console.log('PPD User     : ppd@dsm.com / ppd_user123');
    console.log('PPD Pusat    : ppd.pusat@dsm.com / ppd.pusat123');
    console.log('Kadiv        : kadiv@dsm.com / kadiv_user123');
    console.log('Manager      : manager@dsm.com / manager_user123');
    console.log('Operations   : operations@dsm.com / operations_user123');
    console.log('TIK          : tik@dsm.com / tik_user123');
    console.log('');
    console.log('⚠️  Note: Default password pattern is "username" + "123"');
    console.log('   If login fails, check the seed.ts file for exact password.');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listCredentials();

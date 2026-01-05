import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listUsersCredentials() {
  console.log('👥 List Users & Credentials from Database\n');
  console.log('='.repeat(80));
  
  try {
    const users = await prisma.user.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        group: {
          select: {
            name: true,
            displayName: true
          }
        },
        userRoles: {
          where: {
            isActive: true
          },
          include: {
            role: {
              select: {
                name: true,
                displayName: true,
                level: true
              }
            }
          }
        }
      },
      orderBy: {
        email: 'asc'
      }
    });

    console.log(`\n📊 Found ${users.length} active users:\n`);

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Name: ${user.firstName} ${user.lastName}`);
      
      if (user.group) {
        console.log(`   Group: ${user.group.displayName} (${user.group.name})`);
      }
      
      if (user.userRoles.length > 0) {
        console.log(`   Roles:`);
        user.userRoles.forEach(ur => {
          console.log(`      - ${ur.role.displayName} (${ur.role.name}) - Level ${ur.role.level}`);
        });
      } else {
        console.log(`   Roles: None assigned`);
      }
      
      // Default password pattern (from seed.ts)
      const defaultPassword = user.username.replace('_user', '') + '123';
      console.log(`   🔑 Default Password Pattern: ${defaultPassword}`);
      console.log('');
    });

    console.log('='.repeat(80));
    console.log('\n💡 Common Password Patterns (based on seed.ts):');
    console.log('   • admin@dsm.com → admin123');
    console.log('   • ppd@dsm.com → ppd123');
    console.log('   • ppd.pusat@dsm.com → ppd.pusat123 atau ppdpusat123');
    console.log('   • manager@dsm.com → manager123');
    console.log('   • editor@dsm.com → editor123');
    console.log('   • viewer@dsm.com → viewer123');
    console.log('\n⚠️  Note: Passwords are hashed in database and cannot be retrieved.');
    console.log('   If password forgotten, use password reset or update via script.\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listUsersCredentials();

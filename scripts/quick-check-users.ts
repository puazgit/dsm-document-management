import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const userCount = await prisma.user.count();
    console.log(`\n📊 Total users in database: ${userCount}\n`);
    
    if (userCount === 0) {
      console.log('⚠️  Database is empty! Run seed first:');
      console.log('   npx prisma db seed\n');
      return;
    }

    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        group: {
          select: { name: true }
        }
      },
      orderBy: { username: 'asc' }
    });

    console.log('👥 Active Users:\n');
    users.forEach((user, idx) => {
      console.log(`${idx + 1}. Username: ${user.username}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.firstName} ${user.lastName}`);
      console.log(`   Group: ${user.group?.name || 'N/A'}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();

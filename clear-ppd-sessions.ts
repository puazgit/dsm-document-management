import { prisma } from './src/lib/prisma';

async function clearPpdSessions() {
  const result = await prisma.session.deleteMany({
    where: {
      user: {
        email: 'ppd.pusat@dsm.com'
      }
    }
  });
  
  console.log(`✅ Deleted ${result.count} session(s) for ppd.pusat@dsm.com`);
  console.log('User ppd.pusat must login again to get updated capabilities!');
  
  await prisma.$disconnect();
}

clearPpdSessions();

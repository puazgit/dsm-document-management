#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRecentViews() {
  const docId = 'cmjgs318h00032pa3aeq66d7f';
  
  const count = await prisma.documentActivity.count({
    where: { documentId: docId, action: 'VIEW' }
  });
  
  const activities = await prisma.documentActivity.findMany({
    where: { documentId: docId, action: 'VIEW' },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { user: { select: { firstName: true, lastName: true } } }
  });
  
  console.log('\n📊 VIEW AUDIT LOG STATUS:\n');
  console.log('='.repeat(60));
  console.log(`Total VIEW entries: ${count}`);
  console.log('\nLast 10 entries:');
  console.log('─'.repeat(60));
  
  activities.forEach((a, i) => {
    const time = a.createdAt.toISOString();
    const user = `${a.user.firstName} ${a.user.lastName}`;
    console.log(`${i+1}. ${time} - ${user}`);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ If you refreshed the page and this count did NOT increase,');
  console.log('   then the fix is working correctly!\n');
  
  await prisma.$disconnect();
}

checkRecentViews();

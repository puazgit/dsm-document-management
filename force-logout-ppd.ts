/**
 * Force logout ppd.pusat user
 * This will delete all sessions and accounts tokens
 */

import { prisma } from './src/lib/prisma';

async function forceLogout() {
  console.log('🔄 Force logout ppd.pusat user...\n');
  
  const user = await prisma.user.findUnique({
    where: { email: 'ppd.pusat@dsm.com' },
    select: { id: true, email: true }
  });
  
  if (!user) {
    console.log('❌ User not found');
    return;
  }
  
  // Delete all sessions
  const sessions = await prisma.session.deleteMany({
    where: { userId: user.id }
  });
  
  console.log(`✅ Deleted ${sessions.count} session(s)`);
  console.log('');
  console.log('🎯 User ppd.pusat has been logged out!');
  console.log('   All JWT tokens are invalidated.');
  console.log('');
  console.log('📝 Next steps:');
  console.log('   1. User must CLOSE browser completely');
  console.log('   2. Clear browser cache (Ctrl+Shift+Delete)');
  console.log('   3. Open new browser window');
  console.log('   4. Login again at http://localhost:3000/login');
  console.log('');
  console.log('✅ After login, dropdown should NOT show:');
  console.log('   ❌ PENDING_APPROVAL → APPROVED');
  console.log('   ❌ PENDING_APPROVAL → REJECTED');
  
  await prisma.$disconnect();
}

forceLogout();

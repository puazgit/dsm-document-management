/**
 * Force Refresh User Capabilities
 * 
 * Karena NextAuth menggunakan JWT dengan cache 1 menit,
 * user perlu logout-login atau tunggu 1 menit untuk capabilities ter-update.
 * 
 * Script ini menunjukkan current state dan memberikan instruksi.
 */

import { prisma } from './src/lib/prisma';

async function main() {
  console.log('🔍 Checking ppd.pusat capabilities...\n');
  
  const user = await prisma.user.findUnique({
    where: { email: 'ppd.pusat@dsm.com' },
    include: {
      userRoles: {
        where: { isActive: true },
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
  
  if (!user) {
    console.log('❌ User not found');
    return;
  }
  
  const capabilities = user.userRoles.flatMap(ur =>
    ur.role.capabilityAssignments.map(ca => ca.capability.name)
  );
  
  const uniqueCaps = [...new Set(capabilities)];
  
  console.log('✅ Database State (CURRENT):');
  console.log(`   User: ${user.email}`);
  console.log(`   Capabilities: ${uniqueCaps.length} total\n`);
  
  console.log('📋 Has DOCUMENT_FULL_ACCESS?', uniqueCaps.includes('DOCUMENT_FULL_ACCESS') ? '✅ YES' : '❌ NO');
  console.log('📋 Has DOCUMENT_APPROVE?', uniqueCaps.includes('DOCUMENT_APPROVE') ? '❌ YES (PROBLEM!)' : '✅ NO (CORRECT!)\n');
  
  if (!uniqueCaps.includes('DOCUMENT_APPROVE') && uniqueCaps.includes('DOCUMENT_FULL_ACCESS')) {
    console.log('✅ DATABASE IS CORRECT!');
    console.log('   ppd.pusat can see ALL documents but CANNOT approve.\n');
    
    console.log('⚠️  BUT... NextAuth JWT cache might still have old capabilities!\n');
    console.log('🔧 SOLUTIONS:\n');
    console.log('   Option 1: User ppd.pusat LOGOUT dan LOGIN ulang');
    console.log('   Option 2: Tunggu 1 menit (JWT auto-refresh every 60 seconds)');
    console.log('   Option 3: Clear browser cookies and login again\n');
    
    console.log('📝 To verify in browser:');
    console.log('   1. Login as ppd.pusat@dsm.com');
    console.log('   2. Open browser console (F12)');
    console.log('   3. Check capabilities in session');
    console.log('   4. Dropdown "Change Status" should NOT show APPROVED option\n');
  } else {
    console.log('❌ DATABASE CONFIGURATION INCORRECT!');
    console.log('   Please run the capability assignment script again.\n');
  }
  
  await prisma.$disconnect();
}

main();

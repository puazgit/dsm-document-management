import { prisma } from './src/lib/prisma';

async function checkCapabilities() {
  const user = await prisma.user.findUnique({
    where: { email: 'ppd.pusat@dsm.com' },
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
  
  if (!user) {
    console.log('User tidak ditemukan');
    return;
  }
  
  console.log('User:', user.email);
  console.log('Roles:');
  
  const allCaps = new Set();
  user.userRoles.forEach(ur => {
    console.log('  -', ur.role.name, '(', ur.role.displayName, ')');
    ur.role.capabilityAssignments.forEach(ca => {
      allCaps.add(ca.capability.name);
    });
  });
  
  console.log('\nAll Capabilities:');
  Array.from(allCaps).sort().forEach(cap => {
    console.log('  -', cap);
  });
  
  console.log('\nHas DOCUMENT_APPROVE?', allCaps.has('DOCUMENT_APPROVE') ? 'YES ❌' : 'NO ✅');
  console.log('Has DOCUMENT_FULL_ACCESS?', allCaps.has('DOCUMENT_FULL_ACCESS') ? 'YES ✅' : 'NO ❌');
  
  await prisma.$disconnect();
}

checkCapabilities();

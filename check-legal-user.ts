import { prisma } from './src/lib/prisma';

(async () => {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'legal@dsm.com' },
      include: {
        group: true,
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  where: { isGranted: true },
                  include: { permission: true }
                }
              }
            }
          }
        }
      }
    });
    
    if (!user) {
      console.log('❌ User legal@dsm.com not found');
      return;
    }
    
    console.log('✅ User found:');
    console.log('- ID:', user.id);
    console.log('- Email:', user.email);
    console.log('- Name:', user.firstName, user.lastName);
    console.log('- Group ID:', user.groupId);
    console.log('- Group Name:', user.group?.name || 'No group');
    console.log('- Divisi ID:', user.divisiId);
    console.log('- Is Active:', user.isActive);
    console.log('\n📋 User Roles:');
    
    const allPermissions: string[] = [];
    user.userRoles.forEach((userRole) => {
      console.log(`\n  Role: ${userRole.role.name} (${userRole.role.displayName})`);
      console.log(`  - Active: ${userRole.isActive}`);
      console.log(`  - Permissions (${userRole.role.rolePermissions.length}):`);
      
      userRole.role.rolePermissions.forEach((rp) => {
        console.log(`    - ${rp.permission.name} (${rp.permission.displayName})`);
        allPermissions.push(rp.permission.name);
      });
    });
    
    console.log('\n🔑 All Permissions Summary:');
    const uniquePermissions = [...new Set(allPermissions)];
    uniquePermissions.forEach(perm => console.log(`  - ${perm}`));
    
    console.log('\n📄 PDF Permissions:');
    console.log('  - pdf.download:', uniquePermissions.includes('pdf.download'));
    console.log('  - pdf.print:', uniquePermissions.includes('pdf.print'));
    console.log('  - pdf.copy:', uniquePermissions.includes('pdf.copy'));
    console.log('  - pdf.watermark:', uniquePermissions.includes('pdf.watermark'));
    console.log('  - documents.download:', uniquePermissions.includes('documents.download'));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();

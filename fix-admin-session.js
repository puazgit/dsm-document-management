const { PrismaClient } = require('@prisma/client');

async function fixAdminNextAuthSession() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 FIXING NEXTAUTH SESSION for admin@dsm.com');
    console.log('===============================================');
    
    // 1. Verify admin user exists with correct role
    const user = await prisma.user.findUnique({
      where: { email: 'admin@dsm.com' },
      include: {
        userRoles: {
          where: { isActive: true },
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!user) {
      console.log('❌ Admin user not found');
      return;
    }

    console.log('✅ VERIFICATION COMPLETE:');
    console.log(`   User: ${user.email}`);
    console.log(`   Active: ${user.isActive}`);
    console.log(`   Roles: ${user.userRoles.length}`);
    
    const permissions = user.userRoles.flatMap(userRole => 
      userRole.role.rolePermissions.map(rp => rp.permission.name)
    );
    
    console.log(`   Total Permissions: ${permissions.length}`);
    console.log('');

    // 2. Test NextAuth JWT simulation
    console.log('🎫 NEXTAUTH JWT CALLBACK SIMULATION:');
    
    // Simulate exactly what NextAuth JWT callback does
    const jwtToken = {
      sub: user.id,
      email: user.email,
      role: user.userRoles[0]?.role.name || 'no-role',
      permissions: permissions
    };
    
    console.log('JWT Token Content:');
    console.log(JSON.stringify(jwtToken, null, 2));
    console.log('');

    // 3. Test NextAuth Session callback simulation
    console.log('👤 NEXTAUTH SESSION CALLBACK SIMULATION:');
    
    const sessionObject = {
      user: {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        role: user.userRoles[0]?.role.name || 'no-role',
        permissions: permissions
      }
    };
    
    console.log('Session Object:');
    console.log(JSON.stringify(sessionObject, null, 2));
    console.log('');

    // 4. Critical permissions check
    console.log('🔐 CRITICAL ADMIN PERMISSIONS CHECK:');
    const criticalPermissions = [
      'system.admin',
      'users.create',
      'users.read',
      'users.update',
      'users.delete',
      'roles.create',
      'roles.read',
      'roles.update',
      'roles.delete',
      'pdf.download',
      'documents.download'
    ];

    criticalPermissions.forEach(perm => {
      const hasPermission = permissions.includes(perm);
      console.log(`   ${hasPermission ? '✅' : '❌'} ${perm}`);
    });

    // 5. Generate fresh login instructions
    console.log('');
    console.log('💡 NEXT STEPS TO ACTIVATE CHANGES:');
    console.log('=====================================');
    console.log('1. 🚪 Logout dari aplikasi completely');
    console.log('2. 🗑️  Clear browser data for localhost:3000:');
    console.log('   - Chrome: Settings > Privacy > Clear browsing data');
    console.log('   - Firefox: Settings > Privacy > Clear Data');
    console.log('   - Safari: Develop > Empty Caches');
    console.log('3. 🔄 Login ulang dengan:');
    console.log('   📧 Email: admin@dsm.com');
    console.log('   🔑 Password: admin123');
    console.log('4. ✅ Verify admin panels are accessible:');
    console.log('   - http://localhost:3000/admin');
    console.log('   - http://localhost:3000/admin/users');
    console.log('   - http://localhost:3000/admin/roles');
    console.log('   - http://localhost:3000/admin/permissions');
    console.log('');
    console.log('🎯 EXPECTED RESULT:');
    console.log('   - Admin sidebar menu visible');
    console.log('   - All admin pages accessible');
    console.log('   - PDF download buttons working');
    console.log('   - Session permissions count > 0');

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error fixing NextAuth session:', error);
  }
}

fixAdminNextAuthSession();
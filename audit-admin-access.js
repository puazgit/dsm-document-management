const { PrismaClient } = require('@prisma/client');

async function auditAdminAccess() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 AUDIT AKSES admin@dsm.com');
    console.log('================================');
    
    // 1. Cek user dan basic info
    const user = await prisma.user.findUnique({
      where: { email: 'admin@dsm.com' },
      include: {
        group: true,
        userRoles: {
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
      console.log('❌ User admin@dsm.com tidak ditemukan!');
      return;
    }

    console.log('👤 USER INFO:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Group: ${user.group?.name || 'None'}`);
    console.log(`   Active: ${user.isActive}`);
    console.log(`   Created: ${user.createdAt}`);
    console.log('');

    // 2. Cek semua roles
    console.log('👔 ROLES ASSIGNED:');
    if (user.userRoles.length === 0) {
      console.log('   ❌ TIDAK ADA ROLE YANG DI-ASSIGN!');
      
      // Cek apakah ada role org_administrator
      const adminRole = await prisma.role.findFirst({
        where: { name: 'org_administrator' }
      });
      
      if (adminRole) {
        console.log(`   ⚠️  Role 'org_administrator' ada di database (ID: ${adminRole.id})`);
        console.log('   💡 User perlu di-assign ke role ini!');
        
        // Auto-assign role
        console.log('   🔧 Auto-assigning org_administrator role...');
        await prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: adminRole.id
          }
        });
        console.log('   ✅ Role org_administrator berhasil di-assign!');
      } else {
        console.log('   ❌ Role org_administrator tidak ada di database!');
      }
    } else {
      user.userRoles.forEach((userRole, index) => {
        console.log(`   ${index + 1}. ${userRole.role.name} (${userRole.role.displayName}) - Level: ${userRole.role.level}`);
      });
    }
    console.log('');

    // 3. Cek semua permissions
    const allPermissions = user.userRoles.flatMap(userRole => 
      userRole.role.rolePermissions.map(rp => rp.permission.name)
    );
    
    console.log('🔐 PERMISSIONS (Total: ' + allPermissions.length + '):');
    if (allPermissions.length === 0) {
      console.log('   ❌ TIDAK ADA PERMISSIONS!');
    } else {
      // Group by category
      const permissionsByCategory = {};
      allPermissions.forEach(perm => {
        const [category] = perm.split('.');
        if (!permissionsByCategory[category]) {
          permissionsByCategory[category] = [];
        }
        permissionsByCategory[category].push(perm);
      });
      
      Object.keys(permissionsByCategory).sort().forEach(category => {
        console.log(`   📂 ${category.toUpperCase()}:`);
        permissionsByCategory[category].forEach(perm => {
          console.log(`      ✅ ${perm}`);
        });
      });
    }
    console.log('');

    // 4. Cek NextAuth session simulation
    console.log('🎫 NEXTAUTH SESSION SIMULATION:');
    const sessionData = {
      user: {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        role: user.userRoles[0]?.role.name || 'no-role',
        permissions: allPermissions
      }
    };
    console.log('   Session Object:');
    console.log('   ', JSON.stringify(sessionData, null, 2));
    console.log('');

    // 5. Cek akses ke halaman admin
    const adminPermissions = allPermissions.filter(p => 
      p.includes('admin') || 
      p.includes('users') || 
      p.includes('roles') || 
      p.includes('permissions')
    );
    
    console.log('🏛️  ADMIN ACCESS CHECK:');
    console.log(`   Admin Permissions: ${adminPermissions.length}`);
    console.log(`   Can Access Admin Panel: ${adminPermissions.length > 0 ? '✅ YES' : '❌ NO'}`);
    console.log(`   Can Manage Users: ${allPermissions.includes('users.create') ? '✅ YES' : '❌ NO'}`);
    console.log(`   Can Manage Roles: ${allPermissions.includes('roles.create') ? '✅ YES' : '❌ NO'}`);
    console.log(`   Can PDF Download: ${allPermissions.includes('pdf.download') ? '✅ YES' : '❌ NO'}`);

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error during audit:', error);
  }
}

auditAdminAccess();
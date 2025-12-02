const { PrismaClient } = require('@prisma/client');

async function fixManagerRole() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Fixing org_manager role permissions...');
    
    // Get org_manager role
    const managerRole = await prisma.role.findUnique({
      where: { name: 'org_manager' },
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        }
      }
    });
    
    if (!managerRole) {
      console.log('❌ org_manager role not found!');
      return;
    }
    
    console.log('📋 Current permissions:', managerRole.rolePermissions.length);
    
    // Get PDF permissions yang harus ditambahkan
    const pdfPermissions = await prisma.permission.findMany({
      where: {
        OR: [
          { name: { contains: 'pdf' } },
          { name: { contains: 'download' } }
        ]
      }
    });
    
    console.log('📄 Available PDF permissions:', pdfPermissions.length);
    
    let addedCount = 0;
    for (const permission of pdfPermissions) {
      try {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: managerRole.id,
              permissionId: permission.id
            }
          },
          update: {
            isGranted: true
          },
          create: {
            roleId: managerRole.id,
            permissionId: permission.id,
            isGranted: true
          }
        });
        console.log('  ✅ Added:', permission.name);
        addedCount++;
      } catch (error) {
        if (error.code !== 'P2002') {
          console.log('  ❌ Error adding', permission.name, ':', error.message);
        }
      }
    }
    
    console.log('\n🎉 Successfully added', addedCount, 'PDF permissions to org_manager role!');
    
    // Verify hasil
    const updatedRole = await prisma.role.findUnique({
      where: { name: 'org_manager' },
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        }
      }
    });
    
    const pdfPerms = updatedRole.rolePermissions.filter(rp => 
      rp.permission.name.includes('pdf') || rp.permission.name.includes('download')
    );
    
    console.log('\n✅ Verification - org_manager now has', pdfPerms.length, 'PDF permissions:');
    pdfPerms.forEach(rp => console.log('  📄', rp.permission.name));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixManagerRole();
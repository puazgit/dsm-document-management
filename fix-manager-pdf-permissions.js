const { PrismaClient } = require('@prisma/client');

async function fixManagerPermissions() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Fixing PDF permissions for manager@dsm.com...\n');
    
    // Get org_manager role
    const orgManagerRole = await prisma.role.findUnique({
      where: { name: 'org_manager' }
    });
    
    if (!orgManagerRole) {
      console.log('❌ Role org_manager not found');
      return;
    }
    
    // Get PDF permissions
    const pdfPermissions = await prisma.permission.findMany({
      where: {
        OR: [
          { name: 'pdf.download' },
          { name: 'pdf.view' }, 
          { name: 'pdf.print' },
          { name: 'pdf.copy' },
          { name: 'documents.download' }
        ]
      }
    });
    
    console.log(`📄 Adding ${pdfPermissions.length} PDF permissions to org_manager role:`);
    
    // Add permissions to org_manager role
    for (const permission of pdfPermissions) {
      try {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: orgManagerRole.id,
              permissionId: permission.id
            }
          },
          update: {
            isGranted: true
          },
          create: {
            roleId: orgManagerRole.id,
            permissionId: permission.id,
            isGranted: true
          }
        });
        console.log(`   ✅ ${permission.name}`);
      } catch (error) {
        console.log(`   ℹ️  ${permission.name} (already exists)`);
      }
    }
    
    console.log('\n✅ PDF permissions fixed for org_manager role!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixManagerPermissions();
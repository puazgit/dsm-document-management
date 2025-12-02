const { PrismaClient } = require('@prisma/client');

async function checkManagerPermissions() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking manager@dsm.com permissions...\n');
    
    const user = await prisma.user.findUnique({
      where: { email: 'manager@dsm.com' },
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
      console.log('❌ User manager@dsm.com not found');
      return;
    }
    
    console.log('👤 USER:', user.email);
    console.log('📧 ID:', user.id);
    console.log('🎭 Active Roles:');
    
    user.userRoles.forEach(ur => {
      console.log(`   - ${ur.role.name} (${ur.role.displayName}) - Level: ${ur.role.level}`);
    });
    
    const allPermissions = user.userRoles.flatMap(ur => 
      ur.role.rolePermissions.map(rp => rp.permission.name)
    );
    
    console.log(`\n🔑 Total Permissions: ${allPermissions.length}`);
    
    const pdfPermissions = allPermissions.filter(p => 
      p.includes('pdf') || p.includes('download')
    );
    
    console.log(`\n📄 PDF/Download Permissions (${pdfPermissions.length}):`);
    if (pdfPermissions.length > 0) {
      pdfPermissions.forEach(p => console.log(`   ✅ ${p}`));
    } else {
      console.log('   ❌ NO PDF/DOWNLOAD PERMISSIONS FOUND!');
    }
    
    // Check specific permissions
    const hasDocDownload = allPermissions.includes('documents.download');
    const hasPdfDownload = allPermissions.includes('pdf.download');
    const hasPdfView = allPermissions.includes('pdf.view');
    const hasPdfPrint = allPermissions.includes('pdf.print');
    const hasPdfCopy = allPermissions.includes('pdf.copy');
    
    console.log('\n🎯 Key PDF Permissions Check:');
    console.log(`   documents.download: ${hasDocDownload ? '✅' : '❌'}`);
    console.log(`   pdf.download: ${hasPdfDownload ? '✅' : '❌'}`);
    console.log(`   pdf.view: ${hasPdfView ? '✅' : '❌'}`);
    console.log(`   pdf.print: ${hasPdfPrint ? '✅' : '❌'}`);
    console.log(`   pdf.copy: ${hasPdfCopy ? '✅' : '❌'}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkManagerPermissions();
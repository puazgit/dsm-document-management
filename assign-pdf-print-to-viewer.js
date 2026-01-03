const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🔍 Mencari capability PDF_PRINT dan role viewer...\n');
    
    const printCap = await prisma.roleCapability.findFirst({
      where: { name: 'PDF_PRINT' }
    });
    
    const viewerRole = await prisma.role.findFirst({
      where: { name: 'viewer' }
    });
    
    if (!printCap || !viewerRole) {
      console.log('❌ Capability atau Role tidak ditemukan');
      return;
    }
    
    console.log('✅ Capability:', printCap.name, '(ID:', printCap.id + ')');
    console.log('✅ Role:', viewerRole.displayName, '(ID:', viewerRole.id + ')\n');
    
    // Check if already assigned
    const existing = await prisma.roleCapabilityAssignment.findFirst({
      where: {
        roleId: viewerRole.id,
        capabilityId: printCap.id
      }
    });
    
    if (existing) {
      console.log('ℹ️  PDF_PRINT sudah ter-assign ke role viewer\n');
    } else {
      await prisma.roleCapabilityAssignment.create({
        data: {
          roleId: viewerRole.id,
          capabilityId: printCap.id
        }
      });
      console.log('✅ PDF_PRINT berhasil di-assign ke role viewer!\n');
    }
    
    // Verify - check user puas capabilities
    const puas = await prisma.user.findUnique({
      where: { email: 'puas@dsm.com' },
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
    
    if (puas) {
      const capabilities = puas.userRoles.flatMap(ur =>
        ur.role.capabilityAssignments.map(ca => ca.capability.name)
      );
      const pdfCaps = [...new Set(capabilities)].filter(c => c.includes('PDF') || c.includes('DOCUMENT'));
      
      console.log('📧 User: puas@dsm.com');
      console.log('🎭 Role:', puas.userRoles[0].role.displayName);
      console.log('\n📋 PDF/Document Capabilities:');
      pdfCaps.sort().forEach(c => {
        const icon = c.includes('PRINT') ? '🖨️' : c.includes('DOWNLOAD') ? '💾' : c.includes('VIEW') ? '👁️' : '📄';
        console.log('  ' + icon + ' ' + c);
      });
    }
    
    console.log('\n✅ Selesai! User puas (viewer) sekarang bisa print PDF.');
    console.log('💡 Logout dan login ulang sebagai puas@dsm.com untuk melihat tombol Print.\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();

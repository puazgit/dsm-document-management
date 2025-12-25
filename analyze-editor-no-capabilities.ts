import { prisma } from './src/lib/prisma';

(async () => {
  try {
    console.log('🔍 Analyzing Impact of NO Capability Assignments for Editor Role\n');
    console.log('═'.repeat(70));
    
    // Get editor role with both capabilities and permissions
    const editorRole = await prisma.role.findFirst({
      where: { name: 'editor' },
      include: {
        capabilityAssignments: {
          include: {
            capability: true
          }
        },
        rolePermissions: {
          where: { isGranted: true },
          include: {
            permission: true
          }
        },
        userRoles: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });
    
    if (!editorRole) {
      console.log('❌ Editor role not found');
      return;
    }
    
    console.log('\n📊 CURRENT STATE: Editor Role');
    console.log('─'.repeat(70));
    console.log(`Display Name: ${editorRole.displayName}`);
    console.log(`Level: ${editorRole.level}`);
    console.log(`Users with this role: ${editorRole.userRoles.length}`);
    
    if (editorRole.userRoles.length > 0) {
      console.log('\nUsers:');
      editorRole.userRoles.forEach((ur, i) => {
        console.log(`  ${i + 1}. ${ur.user.email} (${ur.user.firstName} ${ur.user.lastName})`);
      });
    }
    
    console.log('\n\n1️⃣  CAPABILITIES CURRENTLY ASSIGNED:');
    console.log('─'.repeat(70));
    if (editorRole.capabilityAssignments.length === 0) {
      console.log('⚠️  NO CAPABILITIES ASSIGNED (Current situation)');
    } else {
      editorRole.capabilityAssignments.forEach((assignment, index) => {
        console.log(`${index + 1}. ${assignment.capability.name}`);
        console.log(`   - ${assignment.capability.description}`);
        console.log(`   - Category: ${assignment.capability.category}`);
      });
    }
    
    console.log('\n\n2️⃣  PERMISSIONS CURRENTLY ASSIGNED:');
    console.log('─'.repeat(70));
    const permissionCount = editorRole.rolePermissions.length;
    console.log(`Total: ${permissionCount} permissions`);
    console.log('\nKey permissions:');
    const keyPermissions = editorRole.rolePermissions
      .filter(rp => 
        rp.permission.name.includes('pdf') || 
        rp.permission.name.includes('document') ||
        rp.permission.name.includes('user')
      )
      .slice(0, 15);
    
    keyPermissions.forEach((rp, index) => {
      console.log(`${index + 1}. ${rp.permission.name} - ${rp.permission.displayName}`);
    });
    
    console.log('\n\n⚠️  DAMPAK JIKA TIDAK ADA CAPABILITY ASSIGNMENT:');
    console.log('═'.repeat(70));
    
    console.log('\n❌ YANG AKAN GAGAL (karena checks hasCapability):');
    console.log('─'.repeat(70));
    console.log('1. Admin Page Access');
    console.log('   - Tidak bisa akses /admin/* pages');
    console.log('   - hasCapability(user, "ADMIN_ACCESS") → false');
    console.log('   - Akan di-redirect atau error 403');
    console.log('');
    console.log('2. Document Management Features');
    console.log('   - hasCapability(user, "DOCUMENT_FULL_ACCESS") → false');
    console.log('   - Tidak bisa bypass document access control');
    console.log('   - Tidak bisa approve/reject tanpa cek ownership');
    console.log('');
    console.log('3. User Management Features');
    console.log('   - hasCapability(user, "USER_MANAGE") → false');
    console.log('   - Tidak bisa manage users lain');
    console.log('   - Hanya bisa edit profile sendiri');
    console.log('');
    console.log('4. Workflow Bypass');
    console.log('   - Tidak ada bypass untuk workflow transitions');
    console.log('   - Harus follow normal approval flow');
    
    console.log('\n\n✅ YANG MASIH BERFUNGSI (karena pakai permissions):');
    console.log('─'.repeat(70));
    console.log('1. PDF Viewer Features');
    console.log('   - ✓ Bisa view PDF (ada permission: pdf.view)');
    console.log('   - ✓ Bisa download PDF (ada permission: pdf.download)');
    console.log('   - ✓ Bisa print PDF (ada permission: pdf.print)');
    console.log('   - ✓ Bisa copy PDF (ada permission: pdf.copy)');
    console.log('');
    console.log('2. Document Operations');
    console.log('   - ✓ Bisa create documents (permission: documents.create)');
    console.log('   - ✓ Bisa view documents (permission: documents.view)');
    console.log('   - ✓ Bisa update documents (permission: documents.update)');
    console.log('   - ✓ Bisa delete documents (permission: documents.delete)');
    console.log('');
    console.log('3. Comment Features');
    console.log('   - ✓ Bisa create comments (permission: comments.create)');
    console.log('   - ✓ Bisa moderate comments (permission: comments.moderate)');
    console.log('');
    console.log('4. Normal User Operations');
    console.log('   - ✓ Bisa view own profile');
    console.log('   - ✓ Bisa upload documents');
    console.log('   - ✓ Bisa access assigned documents');
    
    console.log('\n\n🎯 KESIMPULAN:');
    console.log('═'.repeat(70));
    console.log('');
    console.log('Tanpa Capability Assignment, role "editor" akan:');
    console.log('');
    console.log('❌ RESTRICTED ACCESS:');
    console.log('  - TIDAK bisa akses admin pages (/admin/*)');
    console.log('  - TIDAK bisa bypass access control');
    console.log('  - TIDAK bisa manage users lain');
    console.log('  - TIDAK ada special privileges');
    console.log('');
    console.log('✅ NORMAL ACCESS:');
    console.log('  - BISA pakai semua fitur yang di-protect oleh permissions');
    console.log('  - BISA view/download/print PDF (sesuai permission)');
    console.log('  - BISA create/edit/delete documents (sesuai permission)');
    console.log('  - BISA comment dan collaborate');
    console.log('');
    console.log('💡 RECOMMENDATION:');
    console.log('  Jika editor HANYA butuh edit documents (bukan admin):');
    console.log('  → Tidak perlu capability assignment');
    console.log('  → Permissions sudah cukup untuk day-to-day operations');
    console.log('');
    console.log('  Jika editor perlu akses admin pages atau bypass rules:');
    console.log('  → Assign capability: DOCUMENT_FULL_ACCESS atau ADMIN_ACCESS');
    
    console.log('\n\n📋 CHECKLIST: Capabilities yang Mungkin Dibutuhkan Editor');
    console.log('═'.repeat(70));
    
    const allCapabilities = await prisma.roleCapability.findMany({
      orderBy: { name: 'asc' }
    });
    
    console.log('\nAvailable capabilities:');
    allCapabilities.forEach((cap, i) => {
      const isAssigned = editorRole.capabilityAssignments.some(a => a.capability.id === cap.id);
      const status = isAssigned ? '✅' : '⬜';
      console.log(`${status} ${cap.name}`);
      console.log(`   ${cap.description}`);
      console.log(`   Recommended for editor: ${shouldEditorHave(cap.name)}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();

function shouldEditorHave(capName: string): string {
  const recommendations: Record<string, string> = {
    'ADMIN_ACCESS': '❌ NO - Editor bukan admin',
    'DOCUMENT_FULL_ACCESS': '⚠️  MAYBE - Jika perlu bypass document access control',
    'DOCUMENT_MANAGE': '✅ YES - Editor should manage document lifecycle',
    'USER_MANAGE': '❌ NO - Editor tidak perlu manage users',
    'ROLE_MANAGE': '❌ NO - Editor tidak perlu manage roles',
    'SYSTEM_CONFIGURE': '❌ NO - Editor tidak perlu system config'
  };
  
  return recommendations[capName] || '⚠️  CONSIDER - Tergantung kebutuhan';
}

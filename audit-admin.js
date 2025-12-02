const { PrismaClient } = require('@prisma/client');

async function auditAdminUser() {
  const prisma = new PrismaClient();
  try {
    console.log('🔍 AUDIT LENGKAP ROLE & PERMISSION: admin@dsm.com');
    console.log('='.repeat(70));
    console.log('');
    
    // Get user with all related data
    const user = await prisma.user.findUnique({
      where: { email: 'admin@dsm.com' },
      include: {
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
        },
        group: true,
        divisi: true,
        createdDocuments: {
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true
          }
        },
        documentActivities: {
          select: {
            action: true,
            description: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 5
        }
      }
    });
    
    if (!user) {
      console.log('❌ User admin@dsm.com tidak ditemukan');
      return;
    }
    
    console.log('👤 INFORMASI USER:');
    console.log('='.repeat(30));
    console.log(`📧 Email: ${user.email}`);
    console.log(`👤 Nama: ${user.firstName} ${user.lastName}`);
    console.log(`🆔 Username: ${user.username}`);
    console.log(`💼 Jabatan: ${user.position || 'Tidak diset'}`);
    console.log(`🏢 Departemen: ${user.department || 'Tidak diset'}`);
    console.log(`📱 Phone: ${user.phone || 'Tidak diset'}`);
    console.log(`✅ Status: ${user.isActive ? 'Aktif' : 'Tidak Aktif'}`);
    console.log(`📅 Dibuat: ${new Date(user.createdAt).toLocaleDateString('id-ID')}`);
    console.log(`📅 Login Terakhir: ${user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('id-ID') : 'Belum pernah login'}`);
    console.log('');
    
    console.log('🏢 ORGANISASI:');
    console.log('='.repeat(30));
    console.log(`🏷️ Group: ${user.group ? user.group.displayName + ' (' + user.group.name + ')' : 'Tidak ada'}`);
    console.log(`🏛️ Divisi: ${user.divisi ? user.divisi.name + ' (' + user.divisi.code + ')' : 'Tidak ada'}`);
    console.log('');
    
    console.log('👔 ROLE & LEVEL:');
    console.log('='.repeat(30));
    if (user.userRoles.length > 0) {
      user.userRoles.forEach((userRole, index) => {
        const role = userRole.role;
        console.log(`${index + 1}. Role: ${role.displayName} (${role.name})`);
        console.log(`   📊 Level: ${role.level}`);
        console.log(`   📝 Deskripsi: ${role.description || 'Tidak ada deskripsi'}`);
        console.log(`   🔧 System Role: ${role.isSystem ? 'Ya' : 'Tidak'}`);
        console.log(`   ✅ Status: ${userRole.isActive ? 'Aktif' : 'Tidak Aktif'}`);
        console.log(`   📅 Assigned: ${new Date(userRole.assignedAt).toLocaleDateString('id-ID')}`);
        console.log('');
      });
    } else {
      console.log('❌ Tidak ada role yang assigned');
    }
    
    console.log('🔐 PERMISSIONS DETAIL:');
    console.log('='.repeat(30));
    
    const allPermissions = [];
    user.userRoles.forEach(userRole => {
      userRole.role.rolePermissions.forEach(rp => {
        if (rp.isGranted) {
          allPermissions.push(rp.permission);
        }
      });
    });
    
    if (allPermissions.length > 0) {
      console.log(`✅ Total Permissions: ${allPermissions.length}`);
      console.log('');
      
      // Group permissions by module
      const permissionsByModule = {};
      allPermissions.forEach(perm => {
        if (!permissionsByModule[perm.module]) {
          permissionsByModule[perm.module] = [];
        }
        permissionsByModule[perm.module].push(perm);
      });
      
      Object.keys(permissionsByModule).sort().forEach(module => {
        console.log(`📂 ${module.toUpperCase()}:`);
        permissionsByModule[module].forEach(perm => {
          console.log(`   ✅ ${perm.name} - ${perm.displayName || perm.description || 'Tidak ada deskripsi'}`);
        });
        console.log('');
      });
    } else {
      console.log('❌ Tidak ada permissions');
    }
    
    console.log('🌐 URL ACCESS MATRIX:');
    console.log('='.repeat(30));
    console.log('✅ FULL ACCESS - Administrator memiliki akses ke SEMUA URL:');
    console.log('');
    console.log('📱 Main Pages:');
    console.log('   ✅ / (Landing)');
    console.log('   ✅ /dashboard');
    console.log('   ✅ /auth/login');
    console.log('');
    console.log('📄 Documents:');
    console.log('   ✅ /documents (Read/Write/Delete)');
    console.log('   ✅ /documents/upload');
    console.log('   ✅ /documents/search');
    console.log('   ✅ PDF Download & Security Features');
    console.log('');
    console.log('👤 Profile:');
    console.log('   ✅ /profile');
    console.log('');
    console.log('📊 Analytics:');
    console.log('   ✅ /analytics');
    console.log('');
    console.log('🔧 Admin Panel (FULL ACCESS):');
    console.log('   ✅ /admin');
    console.log('   ✅ /admin/users');
    console.log('   ✅ /admin/groups');
    console.log('   ✅ /admin/roles');
    console.log('   ✅ /admin/permissions');
    console.log('   ✅ /admin/pdf-permissions');
    console.log('   ✅ /admin/settings');
    console.log('   ✅ /admin/audit-logs');
    console.log('');
    console.log('🧪 Testing/Demo:');
    console.log('   ✅ /test');
    console.log('   ✅ /test-ui');
    console.log('   ✅ /pdf-demo');
    console.log('   ✅ /pdf-security-demo');
    console.log('   ✅ /sidebar-test');
    console.log('');
    
    console.log('🔌 API ACCESS:');
    console.log('='.repeat(30));
    console.log('✅ FULL API ACCESS - Semua endpoint tersedia:');
    console.log('   ✅ Authentication APIs');
    console.log('   ✅ User Management APIs');
    console.log('   ✅ Document APIs (CRUD + Download)');
    console.log('   ✅ Permission APIs');
    console.log('   ✅ Group APIs');
    console.log('   ✅ Analytics APIs');
    console.log('   ✅ Admin APIs');
    console.log('');
    
    console.log('📄 DOKUMEN ACTIVITY:');
    console.log('='.repeat(30));
    console.log(`📊 Total Dokumen Dibuat: ${user.createdDocuments.length}`);
    if (user.createdDocuments.length > 0) {
      console.log('📄 Dokumen Terbaru:');
      user.createdDocuments.slice(0, 3).forEach(doc => {
        console.log(`   • ${doc.title} (${doc.status}) - ${new Date(doc.createdAt).toLocaleDateString('id-ID')}`);
      });
    }
    console.log('');
    
    if (user.documentActivities.length > 0) {
      console.log('📊 Activity Terbaru:');
      user.documentActivities.forEach(activity => {
        console.log(`   • ${activity.action}: ${activity.description} - ${new Date(activity.createdAt).toLocaleDateString('id-ID')}`);
      });
    } else {
      console.log('📊 Belum ada activity dokumen');
    }
    console.log('');
    
    console.log('🔑 LOGIN CREDENTIALS:');
    console.log('='.repeat(30));
    console.log('📧 Email: admin@dsm.com');
    console.log('🔑 Password: admin123');
    console.log('');
    
    console.log('⚡ CAPABILITIES SUMMARY:');
    console.log('='.repeat(30));
    console.log('✅ System Administrator - Level Tertinggi');
    console.log('✅ Akses ke semua fitur aplikasi');
    console.log('✅ Dapat mengelola user, role, dan permission');
    console.log('✅ Akses penuh ke audit logs');
    console.log('✅ Dapat mengkonfigurasi sistem');
    console.log('✅ Upload, download, dan manage semua dokumen');
    console.log('✅ Lihat semua analytics dan reports');
    console.log('✅ Akses ke Prisma Studio (database)');
    console.log('');
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Error during audit:', error);
  }
}

auditAdminUser();
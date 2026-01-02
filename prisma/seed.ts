import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { seedRoleCapabilities } from './seeds/role-capabilities';
import { assignRoleCapabilities } from './seeds/assign-role-capabilities';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create Groups (Roles) first
  console.log('📝 Creating groups...');
  const groups = await Promise.all([
    prisma.group.upsert({
      where: { name: 'administrator' },
      update: {},
      create: {
        name: 'administrator',
        displayName: 'System Administrator',
        description: 'Administrator sistem dengan akses penuh untuk konfigurasi, manajemen user, backup data, dan maintenance sistem'
      }
    }),
    prisma.group.upsert({
      where: { name: 'ppd' },
      update: {},
      create: {
        name: 'ppd',
        displayName: 'Penanggung Jawab Dokumen (PPD)',
        description: 'Bertanggung jawab atas pengelolaan dokumen perusahaan, review, persetujuan, dan distribusi dokumen strategis'
      }
    }),
    prisma.group.upsert({
      where: { name: 'kadiv' },
      update: {},
      create: {
        name: 'kadiv',
        displayName: 'Kepala Divisi',
        description: 'Pemimpin divisi dengan wewenang persetujuan dokumen divisi, koordinasi lintas departemen, dan pelaporan ke manajemen'
      }
    }),
    prisma.group.upsert({
      where: { name: 'gm' },
      update: {},
      create: {
        name: 'gm',
        displayName: 'General Manager',
        description: 'Manajer umum dengan akses tingkat tinggi, oversight operasional, dan wewenang strategis untuk seluruh divisi'
      }
    }),
    prisma.group.upsert({
      where: { name: 'manager' },
      update: {},
      create: {
        name: 'manager',
        displayName: 'Manager',
        description: 'Manajer departemen dengan tanggung jawab operasional, supervisi tim, dan koordinasi dengan divisi lain'
      }
    }),
    prisma.group.upsert({
      where: { name: 'dirut' },
      update: {},
      create: {
        name: 'dirut',
        displayName: 'Direktur Utama',
        description: 'Pemimpin eksekutif perusahaan dengan kewenangan tertinggi, pengambil keputusan strategis, dan akses ke semua dokumen confidential'
      }
    }),
    prisma.group.upsert({
      where: { name: 'dewas' },
      update: {},
      create: {
        name: 'dewas',
        displayName: 'Dewan Pengawas',
        description: 'Badan pengawas independen dengan akses ke laporan keuangan, audit, dan dokumen governance perusahaan'
      }
    }),
    prisma.group.upsert({
      where: { name: 'komite_audit' },
      update: {},
      create: {
        name: 'komite_audit',
        displayName: 'Komite Audit',
        description: 'Komite independen untuk review dan evaluasi sistem pengendalian internal, laporan keuangan, dan compliance'
      }
    }),
    prisma.group.upsert({
      where: { name: 'staff' },
      update: {},
      create: {
        name: 'staff',
        displayName: 'Staff Karyawan',
        description: 'Karyawan regular dengan akses ke dokumen operasional sesuai departemen dan tanggung jawab kerja'
      }
    }),
    prisma.group.upsert({
      where: { name: 'guest' },
      update: {},
      create: {
        name: 'guest',
        displayName: 'Guest/Tamu',
        description: 'Akses terbatas hanya untuk dokumen publik dan informasi umum perusahaan'
      }
    }),
    // Tambahan grup untuk struktur organisasi lengkap
    prisma.group.upsert({
      where: { name: 'supervisor' },
      update: {},
      create: {
        name: 'supervisor',
        displayName: 'Supervisor',
        description: 'Supervisor tim dengan tanggung jawab pengawasan operasional harian dan koordinasi dengan manajemen'
      }
    }),
    prisma.group.upsert({
      where: { name: 'sekretaris' },
      update: {},
      create: {
        name: 'sekretaris',
        displayName: 'Sekretaris/Admin',
        description: 'Sekretaris dan staff administrasi dengan akses ke dokumen administratif dan korespondensi'
      }
    }),
    prisma.group.upsert({
      where: { name: 'hrd' },
      update: {},
      create: {
        name: 'hrd',
        displayName: 'Human Resource Development',
        description: 'Departemen SDM dengan akses ke dokumen kepegawaian, kebijakan, dan pengembangan karyawan'
      }
    }),
    prisma.group.upsert({
      where: { name: 'finance' },
      update: {},
      create: {
        name: 'finance',
        displayName: 'Finance & Accounting',
        description: 'Departemen keuangan dengan akses ke laporan keuangan, anggaran, dan dokumen finansial'
      }
    }),
    prisma.group.upsert({
      where: { name: 'operations' },
      update: {},
      create: {
        name: 'operations',
        displayName: 'Operations',
        description: 'Departemen operasional dengan akses ke dokumen operasional dan prosedur kerja'
      }
    }),
    prisma.group.upsert({
      where: { name: 'tik' },
      update: {},
      create: {
        name: 'tik',
        displayName: 'Bidang Teknologi Informasi & Komunikasi',
        description: 'Bidang TIK dengan akses ke dokumen teknis, sistem, dan infrastruktur IT'
      }
    })
  ]);

  console.log(`✅ Created ${groups.length} groups`);

  // Create Document Types
  console.log('📄 Creating document types...');
  const documentTypes = await Promise.all([
    prisma.documentType.upsert({
      where: { slug: 'panduan-sistem-manajemen' },
      update: {},
      create: {
        name: 'Panduan Sistem Manajemen',
        slug: 'panduan-sistem-manajemen',
        description: 'Dokumen panduan sistem manajemen perusahaan',
        icon: '📋',
        color: '#dc2626',
        accessLevel: 8,
        requiredApproval: true,
        retentionPeriod: 1825, // 5 years
        sortOrder: 1
      }
    }),
    prisma.documentType.upsert({
      where: { slug: 'prosedur' },
      update: {},
      create: {
        name: 'Prosedur',
        slug: 'prosedur',
        description: 'Dokumen prosedur operasional standar',
        icon: '⚙️',
        color: '#ea580c',
        accessLevel: 6,
        requiredApproval: true,
        retentionPeriod: 1095, // 3 years
        sortOrder: 2
      }
    }),
    prisma.documentType.upsert({
      where: { slug: 'instruksi-kerja-khusus' },
      update: {},
      create: {
        name: 'Instruksi Kerja Bersifat Khusus',
        slug: 'instruksi-kerja-khusus',
        description: 'Instruksi kerja untuk keperluan khusus departemen',
        icon: '🎯',
        color: '#d97706',
        accessLevel: 5,
        requiredApproval: true,
        retentionPeriod: 730, // 2 years
        sortOrder: 3
      }
    }),
    prisma.documentType.upsert({
      where: { slug: 'instruksi-kerja-umum' },
      update: {},
      create: {
        name: 'Instruksi Kerja Bersifat Umum',
        slug: 'instruksi-kerja-umum',
        description: 'Instruksi kerja umum untuk seluruh karyawan',
        icon: '📝',
        color: '#16a34a',
        accessLevel: 3,
        requiredApproval: false,
        retentionPeriod: 365, // 1 year
        sortOrder: 4
      }
    }),
    prisma.documentType.upsert({
      where: { slug: 'dokumen-internal' },
      update: {},
      create: {
        name: 'Dokumen Internal',
        slug: 'dokumen-internal',
        description: 'Dokumen internal perusahaan',
        icon: '🏢',
        color: '#0ea5e9',
        accessLevel: 4,
        requiredApproval: false,
        retentionPeriod: 730, // 2 years
        sortOrder: 5
      }
    }),
    prisma.documentType.upsert({
      where: { slug: 'dokumen-eksternal' },
      update: {},
      create: {
        name: 'Dokumen Eksternal',
        slug: 'dokumen-eksternal',
        description: 'Dokumen dari pihak eksternal',
        icon: '🌐',
        color: '#8b5cf6',
        accessLevel: 2,
        requiredApproval: false,
        retentionPeriod: 1095, // 3 years
        sortOrder: 6
      }
    }),
    prisma.documentType.upsert({
      where: { slug: 'dokumen-eksternal-smk3' },
      update: {},
      create: {
        name: 'Dokumen Eksternal SMK3',
        slug: 'dokumen-eksternal-smk3',
        description: 'Dokumen SMK3 dari pihak eksternal',
        icon: '🛡️',
        color: '#dc2626',
        accessLevel: 6,
        requiredApproval: true,
        retentionPeriod: 2190, // 6 years
        sortOrder: 7
      }
    })
  ]);

  console.log(`✅ Created ${documentTypes.length} document types`);

  // Create Divisions
  console.log('🏢 Creating divisions...');
  const divisions = await Promise.all([
    prisma.divisi.upsert({
      where: { code: 'IT' },
      update: {},
      create: {
        name: 'Information Technology',
        code: 'IT',
        description: 'Divisi Teknologi Informasi'
      }
    }),
    prisma.divisi.upsert({
      where: { code: 'HR' },
      update: {},
      create: {
        name: 'Human Resources',
        code: 'HR',
        description: 'Divisi Sumber Daya Manusia'
      }
    }),
    prisma.divisi.upsert({
      where: { code: 'FIN' },
      update: {},
      create: {
        name: 'Finance',
        code: 'FIN',
        description: 'Divisi Keuangan'
      }
    }),
    prisma.divisi.upsert({
      where: { code: 'OPS' },
      update: {},
      create: {
        name: 'Operations',
        code: 'OPS',
        description: 'Divisi Operasional'
      }
    }),
    prisma.divisi.upsert({
      where: { code: 'QA' },
      update: {},
      create: {
        name: 'Quality Assurance',
        code: 'QA',
        description: 'Divisi Quality Assurance'
      }
    })
  ]);

  console.log(`✅ Created ${divisions.length} divisions`);

  // Create Default Admin User
  console.log('👤 Creating default admin user...');
  const adminGroup = await prisma.group.findUnique({ where: { name: 'administrator' } });
  const itDivision = await prisma.divisi.findUnique({ where: { code: 'IT' } });
  
  const hashedPassword = await bcrypt.hash('admin123', 12);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@dsm.com' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@dsm.com',
      passwordHash: hashedPassword,
      firstName: 'System',
      lastName: 'Administrator',
      groupId: adminGroup?.id,
      divisiId: itDivision?.id
    }
  });

  console.log(`✅ Created admin user: ${adminUser.email}`);

  // Create Sample Users
  console.log('👥 Creating sample users...');
  const ppdGroup = await prisma.group.findUnique({ where: { name: 'ppd' } });
  const kadivGroup = await prisma.group.findUnique({ where: { name: 'kadiv' } });
  const managerGroup = await prisma.group.findUnique({ where: { name: 'manager' } });
  const tikGroup = await prisma.group.findUnique({ where: { name: 'tik' } });
  const operationsGroup = await prisma.group.findUnique({ where: { name: 'operations' } });
  const staffGroup = await prisma.group.findUnique({ where: { name: 'staff' } });
  const financeGroup = await prisma.group.findUnique({ where: { name: 'finance' } });

  const sampleUsers = await Promise.all([
    // PPD User
    prisma.user.upsert({
      where: { email: 'ppd@dsm.com' },
      update: {},
      create: {
        username: 'ppd_user',
        email: 'ppd@dsm.com',
        passwordHash: await bcrypt.hash('ppd123', 12),
        firstName: 'PPD',
        lastName: 'User',
        groupId: ppdGroup?.id,
        divisiId: itDivision?.id
      }
    }),
    // Kadiv User
    prisma.user.upsert({
      where: { email: 'kadiv@dsm.com' },
      update: {},
      create: {
        username: 'kadiv_user',
        email: 'kadiv@dsm.com',
        passwordHash: await bcrypt.hash('kadiv123', 12),
        firstName: 'Kepala',
        lastName: 'Divisi',
        groupId: kadivGroup?.id,
        divisiId: divisions[1].id // HR Division
      }
    }),
    // Manager User
    prisma.user.upsert({
      where: { email: 'manager@dsm.com' },
      update: {},
      create: {
        username: 'manager_user',
        email: 'manager@dsm.com',
        passwordHash: await bcrypt.hash('manager123', 12),
        firstName: 'Manager',
        lastName: 'User',
        groupId: managerGroup?.id,
        divisiId: divisions[2].id // Finance Division
      }
    }),
    // Operations Staff
    prisma.user.upsert({
      where: { email: 'operations@dsm.com' },
      update: {},
      create: {
        username: 'operations_user',
        email: 'operations@dsm.com',
        passwordHash: await bcrypt.hash('operations123', 12),
        firstName: 'Operations',
        lastName: 'Staff',
        groupId: operationsGroup?.id,
        divisiId: divisions[3].id // Operations Division
      }
    }),
    // TIK Staff
    prisma.user.upsert({
      where: { email: 'tik@dsm.com' },
      update: {},
      create: {
        username: 'tik_user',
        email: 'tik@dsm.com',
        passwordHash: await bcrypt.hash('tik123', 12),
        firstName: 'TIK',
        lastName: 'Staff',
        groupId: tikGroup?.id,
        divisiId: divisions[0].id // IT Division
      }
    }),
    // Editor User
    prisma.user.upsert({
      where: { email: 'editor@dsm.com' },
      update: {},
      create: {
        username: 'editor_user',
        email: 'editor@dsm.com',
        passwordHash: await bcrypt.hash('editor123', 12),
        firstName: 'Document',
        lastName: 'Editor',
        groupId: staffGroup?.id,
        divisiId: divisions[3].id // Operations Division
      }
    }),
    // Finance User
    prisma.user.upsert({
      where: { email: 'finance@dsm.com' },
      update: {},
      create: {
        username: 'finance_user',
        email: 'finance@dsm.com',
        passwordHash: await bcrypt.hash('finance123', 12),
        firstName: 'Finance',
        lastName: 'Department',
        groupId: financeGroup?.id,
        divisiId: divisions[2].id // Finance Division
      }
    })
  ]);

  console.log(`✅ Created ${sampleUsers.length} sample users`);

  // Create Menu Items
  console.log('📋 Creating menu items...');
  const menuItems = await Promise.all([
    // Main Navigation
    prisma.menu.upsert({
      where: { id: 'dashboard' },
      update: {},
      create: {
        id: 'dashboard',
        name: 'Dashboard',
        url: '/dashboard',
        icon: '🏠',
        sortOrder: 1,
        accessGroups: ['administrator', 'ppd', 'kadiv', 'gm', 'manager', 'dirut', 'dewas', 'komite_audit', 'staff', 'operations', 'tik', 'finance', 'hrd']
      }
    }),
    prisma.menu.upsert({
      where: { id: 'documents' },
      update: {},
      create: {
        id: 'documents',
        name: 'Dokumen',
        url: '/documents',
        icon: '📄',
        sortOrder: 2,
        accessGroups: ['administrator', 'ppd', 'kadiv', 'gm', 'manager', 'dirut', 'dewas', 'komite_audit', 'staff', 'operations', 'tik', 'finance', 'hrd']
      }
    }),
    prisma.menu.upsert({
      where: { id: 'upload' },
      update: {},
      create: {
        id: 'upload',
        name: 'Upload Dokumen',
        url: '/documents/upload',
        icon: '⬆️',
        sortOrder: 3,
        accessGroups: ['administrator', 'ppd', 'kadiv', 'manager']
      }
    }),
    prisma.menu.upsert({
      where: { id: 'users' },
      update: {},
      create: {
        id: 'users',
        name: 'Pengguna',
        url: '/users',
        icon: '👥',
        sortOrder: 4,
        accessGroups: ['administrator', 'ppd']
      }
    }),
    prisma.menu.upsert({
      where: { id: 'admin' },
      update: {},
      create: {
        id: 'admin',
        name: 'Administrasi',
        url: '/admin',
        icon: '⚙️',
        sortOrder: 5,
        accessGroups: ['administrator']
      }
    })
  ]);

  console.log(`✅ Created ${menuItems.length} menu items`);

  // Create System Configuration
  console.log('⚙️ Creating system configuration...');
  const systemConfigs = await Promise.all([
    prisma.systemConfig.upsert({
      where: { key: 'app_name' },
      update: {},
      create: {
        key: 'app_name',
        value: 'Document Management System',
        dataType: 'string',
        category: 'application',
        description: 'Application name displayed in the interface'
      }
    }),
    prisma.systemConfig.upsert({
      where: { key: 'max_file_size' },
      update: {},
      create: {
        key: 'max_file_size',
        value: '52428800', // 50MB
        dataType: 'number',
        category: 'upload',
        description: 'Maximum file size for uploads in bytes'
      }
    }),
    prisma.systemConfig.upsert({
      where: { key: 'allowed_file_types' },
      update: {},
      create: {
        key: 'allowed_file_types',
        value: 'pdf,doc,docx,xls,xlsx,ppt,pptx,jpg,jpeg,png',
        dataType: 'string',
        category: 'upload',
        description: 'Allowed file extensions for uploads'
      }
    }),
    prisma.systemConfig.upsert({
      where: { key: 'session_timeout' },
      update: {},
      create: {
        key: 'session_timeout',
        value: '86400', // 24 hours
        dataType: 'number',
        category: 'security',
        description: 'Session timeout in seconds'
      }
    }),
    prisma.systemConfig.upsert({
      where: { key: 'enable_notifications' },
      update: {},
      create: {
        key: 'enable_notifications',
        value: 'true',
        dataType: 'boolean',
        category: 'features',
        description: 'Enable real-time notifications'
      }
    })
  ]);

  console.log(`✅ Created ${systemConfigs.length} system configurations`);

  console.log('🎉 Database seed completed successfully!');
  
  console.log('\n📊 Seed Summary:');
  console.log(`- Groups: ${groups.length}`);
  console.log(`- Document Types: ${documentTypes.length}`);
  console.log(`- Divisions: ${divisions.length}`);
  console.log(`- Users: ${sampleUsers.length + 1} (including admin)`);
  console.log(`- Menu Items: ${menuItems.length}`);
  console.log(`- System Configs: ${systemConfigs.length}`);

  console.log('\n🔑 Default Login Credentials:');
  console.log('Admin: admin@dsm.com / admin123');
  console.log('PPD: ppd@dsm.com / ppd123');
  console.log('Kadiv: kadiv@dsm.com / kadiv123');
  console.log('Manager: manager@dsm.com / manager123');
  console.log('Operations: operations@dsm.com / operations123');
  console.log('TIK: tik@dsm.com / tik123');
  console.log('Editor: editor@dsm.com / editor123');
  console.log('Finance: finance@dsm.com / finance123');

  // Create Roles
  console.log('\n👤 Creating roles...');
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { name: 'admin' },
      update: {},
      create: {
        name: 'admin',
        displayName: 'Administrator',
        description: 'Full system access',
        isSystem: true,
      }
    }),
    prisma.role.upsert({
      where: { name: 'editor' },
      update: {},
      create: {
        name: 'editor',
        displayName: 'Editor',
        description: 'Can create and edit documents',
        isSystem: true,
      }
    }),
    prisma.role.upsert({
      where: { name: 'viewer' },
      update: {},
      create: {
        name: 'viewer',
        displayName: 'Viewer',
        description: 'Can only view documents',
        isSystem: true,
      }
    }),
  ]);
  console.log(`✅ Created ${roles.length} roles`);

  // Seed role capabilities
  console.log('\n🔐 Seeding role capabilities...');
  await seedRoleCapabilities();
  
  console.log('\n👥 Assigning capabilities to roles...');
  await assignRoleCapabilities();

  // Assign roles to users
  console.log('\n🎭 Assigning roles to users...');
  const adminRole = roles.find(r => r.name === 'admin');
  const editorRole = roles.find(r => r.name === 'editor');
  const viewerRole = roles.find(r => r.name === 'viewer');

  const userRoleAssignments = [];

  // Assign admin role to admin user
  if (adminRole) {
    userRoleAssignments.push(
      prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: adminUser.id,
            roleId: adminRole.id,
          }
        },
        update: {},
        create: {
          userId: adminUser.id,
          roleId: adminRole.id,
          assignedBy: adminUser.id,
          isActive: true,
        }
      })
    );
  }

  // Assign editor role to ppd, kadiv, manager users
  if (editorRole) {
    const ppdUser = sampleUsers.find(u => u.email === 'ppd@dsm.com');
    const kadivUser = sampleUsers.find(u => u.email === 'kadiv@dsm.com');
    const managerUser = sampleUsers.find(u => u.email === 'manager@dsm.com');
    const editorUser = sampleUsers.find(u => u.email === 'editor@dsm.com');

    [ppdUser, kadivUser, managerUser, editorUser].forEach(user => {
      if (user) {
        userRoleAssignments.push(
          prisma.userRole.upsert({
            where: {
              userId_roleId: {
                userId: user.id,
                roleId: editorRole.id,
              }
            },
            update: {},
            create: {
              userId: user.id,
              roleId: editorRole.id,
              assignedBy: adminUser.id,
              isActive: true,
            }
          })
        );
      }
    });
  }

  // Assign viewer role to operations, tik, finance users
  if (viewerRole) {
    const operationsUser = sampleUsers.find(u => u.email === 'operations@dsm.com');
    const tikUser = sampleUsers.find(u => u.email === 'tik@dsm.com');
    const financeUser = sampleUsers.find(u => u.email === 'finance@dsm.com');

    [operationsUser, tikUser, financeUser].forEach(user => {
      if (user) {
        userRoleAssignments.push(
          prisma.userRole.upsert({
            where: {
              userId_roleId: {
                userId: user.id,
                roleId: viewerRole.id,
              }
            },
            update: {},
            create: {
              userId: user.id,
              roleId: viewerRole.id,
              assignedBy: adminUser.id,
              isActive: true,
            }
          })
        );
      }
    });
  }

  const assignedUserRoles = await Promise.all(userRoleAssignments);
  console.log(`✅ Assigned ${assignedUserRoles.length} roles to users`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
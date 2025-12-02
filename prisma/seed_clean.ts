import { PrismaClient } from '@prisma/client'
import { seedRolesAndPermissions } from './seeds/roles-permissions';

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create Groups (Roles) first - organizational structure only
  console.log('📝 Creating groups...');
  const groups = await Promise.all([
    prisma.group.upsert({
      where: { name: 'administrator' },
      update: {},
      create: {
        name: 'administrator',
        displayName: 'System Administrator',
        description: 'Administrator sistem dengan akses penuh untuk konfigurasi, manajemen user, backup data, dan maintenance sistem',
        level: 10
      }
    }),
    prisma.group.upsert({
      where: { name: 'ppd' },
      update: {},
      create: {
        name: 'ppd',
        displayName: 'Penanggung Jawab Dokumen (PPD)',
        description: 'Bertanggung jawab atas pengelolaan dokumen perusahaan, review, persetujuan, dan distribusi dokumen strategis',
        level: 9
      }
    }),
    prisma.group.upsert({
      where: { name: 'kadiv' },
      update: {},
      create: {
        name: 'kadiv',
        displayName: 'Kepala Divisi',
        description: 'Pemimpin divisi dengan wewenang persetujuan dokumen divisi, koordinasi lintas departemen, dan pelaporan ke manajemen',
        level: 8
      }
    }),
    prisma.group.upsert({
      where: { name: 'gm' },
      update: {},
      create: {
        name: 'gm',
        displayName: 'General Manager',
        description: 'Manajer umum dengan akses tingkat tinggi, oversight operasional, dan wewenang strategis untuk seluruh divisi',
        level: 7
      }
    }),
    prisma.group.upsert({
      where: { name: 'manager' },
      update: {},
      create: {
        name: 'manager',
        displayName: 'Manager',
        description: 'Manajer departemen dengan tanggung jawab operasional, supervisi tim, dan koordinasi dengan divisi lain',
        level: 6
      }
    }),
    prisma.group.upsert({
      where: { name: 'dirut' },
      update: {},
      create: {
        name: 'dirut',
        displayName: 'Direktur Utama',
        description: 'Pemimpin eksekutif perusahaan dengan kewenangan tertinggi, pengambil keputusan strategis, dan akses ke semua dokumen confidential',
        level: 10
      }
    }),
    prisma.group.upsert({
      where: { name: 'dewas' },
      update: {},
      create: {
        name: 'dewas',
        displayName: 'Dewan Pengawas',
        description: 'Badan pengawas independen dengan akses ke laporan keuangan, audit, dan dokumen governance perusahaan',
        level: 9
      }
    }),
    prisma.group.upsert({
      where: { name: 'komite_audit' },
      update: {},
      create: {
        name: 'komite_audit',
        displayName: 'Komite Audit',
        description: 'Komite independen untuk review dan evaluasi sistem pengendalian internal, laporan keuangan, dan compliance',
        level: 8
      }
    }),
    prisma.group.upsert({
      where: { name: 'staff' },
      update: {},
      create: {
        name: 'staff',
        displayName: 'Staff Karyawan',
        description: 'Karyawan regular dengan akses ke dokumen operasional sesuai departemen dan tanggung jawab kerja',
        level: 3
      }
    }),
    prisma.group.upsert({
      where: { name: 'guest' },
      update: {},
      create: {
        name: 'guest',
        displayName: 'Guest/Tamu',
        description: 'Akses terbatas hanya untuk dokumen publik dan informasi umum perusahaan',
        level: 1
      }
    }),
    // Additional organizational groups
    prisma.group.upsert({
      where: { name: 'supervisor' },
      update: {},
      create: {
        name: 'supervisor',
        displayName: 'Supervisor',
        description: 'Supervisor tim dengan tanggung jawab pengawasan operasional harian dan koordinasi dengan manajemen',
        level: 5
      }
    }),
    prisma.group.upsert({
      where: { name: 'sekretaris' },
      update: {},
      create: {
        name: 'sekretaris',
        displayName: 'Sekretaris/Admin',
        description: 'Sekretaris dan staff administrasi dengan akses ke dokumen administratif dan korespondensi',
        level: 4
      }
    }),
    prisma.group.upsert({
      where: { name: 'hrd' },
      update: {},
      create: {
        name: 'hrd',
        displayName: 'Human Resource Development',
        description: 'Departemen SDM dengan akses ke dokumen kepegawaian, kebijakan, dan pengembangan karyawan',
        level: 6
      }
    }),
    prisma.group.upsert({
      where: { name: 'finance' },
      update: {},
      create: {
        name: 'finance',
        displayName: 'Finance & Accounting',
        description: 'Departemen keuangan dengan akses ke laporan keuangan, anggaran, dan dokumen finansial',
        level: 7
      }
    })
  ]);

  console.log(`✅ Created ${groups.length} groups`);

  // Create Document Types
  console.log('📄 Creating document types...');
  const documentTypes = await Promise.all([
    prisma.documentType.upsert({
      where: { slug: 'kebijakan' },
      update: {},
      create: {
        name: 'Kebijakan',
        slug: 'kebijakan',
        description: 'Dokumen kebijakan perusahaan',
        requiredApproval: true,
        retentionPeriod: 2555, // 7 years
        isActive: true
      }
    }),
    prisma.documentType.upsert({
      where: { slug: 'sop' },
      update: {},
      create: {
        name: 'Standard Operating Procedure (SOP)',
        slug: 'sop',
        description: 'Dokumen prosedur operasional standar',
        requiredApproval: true,
        retentionPeriod: 1825, // 5 years
        isActive: true
      }
    }),
    prisma.documentType.upsert({
      where: { slug: 'laporan' },
      update: {},
      create: {
        name: 'Laporan',
        slug: 'laporan',
        description: 'Dokumen laporan dan data analisis',
        requiredApproval: false,
        retentionPeriod: 1095, // 3 years
        isActive: true
      }
    }),
    prisma.documentType.upsert({
      where: { slug: 'kontrak' },
      update: {},
      create: {
        name: 'Kontrak',
        slug: 'kontrak',
        description: 'Dokumen kontrak dan perjanjian',
        requiredApproval: true,
        retentionPeriod: 3650, // 10 years
        isActive: true
      }
    }),
    prisma.documentType.upsert({
      where: { slug: 'memo' },
      update: {},
      create: {
        name: 'Memo',
        slug: 'memo',
        description: 'Memo internal perusahaan',
        requiredApproval: false,
        retentionPeriod: 365, // 1 year
        isActive: true
      }
    }),
    prisma.documentType.upsert({
      where: { slug: 'formulir' },
      update: {},
      create: {
        name: 'Formulir',
        slug: 'formulir',
        description: 'Berbagai formulir perusahaan',
        requiredApproval: false,
        retentionPeriod: 730, // 2 years
        isActive: true
      }
    }),
    prisma.documentType.upsert({
      where: { slug: 'presentation' },
      update: {},
      create: {
        name: 'Presentation',
        slug: 'presentation',
        description: 'File presentasi dan slide',
        requiredApproval: false,
        retentionPeriod: 1095, // 3 years
        isActive: true
      }
    })
  ]);

  console.log(`✅ Created ${documentTypes.length} document types`);

  // Rest of seed data (divisions, users, menus, etc.) - keeping existing structure
  // ... (keeping the existing seed data as is)

  console.log('🌱 Seeding roles and permissions...')
  await seedRolesAndPermissions();

  console.log('🎉 Database seed completed successfully!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
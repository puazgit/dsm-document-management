import { PrismaClient, DocumentStatus, ActivityAction } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedDocuments() {
  console.log('📄 Seeding documents...');

  // Get required data
  const documentTypes = await prisma.documentType.findMany();
  const users = await prisma.user.findMany();
  const groups = await prisma.group.findMany();

  if (documentTypes.length === 0 || users.length === 0) {
    console.log('⚠️ Skipping document seeding - no document types or users found');
    return;
  }

  // Admin user for creating documents
  const adminUser = users.find(u => u.email === 'admin@dsm.com');
  const ppdUser = users.find(u => u.email === 'ppd@dsm.com');
  const editorUser = users.find(u => u.email === 'editor@dsm.com');
  const tikUser = users.find(u => u.email === 'tik@dsm.com');

  if (!adminUser) {
    console.log('⚠️ Skipping document seeding - admin user not found');
    return;
  }

  // Get document type IDs
  const panduanType = documentTypes.find(dt => dt.slug === 'panduan-sistem-manajemen');
  const prosedurType = documentTypes.find(dt => dt.slug === 'prosedur');
  const ikKhususType = documentTypes.find(dt => dt.slug === 'instruksi-kerja-khusus');
  const ikUmumType = documentTypes.find(dt => dt.slug === 'instruksi-kerja-umum');
  const internalType = documentTypes.find(dt => dt.slug === 'dokumen-internal');
  const eksternalType = documentTypes.find(dt => dt.slug === 'dokumen-eksternal');

  // Get group names
  const adminGroups = groups.filter(g => ['administrator', 'ppd', 'kadiv'].includes(g.name)).map(g => g.name);
  const managementGroups = groups.filter(g => ['administrator', 'ppd', 'kadiv', 'gm', 'manager'].includes(g.name)).map(g => g.name);
  const allGroups = groups.filter(g => !['guest'].includes(g.name)).map(g => g.name);
  const tikGroups = groups.filter(g => ['administrator', 'ppd', 'tik', 'kadiv'].includes(g.name)).map(g => g.name);
  const operationsGroups = groups.filter(g => ['administrator', 'ppd', 'kadiv', 'operations', 'manager'].includes(g.name)).map(g => g.name);

  // Document 1: Panduan Sistem Manajemen ISO 9001
  const doc1 = await prisma.document.upsert({
    where: { id: 'seed-doc-1' },
    update: {},
    create: {
      id: 'seed-doc-1',
      title: 'Panduan Sistem Manajemen Mutu ISO 9001:2015',
      description: 'Panduan lengkap implementasi sistem manajemen mutu berdasarkan standar ISO 9001:2015 untuk seluruh unit kerja di perusahaan.',
      fileName: 'panduan-smm-iso-9001-2015.pdf',
      filePath: '/uploads/documents/panduan-smm-iso-9001-2015.pdf',
      fileSize: BigInt(2548000),
      fileType: 'pdf',
      mimeType: 'application/pdf',
      version: '3.0',
      status: DocumentStatus.PUBLISHED,
      accessGroups: allGroups,
      downloadCount: 145,
      viewCount: 892,
      tags: ['ISO 9001', 'Sistem Manajemen', 'Mutu', 'Standar'],
      metadata: {
        revisionNumber: 3,
        effectiveDate: '2024-01-01',
        nextReviewDate: '2025-01-01',
        documentNumber: 'PSM-001-2024',
        department: 'Quality Assurance'
      },
      publishedAt: new Date('2024-01-15T08:00:00Z'),
      extractedText: 'Panduan Sistem Manajemen Mutu ISO 9001:2015. Dokumen ini menjelaskan implementasi sistem manajemen mutu...',
      extractionStatus: 'completed',
      extractedAt: new Date('2024-01-15T09:00:00Z'),
      documentTypeId: panduanType?.id || documentTypes[0].id,
      createdById: adminUser.id,
      updatedById: ppdUser?.id || adminUser.id,
      approvedById: adminUser.id,
      approvedAt: new Date('2024-01-14T16:00:00Z'),
      createdAt: new Date('2024-01-10T10:00:00Z'),
      updatedAt: new Date('2024-01-14T14:00:00Z')
    }
  });

  // Document 2: Prosedur Backup Database
  const doc2 = await prisma.document.upsert({
    where: { id: 'seed-doc-2' },
    update: {},
    create: {
      id: 'seed-doc-2',
      title: 'Prosedur Backup dan Recovery Database',
      description: 'Standar operasional prosedur untuk melakukan backup dan recovery database sistem informasi perusahaan.',
      fileName: 'prosedur-backup-database-v2.pdf',
      filePath: '/uploads/documents/prosedur-backup-database-v2.pdf',
      fileSize: BigInt(1024500),
      fileType: 'pdf',
      mimeType: 'application/pdf',
      version: '2.1',
      status: DocumentStatus.PUBLISHED,
      accessGroups: tikGroups,
      downloadCount: 67,
      viewCount: 234,
      tags: ['Database', 'Backup', 'Recovery', 'IT', 'Prosedur'],
      metadata: {
        revisionNumber: 2,
        effectiveDate: '2024-02-01',
        nextReviewDate: '2025-02-01',
        documentNumber: 'SOP-TIK-003-2024',
        department: 'Teknologi Informasi'
      },
      publishedAt: new Date('2024-02-01T08:00:00Z'),
      extractedText: 'Standard Operating Procedure untuk backup dan recovery database PostgreSQL, MySQL, dan MongoDB...',
      extractionStatus: 'completed',
      extractedAt: new Date('2024-02-01T08:30:00Z'),
      documentTypeId: prosedurType?.id || documentTypes[0].id,
      createdById: tikUser?.id || adminUser.id,
      updatedById: tikUser?.id || adminUser.id,
      approvedById: ppdUser?.id || adminUser.id,
      approvedAt: new Date('2024-01-30T15:00:00Z'),
      createdAt: new Date('2024-01-20T09:00:00Z'),
      updatedAt: new Date('2024-01-30T14:00:00Z')
    }
  });

  // Document 3: Instruksi Kerja Khusus - Pengujian Software
  const doc3 = await prisma.document.upsert({
    where: { id: 'seed-doc-3' },
    update: {},
    create: {
      id: 'seed-doc-3',
      title: 'Instruksi Kerja Khusus: Pengujian Software Pre-Production',
      description: 'Instruksi kerja detail untuk melakukan pengujian aplikasi sebelum deployment ke environment production.',
      fileName: 'ik-pengujian-software-preprod.pdf',
      filePath: '/uploads/documents/ik-pengujian-software-preprod.pdf',
      fileSize: BigInt(856200),
      fileType: 'pdf',
      mimeType: 'application/pdf',
      version: '1.3',
      status: DocumentStatus.IN_REVIEW,
      accessGroups: tikGroups,
      downloadCount: 23,
      viewCount: 89,
      tags: ['Testing', 'Software', 'QA', 'Deployment'],
      metadata: {
        revisionNumber: 1,
        effectiveDate: '2024-03-01',
        nextReviewDate: '2024-09-01',
        documentNumber: 'IK-TIK-012-2024',
        department: 'Teknologi Informasi',
        reviewers: ['ppd@dsm.com', 'kadiv@dsm.com']
      },
      extractedText: 'Instruksi kerja untuk pengujian fungsional, integrasi, dan performa aplikasi sebelum go-live...',
      extractionStatus: 'completed',
      extractedAt: new Date('2024-02-15T10:00:00Z'),
      documentTypeId: ikKhususType?.id || documentTypes[0].id,
      createdById: editorUser?.id || adminUser.id,
      updatedById: tikUser?.id || adminUser.id,
      createdAt: new Date('2024-02-10T13:00:00Z'),
      updatedAt: new Date('2024-02-15T09:30:00Z')
    }
  });

  // Document 4: Instruksi Kerja Umum - Penggunaan Email
  const doc4 = await prisma.document.upsert({
    where: { id: 'seed-doc-4' },
    update: {},
    create: {
      id: 'seed-doc-4',
      title: 'Instruksi Kerja Umum: Penggunaan Email Korporat',
      description: 'Panduan penggunaan email korporat yang aman dan profesional untuk seluruh karyawan.',
      fileName: 'iku-penggunaan-email-korporat.pdf',
      filePath: '/uploads/documents/iku-penggunaan-email-korporat.pdf',
      fileSize: BigInt(645000),
      fileType: 'pdf',
      mimeType: 'application/pdf',
      version: '1.0',
      status: DocumentStatus.PUBLISHED,
      accessGroups: allGroups,
      downloadCount: 312,
      viewCount: 1456,
      tags: ['Email', 'Komunikasi', 'Keamanan', 'Policy'],
      metadata: {
        revisionNumber: 1,
        effectiveDate: '2024-01-01',
        nextReviewDate: '2025-01-01',
        documentNumber: 'IKU-HRD-001-2024',
        department: 'Human Resources'
      },
      publishedAt: new Date('2024-01-05T08:00:00Z'),
      extractedText: 'Panduan penggunaan email meliputi etika komunikasi, keamanan data, dan best practices...',
      extractionStatus: 'completed',
      extractedAt: new Date('2024-01-05T08:30:00Z'),
      documentTypeId: ikUmumType?.id || documentTypes[0].id,
      createdById: adminUser.id,
      approvedById: adminUser.id,
      approvedAt: new Date('2024-01-04T16:00:00Z'),
      createdAt: new Date('2024-01-02T10:00:00Z'),
      updatedAt: new Date('2024-01-04T15:00:00Z')
    }
  });

  // Document 5: Dokumen Internal - Struktur Organisasi
  const doc5 = await prisma.document.upsert({
    where: { id: 'seed-doc-5' },
    update: {},
    create: {
      id: 'seed-doc-5',
      title: 'Struktur Organisasi dan Tata Kelola Perusahaan 2024',
      description: 'Bagan struktur organisasi perusahaan, deskripsi jabatan, dan mekanisme tata kelola korporat.',
      fileName: 'struktur-organisasi-2024.pdf',
      filePath: '/uploads/documents/struktur-organisasi-2024.pdf',
      fileSize: BigInt(1824000),
      fileType: 'pdf',
      mimeType: 'application/pdf',
      version: '1.1',
      status: DocumentStatus.PUBLISHED,
      accessGroups: managementGroups,
      downloadCount: 89,
      viewCount: 445,
      tags: ['Organisasi', 'Struktur', 'Tata Kelola', 'Corporate'],
      metadata: {
        revisionNumber: 1,
        effectiveDate: '2024-01-01',
        nextReviewDate: '2024-07-01',
        documentNumber: 'INT-HRD-005-2024',
        department: 'Human Resources',
        confidentialityLevel: 'Internal'
      },
      publishedAt: new Date('2024-01-08T08:00:00Z'),
      extractedText: 'Struktur organisasi PT XYZ terdiri dari Dewan Direksi, Dewan Komisaris, dan unit-unit kerja...',
      extractionStatus: 'completed',
      extractedAt: new Date('2024-01-08T08:45:00Z'),
      documentTypeId: internalType?.id || documentTypes[0].id,
      createdById: adminUser.id,
      updatedById: ppdUser?.id || adminUser.id,
      approvedById: adminUser.id,
      approvedAt: new Date('2024-01-07T16:00:00Z'),
      createdAt: new Date('2024-01-05T11:00:00Z'),
      updatedAt: new Date('2024-01-07T14:00:00Z')
    }
  });

  // Document 6: Dokumen Eksternal - Sertifikat ISO
  const doc6 = await prisma.document.upsert({
    where: { id: 'seed-doc-6' },
    update: {},
    create: {
      id: 'seed-doc-6',
      title: 'Sertifikat ISO 9001:2015',
      description: 'Sertifikat ISO 9001:2015 yang diterbitkan oleh lembaga sertifikasi internasional untuk sistem manajemen mutu perusahaan.',
      fileName: 'sertifikat-iso-9001-2015.pdf',
      filePath: '/uploads/documents/sertifikat-iso-9001-2015.pdf',
      fileSize: BigInt(425000),
      fileType: 'pdf',
      mimeType: 'application/pdf',
      version: '1.0',
      status: DocumentStatus.PUBLISHED,
      accessGroups: managementGroups,
      downloadCount: 56,
      viewCount: 178,
      tags: ['ISO 9001', 'Sertifikat', 'Quality', 'External'],
      metadata: {
        issuer: 'TUV Rheinland',
        issueDate: '2023-12-15',
        expiryDate: '2026-12-14',
        certificateNumber: 'ISO-9001-2023-12345',
        scope: 'Quality Management System'
      },
      publishedAt: new Date('2023-12-20T08:00:00Z'),
      expiresAt: new Date('2026-12-14T23:59:59Z'),
      extractedText: 'Certificate of Registration ISO 9001:2015. This is to certify that the quality management system...',
      extractionStatus: 'completed',
      extractedAt: new Date('2023-12-20T08:30:00Z'),
      documentTypeId: eksternalType?.id || documentTypes[0].id,
      createdById: adminUser.id,
      approvedById: adminUser.id,
      approvedAt: new Date('2023-12-19T16:00:00Z'),
      createdAt: new Date('2023-12-18T10:00:00Z'),
      updatedAt: new Date('2023-12-19T15:00:00Z')
    }
  });

  // Document 7: Draft - Kebijakan Kerja Remote
  const doc7 = await prisma.document.upsert({
    where: { id: 'seed-doc-7' },
    update: {},
    create: {
      id: 'seed-doc-7',
      title: 'Kebijakan Kerja Remote dan Hybrid Working',
      description: 'Draft kebijakan pengaturan kerja remote dan hybrid working untuk meningkatkan fleksibilitas karyawan.',
      fileName: 'draft-kebijakan-remote-working.docx',
      filePath: '/uploads/documents/draft-kebijakan-remote-working.docx',
      fileSize: BigInt(324000),
      fileType: 'docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      version: '0.3',
      status: DocumentStatus.DRAFT,
      accessGroups: adminGroups,
      downloadCount: 12,
      viewCount: 34,
      tags: ['Remote', 'Hybrid', 'Policy', 'Work From Home', 'Draft'],
      metadata: {
        author: 'HR Department',
        draftVersion: 3,
        targetEffectiveDate: '2024-04-01',
        documentNumber: 'DRAFT-HRD-WFH-2024'
      },
      documentTypeId: internalType?.id || documentTypes[0].id,
      createdById: editorUser?.id || adminUser.id,
      updatedById: editorUser?.id || adminUser.id,
      createdAt: new Date('2024-02-20T09:00:00Z'),
      updatedAt: new Date('2024-02-28T16:30:00Z')
    }
  });

  // Document 8: Archived Document
  const doc8 = await prisma.document.upsert({
    where: { id: 'seed-doc-8' },
    update: {},
    create: {
      id: 'seed-doc-8',
      title: 'Prosedur Pengelolaan Dokumen Manual (Superseded)',
      description: 'Prosedur lama pengelolaan dokumen secara manual sebelum implementasi sistem digital. Dokumen ini telah digantikan.',
      fileName: 'prosedur-dokumen-manual-old.pdf',
      filePath: '/uploads/documents/prosedur-dokumen-manual-old.pdf',
      fileSize: BigInt(1245000),
      fileType: 'pdf',
      mimeType: 'application/pdf',
      version: '2.0',
      status: DocumentStatus.ARCHIVED,
      accessGroups: adminGroups,
      downloadCount: 8,
      viewCount: 45,
      tags: ['Archived', 'Manual', 'Old', 'Superseded'],
      metadata: {
        supersededBy: 'Sistem Digital Document Management',
        supersededDate: '2023-12-31',
        archiveReason: 'Replaced by digital system',
        documentNumber: 'SOP-ADM-001-2020'
      },
      publishedAt: new Date('2020-01-10T08:00:00Z'),
      extractedText: 'Prosedur pengelolaan dokumen meliputi penerimaan, distribusi, penyimpanan, dan pemusnahan dokumen fisik...',
      extractionStatus: 'completed',
      extractedAt: new Date('2023-12-01T10:00:00Z'),
      documentTypeId: prosedurType?.id || documentTypes[0].id,
      createdById: adminUser.id,
      approvedById: adminUser.id,
      approvedAt: new Date('2020-01-08T16:00:00Z'),
      createdAt: new Date('2020-01-05T10:00:00Z'),
      updatedAt: new Date('2023-12-31T23:59:59Z')
    }
  });

  // Document 9: Operations SOP
  const doc9 = await prisma.document.upsert({
    where: { id: 'seed-doc-9' },
    update: {},
    create: {
      id: 'seed-doc-9',
      title: 'Standard Operating Procedure: Daily Operations Checklist',
      description: 'Checklist operasional harian untuk memastikan semua sistem berjalan normal dan mendeteksi masalah sejak dini.',
      fileName: 'sop-daily-operations-checklist.pdf',
      filePath: '/uploads/documents/sop-daily-operations-checklist.pdf',
      fileSize: BigInt(678000),
      fileType: 'pdf',
      mimeType: 'application/pdf',
      version: '1.2',
      status: DocumentStatus.PUBLISHED,
      accessGroups: operationsGroups,
      downloadCount: 156,
      viewCount: 678,
      tags: ['Operations', 'Daily', 'Checklist', 'SOP', 'Monitoring'],
      metadata: {
        revisionNumber: 1,
        effectiveDate: '2024-02-01',
        nextReviewDate: '2024-08-01',
        documentNumber: 'SOP-OPS-008-2024',
        department: 'Operations'
      },
      publishedAt: new Date('2024-02-01T08:00:00Z'),
      extractedText: 'Daily operations checklist meliputi: 1. Pemeriksaan sistem server, 2. Monitoring network, 3. Backup verification...',
      extractionStatus: 'completed',
      extractedAt: new Date('2024-02-01T08:30:00Z'),
      documentTypeId: prosedurType?.id || documentTypes[0].id,
      createdById: adminUser.id,
      approvedById: ppdUser?.id || adminUser.id,
      approvedAt: new Date('2024-01-30T16:00:00Z'),
      createdAt: new Date('2024-01-25T10:00:00Z'),
      updatedAt: new Date('2024-01-30T15:00:00Z')
    }
  });

  // Document 10: Pending Approval
  const doc10 = await prisma.document.upsert({
    where: { id: 'seed-doc-10' },
    update: {},
    create: {
      id: 'seed-doc-10',
      title: 'Proposal Implementasi AI untuk Document Classification',
      description: 'Proposal penggunaan teknologi AI dan machine learning untuk mengklasifikasikan dan mengindeks dokumen secara otomatis.',
      fileName: 'proposal-ai-document-classification.pdf',
      filePath: '/uploads/documents/proposal-ai-document-classification.pdf',
      fileSize: BigInt(2145000),
      fileType: 'pdf',
      mimeType: 'application/pdf',
      version: '1.0',
      status: DocumentStatus.PENDING_APPROVAL,
      accessGroups: managementGroups,
      downloadCount: 28,
      viewCount: 92,
      tags: ['AI', 'Machine Learning', 'Proposal', 'Innovation', 'Technology'],
      metadata: {
        proposedBudget: 150000000,
        currency: 'IDR',
        timeline: '6 months',
        expectedROI: '3 years',
        documentNumber: 'PROP-TIK-002-2024',
        department: 'Teknologi Informasi',
        approvers: ['kadiv@dsm.com', 'gm@dsm.com']
      },
      extractedText: 'Executive Summary: Proposal ini mengusulkan implementasi sistem AI untuk klasifikasi dokumen otomatis...',
      extractionStatus: 'completed',
      extractedAt: new Date('2024-03-01T10:00:00Z'),
      documentTypeId: internalType?.id || documentTypes[0].id,
      createdById: tikUser?.id || adminUser.id,
      updatedById: tikUser?.id || adminUser.id,
      createdAt: new Date('2024-02-25T09:00:00Z'),
      updatedAt: new Date('2024-03-01T09:00:00Z')
    }
  });

  console.log(`✅ Created 10 sample documents`);

  // Create Document History for doc1 (Published document with version history)
  console.log('📜 Creating document history entries...');
  
  const historyEntries = await Promise.all([
    // Doc1 - Initial creation
    prisma.documentHistory.create({
      data: {
        documentId: doc1.id,
        action: 'CREATE',
        statusFrom: null,
        statusTo: DocumentStatus.DRAFT,
        changedById: adminUser.id,
        changeReason: 'Initial document creation',
        metadata: { initialVersion: '1.0' },
        createdAt: new Date('2024-01-10T10:00:00Z')
      }
    }),
    // Doc1 - Status change to review
    prisma.documentHistory.create({
      data: {
        documentId: doc1.id,
        action: 'STATUS_CHANGE',
        statusFrom: DocumentStatus.DRAFT,
        statusTo: DocumentStatus.IN_REVIEW,
        changedById: adminUser.id,
        changeReason: 'Submitted for review',
        createdAt: new Date('2024-01-11T14:00:00Z')
      }
    }),
    // Doc1 - Field update during review
    prisma.documentHistory.create({
      data: {
        documentId: doc1.id,
        action: 'UPDATE',
        fieldChanged: 'description',
        oldValue: 'Panduan sistem manajemen mutu',
        newValue: 'Panduan lengkap implementasi sistem manajemen mutu berdasarkan standar ISO 9001:2015',
        changedById: ppdUser?.id || adminUser.id,
        changeReason: 'Improved description clarity',
        createdAt: new Date('2024-01-12T09:30:00Z')
      }
    }),
    // Doc1 - Approval
    prisma.documentHistory.create({
      data: {
        documentId: doc1.id,
        action: 'APPROVE',
        statusFrom: DocumentStatus.IN_REVIEW,
        statusTo: DocumentStatus.APPROVED,
        changedById: adminUser.id,
        changeReason: 'Document meets all quality standards',
        metadata: { approverComments: 'Approved for publication' },
        createdAt: new Date('2024-01-14T16:00:00Z')
      }
    }),
    // Doc1 - Publication
    prisma.documentHistory.create({
      data: {
        documentId: doc1.id,
        action: 'PUBLISH',
        statusFrom: DocumentStatus.APPROVED,
        statusTo: DocumentStatus.PUBLISHED,
        changedById: adminUser.id,
        changeReason: 'Publishing approved document',
        createdAt: new Date('2024-01-15T08:00:00Z')
      }
    }),

    // Doc2 - History
    prisma.documentHistory.create({
      data: {
        documentId: doc2.id,
        action: 'CREATE',
        statusFrom: null,
        statusTo: DocumentStatus.DRAFT,
        changedById: tikUser?.id || adminUser.id,
        changeReason: 'Creating backup procedure documentation',
        createdAt: new Date('2024-01-20T09:00:00Z')
      }
    }),
    prisma.documentHistory.create({
      data: {
        documentId: doc2.id,
        action: 'STATUS_CHANGE',
        statusFrom: DocumentStatus.DRAFT,
        statusTo: DocumentStatus.IN_REVIEW,
        changedById: tikUser?.id || adminUser.id,
        changeReason: 'Ready for technical review',
        createdAt: new Date('2024-01-25T15:00:00Z')
      }
    }),
    prisma.documentHistory.create({
      data: {
        documentId: doc2.id,
        action: 'APPROVE',
        statusFrom: DocumentStatus.IN_REVIEW,
        statusTo: DocumentStatus.APPROVED,
        changedById: ppdUser?.id || adminUser.id,
        changeReason: 'Technical review passed',
        createdAt: new Date('2024-01-30T15:00:00Z')
      }
    }),
    prisma.documentHistory.create({
      data: {
        documentId: doc2.id,
        action: 'PUBLISH',
        statusFrom: DocumentStatus.APPROVED,
        statusTo: DocumentStatus.PUBLISHED,
        changedById: tikUser?.id || adminUser.id,
        changeReason: 'Publishing for IT team',
        createdAt: new Date('2024-02-01T08:00:00Z')
      }
    }),

    // Doc3 - Under review
    prisma.documentHistory.create({
      data: {
        documentId: doc3.id,
        action: 'CREATE',
        statusFrom: null,
        statusTo: DocumentStatus.DRAFT,
        changedById: editorUser?.id || adminUser.id,
        changeReason: 'Creating testing procedure',
        createdAt: new Date('2024-02-10T13:00:00Z')
      }
    }),
    prisma.documentHistory.create({
      data: {
        documentId: doc3.id,
        action: 'UPDATE',
        fieldChanged: 'tags',
        oldValue: '["Testing", "Software"]',
        newValue: '["Testing", "Software", "QA", "Deployment"]',
        changedById: tikUser?.id || adminUser.id,
        changeReason: 'Added relevant tags',
        createdAt: new Date('2024-02-12T10:00:00Z')
      }
    }),
    prisma.documentHistory.create({
      data: {
        documentId: doc3.id,
        action: 'STATUS_CHANGE',
        statusFrom: DocumentStatus.DRAFT,
        statusTo: DocumentStatus.IN_REVIEW,
        changedById: editorUser?.id || adminUser.id,
        changeReason: 'Submitted for approval',
        metadata: { reviewers: ['ppd@dsm.com', 'kadiv@dsm.com'] },
        createdAt: new Date('2024-02-15T09:30:00Z')
      }
    }),

    // Doc7 - Draft with updates
    prisma.documentHistory.create({
      data: {
        documentId: doc7.id,
        action: 'CREATE',
        statusFrom: null,
        statusTo: DocumentStatus.DRAFT,
        changedById: editorUser?.id || adminUser.id,
        changeReason: 'Initial draft of remote work policy',
        createdAt: new Date('2024-02-20T09:00:00Z')
      }
    }),
    prisma.documentHistory.create({
      data: {
        documentId: doc7.id,
        action: 'UPDATE',
        fieldChanged: 'version',
        oldValue: '0.1',
        newValue: '0.2',
        changedById: editorUser?.id || adminUser.id,
        changeReason: 'Updated policy based on stakeholder feedback',
        createdAt: new Date('2024-02-23T14:00:00Z')
      }
    }),
    prisma.documentHistory.create({
      data: {
        documentId: doc7.id,
        action: 'UPDATE',
        fieldChanged: 'version',
        oldValue: '0.2',
        newValue: '0.3',
        changedById: editorUser?.id || adminUser.id,
        changeReason: 'Added hybrid working guidelines',
        createdAt: new Date('2024-02-28T16:30:00Z')
      }
    }),

    // Doc8 - Archive history
    prisma.documentHistory.create({
      data: {
        documentId: doc8.id,
        action: 'STATUS_CHANGE',
        statusFrom: DocumentStatus.PUBLISHED,
        statusTo: DocumentStatus.ARCHIVED,
        changedById: adminUser.id,
        changeReason: 'Document superseded by digital system',
        metadata: { supersededBy: 'Digital Document Management System' },
        createdAt: new Date('2023-12-31T23:59:59Z')
      }
    }),

    // Doc10 - Pending approval
    prisma.documentHistory.create({
      data: {
        documentId: doc10.id,
        action: 'CREATE',
        statusFrom: null,
        statusTo: DocumentStatus.DRAFT,
        changedById: tikUser?.id || adminUser.id,
        changeReason: 'Creating AI implementation proposal',
        createdAt: new Date('2024-02-25T09:00:00Z')
      }
    }),
    prisma.documentHistory.create({
      data: {
        documentId: doc10.id,
        action: 'STATUS_CHANGE',
        statusFrom: DocumentStatus.DRAFT,
        statusTo: DocumentStatus.PENDING_APPROVAL,
        changedById: tikUser?.id || adminUser.id,
        changeReason: 'Submitted for management approval',
        metadata: { approvers: ['kadiv@dsm.com', 'gm@dsm.com'] },
        createdAt: new Date('2024-03-01T09:00:00Z')
      }
    })
  ]);

  console.log(`✅ Created ${historyEntries.length} document history entries`);

  // Create Document Versions for documents with updates
  console.log('📦 Creating document versions...');
  
  const versions = await Promise.all([
    // Doc1 versions
    prisma.documentVersion.create({
      data: {
        documentId: doc1.id,
        version: '1.0',
        changes: 'Initial release of quality management guide',
        fileName: 'panduan-smm-iso-9001-2015-v1.0.pdf',
        filePath: '/uploads/documents/versions/panduan-smm-iso-9001-2015-v1.0.pdf',
        fileSize: BigInt(2100000),
        previousVersion: null,
        createdById: adminUser.id,
        createdAt: new Date('2024-01-10T10:00:00Z')
      }
    }),
    prisma.documentVersion.create({
      data: {
        documentId: doc1.id,
        version: '2.0',
        changes: 'Updated compliance requirements and added process flowcharts',
        fileName: 'panduan-smm-iso-9001-2015-v2.0.pdf',
        filePath: '/uploads/documents/versions/panduan-smm-iso-9001-2015-v2.0.pdf',
        fileSize: BigInt(2350000),
        previousVersion: '1.0',
        createdById: ppdUser?.id || adminUser.id,
        createdAt: new Date('2024-01-12T14:00:00Z')
      }
    }),
    prisma.documentVersion.create({
      data: {
        documentId: doc1.id,
        version: '3.0',
        changes: 'Major revision: Added risk management procedures and updated audit procedures',
        fileName: 'panduan-smm-iso-9001-2015-v3.0.pdf',
        filePath: '/uploads/documents/versions/panduan-smm-iso-9001-2015-v3.0.pdf',
        fileSize: BigInt(2548000),
        previousVersion: '2.0',
        createdById: ppdUser?.id || adminUser.id,
        createdAt: new Date('2024-01-14T14:00:00Z')
      }
    }),

    // Doc2 versions
    prisma.documentVersion.create({
      data: {
        documentId: doc2.id,
        version: '1.0',
        changes: 'Initial backup procedure documentation',
        fileName: 'prosedur-backup-database-v1.0.pdf',
        filePath: '/uploads/documents/versions/prosedur-backup-database-v1.0.pdf',
        fileSize: BigInt(890000),
        previousVersion: null,
        createdById: tikUser?.id || adminUser.id,
        createdAt: new Date('2024-01-20T09:00:00Z')
      }
    }),
    prisma.documentVersion.create({
      data: {
        documentId: doc2.id,
        version: '2.0',
        changes: 'Added automated backup scripts and recovery testing procedures',
        fileName: 'prosedur-backup-database-v2.0.pdf',
        filePath: '/uploads/documents/versions/prosedur-backup-database-v2.0.pdf',
        fileSize: BigInt(985000),
        previousVersion: '1.0',
        createdById: tikUser?.id || adminUser.id,
        createdAt: new Date('2024-01-28T11:00:00Z')
      }
    }),
    prisma.documentVersion.create({
      data: {
        documentId: doc2.id,
        version: '2.1',
        changes: 'Minor update: Fixed typos and clarified retention policies',
        fileName: 'prosedur-backup-database-v2.1.pdf',
        filePath: '/uploads/documents/versions/prosedur-backup-database-v2.1.pdf',
        fileSize: BigInt(1024500),
        previousVersion: '2.0',
        createdById: tikUser?.id || adminUser.id,
        createdAt: new Date('2024-01-30T14:00:00Z')
      }
    })
  ]);

  console.log(`✅ Created ${versions.length} document versions`);

  // Create Document Activities
  console.log('📊 Creating document activities...');
  
  const activities = await Promise.all([
    // Doc1 activities - most viewed/downloaded
    prisma.documentActivity.create({
      data: {
        documentId: doc1.id,
        userId: ppdUser?.id || users[1].id,
        action: ActivityAction.VIEW,
        description: 'Viewed document',
        ipAddress: '10.0.1.45',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        createdAt: new Date('2024-01-16T09:15:00Z')
      }
    }),
    prisma.documentActivity.create({
      data: {
        documentId: doc1.id,
        userId: editorUser?.id || users[2].id,
        action: ActivityAction.DOWNLOAD,
        description: 'Downloaded document',
        ipAddress: '10.0.1.67',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        createdAt: new Date('2024-01-16T10:30:00Z')
      }
    }),
    prisma.documentActivity.create({
      data: {
        documentId: doc1.id,
        userId: tikUser?.id || users[3].id,
        action: ActivityAction.VIEW,
        description: 'Viewed document',
        ipAddress: '10.0.1.89',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
        createdAt: new Date('2024-01-17T14:20:00Z')
      }
    }),

    // Doc2 activities
    prisma.documentActivity.create({
      data: {
        documentId: doc2.id,
        userId: tikUser?.id || users[3].id,
        action: ActivityAction.VIEW,
        description: 'Viewed document',
        ipAddress: '10.0.1.89',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
        createdAt: new Date('2024-02-02T08:30:00Z')
      }
    }),
    prisma.documentActivity.create({
      data: {
        documentId: doc2.id,
        userId: tikUser?.id || users[3].id,
        action: ActivityAction.DOWNLOAD,
        description: 'Downloaded document',
        ipAddress: '10.0.1.89',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
        createdAt: new Date('2024-02-02T08:32:00Z')
      }
    }),

    // Doc3 activities - under review
    prisma.documentActivity.create({
      data: {
        documentId: doc3.id,
        userId: ppdUser?.id || users[1].id,
        action: ActivityAction.VIEW,
        description: 'Reviewing document',
        ipAddress: '10.0.1.45',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        metadata: { reviewStatus: 'in_progress' },
        createdAt: new Date('2024-02-16T10:00:00Z')
      }
    }),

    // Doc4 activities - most popular (general access)
    prisma.documentActivity.create({
      data: {
        documentId: doc4.id,
        userId: users[4]?.id || users[1].id,
        action: ActivityAction.VIEW,
        description: 'Viewed document',
        ipAddress: '10.0.2.12',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
        createdAt: new Date('2024-01-08T11:00:00Z')
      }
    }),
    prisma.documentActivity.create({
      data: {
        documentId: doc4.id,
        userId: users[5]?.id || users[2].id,
        action: ActivityAction.DOWNLOAD,
        description: 'Downloaded document',
        ipAddress: '10.0.2.34',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        createdAt: new Date('2024-01-09T09:30:00Z')
      }
    }),

    // Doc5 activities
    prisma.documentActivity.create({
      data: {
        documentId: doc5.id,
        userId: ppdUser?.id || users[1].id,
        action: ActivityAction.VIEW,
        description: 'Viewed organizational structure',
        ipAddress: '10.0.1.45',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        createdAt: new Date('2024-01-10T13:00:00Z')
      }
    }),

    // Doc9 activities - frequently accessed by operations
    prisma.documentActivity.create({
      data: {
        documentId: doc9.id,
        userId: users[3]?.id || adminUser.id,
        action: ActivityAction.VIEW,
        description: 'Daily operations check',
        ipAddress: '10.0.3.15',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        metadata: { checkType: 'daily_routine' },
        createdAt: new Date('2024-02-05T07:30:00Z')
      }
    }),
    prisma.documentActivity.create({
      data: {
        documentId: doc9.id,
        userId: users[3]?.id || adminUser.id,
        action: ActivityAction.DOWNLOAD,
        description: 'Downloaded checklist for shift handover',
        ipAddress: '10.0.3.15',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        createdAt: new Date('2024-02-05T15:45:00Z')
      }
    }),

    // Doc10 activities - proposal review
    prisma.documentActivity.create({
      data: {
        documentId: doc10.id,
        userId: ppdUser?.id || users[1].id,
        action: ActivityAction.VIEW,
        description: 'Reviewing AI proposal',
        ipAddress: '10.0.1.45',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        metadata: { reviewRole: 'technical_review' },
        createdAt: new Date('2024-03-02T09:00:00Z')
      }
    })
  ]);

  console.log(`✅ Created ${activities.length} document activities`);

  // Create some Comments
  console.log('💬 Creating comments...');
  
  const comments = await Promise.all([
    // Comments on doc1
    prisma.comment.create({
      data: {
        documentId: doc1.id,
        userId: ppdUser?.id || users[1].id,
        content: 'Dokumen ini sangat lengkap dan jelas. Bagus untuk referensi implementasi ISO.',
        createdAt: new Date('2024-01-16T11:00:00Z')
      }
    }),
    prisma.comment.create({
      data: {
        documentId: doc1.id,
        userId: editorUser?.id || users[2].id,
        content: 'Flowchart di halaman 15 sangat membantu memahami alur proses.',
        createdAt: new Date('2024-01-17T09:30:00Z')
      }
    }),

    // Comments on doc3 (under review)
    prisma.comment.create({
      data: {
        documentId: doc3.id,
        userId: ppdUser?.id || users[1].id,
        content: 'Mohon tambahkan checklist untuk regression testing di bagian 4.2',
        createdAt: new Date('2024-02-16T10:30:00Z')
      }
    }),
    prisma.comment.create({
      data: {
        documentId: doc3.id,
        userId: tikUser?.id || users[3].id,
        content: 'Akan saya tambahkan, terima kasih untuk review-nya.',
        createdAt: new Date('2024-02-16T14:00:00Z')
      }
    }),

    // Comment on doc7 (draft)
    prisma.comment.create({
      data: {
        documentId: doc7.id,
        userId: adminUser.id,
        content: 'Perlu ditambahkan guidelines untuk keamanan data saat kerja remote.',
        createdAt: new Date('2024-02-28T17:00:00Z')
      }
    }),

    // Comment on doc10 (proposal)
    prisma.comment.create({
      data: {
        documentId: doc10.id,
        userId: ppdUser?.id || users[1].id,
        content: 'Proposal ini menarik. Tolong tambahkan analisis cost-benefit yang lebih detail di section 5.',
        createdAt: new Date('2024-03-02T10:00:00Z')
      }
    })
  ]);

  console.log(`✅ Created ${comments.length} comments`);

  console.log('\n🎉 Document seeding completed!');
  console.log('\n📊 Document Seed Summary:');
  console.log('- Documents: 10');
  console.log('  * Published: 6');
  console.log('  * Under Review: 1');
  console.log('  * Draft: 1');
  console.log('  * Archived: 1');
  console.log('  * Pending Approval: 1');
  console.log(`- Document History: ${historyEntries.length} entries`);
  console.log(`- Document Versions: ${versions.length} versions`);
  console.log(`- Document Activities: ${activities.length} activities`);
  console.log(`- Comments: ${comments.length} comments`);
}

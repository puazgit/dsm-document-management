import { PrismaClient } from '@prisma/client';
import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import { join } from 'path';

const prisma = new PrismaClient();

interface CSVRow {
  title: string;
  description?: string;
  documentTypeId: string;
  accessGroups?: string;
  tags?: string;
  metadata_department?: string;
  metadata_documentNumber?: string;
  metadata_priority?: string;
  metadata_effectiveDate?: string;
  metadata_reviewDate?: string;
  expiresAt?: string;
  [key: string]: string | undefined; // Support metadata_* columns
}

interface ImportStats {
  total: number;
  success: number;
  failed: number;
  errors: Array<{ row: number; title: string; error: string }>;
}

async function importDocumentsFromCSV(csvFilePath: string) {
  console.log('📄 Starting CSV import...');
  console.log(`📁 Reading file: ${csvFilePath}\n`);

  // Get admin user for createdById
  const adminUser = await prisma.user.findFirst({
    where: { 
      OR: [
        { email: 'admin@example.com' },
        { role: { capabilities: { has: 'DOCUMENT_CREATE' } } }
      ]
    }
  });

  if (!adminUser) {
    throw new Error('❌ No user found with DOCUMENT_CREATE capability');
  }

  console.log(`👤 Using user: ${adminUser.firstName} ${adminUser.lastName} (${adminUser.email})\n`);

  const stats: ImportStats = {
    total: 0,
    success: 0,
    failed: 0,
    errors: []
  };

  const records: CSVRow[] = [];

  // Parse CSV
  const parser = createReadStream(csvFilePath)
    .pipe(parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      cast: false
    }));

  for await (const record of parser) {
    records.push(record as CSVRow);
  }

  stats.total = records.length;
  console.log(`📊 Found ${stats.total} documents to import\n`);

  // Process each record
  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rowNumber = i + 2; // +2 because CSV row 1 is header, and we start from 0

    try {
      // Validate required fields
      if (!row.title || row.title.trim() === '') {
        throw new Error('Title is required');
      }

      if (!row.documentTypeId || row.documentTypeId.trim() === '') {
        throw new Error('Document Type ID is required');
      }

      // Verify document type exists
      const docType = await prisma.documentType.findUnique({
        where: { id: row.documentTypeId }
      });

      if (!docType) {
        throw new Error(`Document type with ID "${row.documentTypeId}" not found`);
      }

      // Parse arrays from comma-separated strings
      const accessGroups = row.accessGroups 
        ? row.accessGroups.split(',').map(g => g.trim()).filter(g => g)
        : [];

      const tags = row.tags 
        ? row.tags.split(',').map(t => t.trim()).filter(t => t)
        : [];

      // Build metadata object from metadata_* columns
      const metadata: Record<string, any> = {
        fileStatus: 'pending-upload',
        importedAt: new Date().toISOString(),
        importSource: 'csv-batch-import'
      };

      // Extract all metadata_* columns
      for (const key in row) {
        if (key.startsWith('metadata_') && row[key]) {
          const metaKey = key.replace('metadata_', '');
          metadata[metaKey] = row[key];
        }
      }

      // Parse expiresAt if provided
      const expiresAt = row.expiresAt && row.expiresAt.trim() !== ''
        ? new Date(row.expiresAt)
        : null;

      // Create document
      const document = await prisma.document.create({
        data: {
          title: row.title.trim(),
          description: row.description?.trim() || null,
          documentTypeId: row.documentTypeId,
          accessGroups,
          tags,
          metadata,
          expiresAt,
          
          // Empty file fields (will be filled later)
          fileName: '',
          filePath: '',
          
          // User context
          createdById: adminUser.id,
          
          // Default values
          status: 'DRAFT',
          version: '1.0'
        },
        include: {
          documentType: {
            select: {
              name: true,
              slug: true
            }
          }
        }
      });

      // Log activity
      await prisma.documentActivity.create({
        data: {
          documentId: document.id,
          userId: adminUser.id,
          action: 'CREATE',
          description: `Document "${document.title}" created via CSV import (pending file upload)`
        }
      });

      stats.success++;
      console.log(`✅ [${stats.success}/${stats.total}] Created: "${row.title}" (ID: ${document.id})`);

    } catch (error) {
      stats.failed++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      stats.errors.push({
        row: rowNumber,
        title: row.title || 'Unknown',
        error: errorMessage
      });
      console.error(`❌ [Row ${rowNumber}] Failed: "${row.title}" - ${errorMessage}`);
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total rows:     ${stats.total}`);
  console.log(`✅ Successful:  ${stats.success}`);
  console.log(`❌ Failed:      ${stats.failed}`);
  console.log('='.repeat(60));

  if (stats.errors.length > 0) {
    console.log('\n⚠️  ERRORS DETAIL:');
    stats.errors.forEach(err => {
      console.log(`   Row ${err.row}: ${err.title}`);
      console.log(`   └─ ${err.error}\n`);
    });
  }

  // List documents waiting for files
  if (stats.success > 0) {
    console.log('\n📋 Documents created (waiting for file upload):');
    const pendingDocs = await prisma.document.findMany({
      where: {
        fileName: '',
        createdById: adminUser.id,
        metadata: {
          path: ['fileStatus'],
          equals: 'pending-upload'
        }
      },
      select: {
        id: true,
        title: true,
        documentType: {
          select: { name: true }
        },
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    pendingDocs.forEach((doc, idx) => {
      console.log(`   ${idx + 1}. ${doc.title} [${doc.documentType.name}]`);
      console.log(`      ID: ${doc.id}`);
    });

    if (pendingDocs.length === 20) {
      console.log(`   ... and more`);
    }
  }

  return stats;
}

// CLI execution
const csvFilePath = process.argv[2] || join(process.cwd(), 'documents-import.csv');

importDocumentsFromCSV(csvFilePath)
  .then((stats) => {
    console.log('\n✨ Import completed!');
    process.exit(stats.failed > 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });

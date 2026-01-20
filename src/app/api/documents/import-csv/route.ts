import { NextRequest, NextResponse } from 'next/server';
import { requireCapability } from '@/lib/rbac-helpers';
import { prisma } from '@/lib/prisma';
import { parse } from 'csv-parse/sync';

interface CSVRow {
  title: string;
  description?: string;
  documentTypeId: string;
  accessGroups?: string;
  tags?: string;
  expiresAt?: string;
  [key: string]: string | undefined;
}

interface ImportResult {
  success: boolean;
  row: number;
  id?: string;
  title: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireCapability(request, 'DOCUMENT_CREATE');
    if (!auth.authorized || !auth.userId) {
      return auth.error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, firstName: true, lastName: true, email: true }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Read and parse CSV
    const text = await file.text();
    let records: CSVRow[];

    try {
      records = parse(text, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        cast: false,
        bom: true // Handle UTF-8 BOM
      });
    } catch (error) {
      return NextResponse.json({ 
        error: 'Invalid CSV format',
        details: error instanceof Error ? error.message : String(error)
      }, { status: 400 });
    }

    if (records.length === 0) {
      return NextResponse.json({ error: 'CSV file is empty' }, { status: 400 });
    }

    const results: ImportResult[] = [];

    // Process each record
    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      if (!row) continue;
      
      const rowNumber = i + 2; // +2 for header row and 0-based index

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

        if (!docType || !docType.isActive) {
          throw new Error(`Document type with ID "${row.documentTypeId}" not found or inactive`);
        }

        // Parse arrays
        const accessGroups = row.accessGroups 
          ? row.accessGroups.split(',').map(g => g.trim()).filter(g => g)
          : [];

        const tags = row.tags 
          ? row.tags.split(',').map(t => t.trim()).filter(t => t)
          : [];

        // Build metadata from metadata_* columns
        const metadata: Record<string, any> = {
          fileStatus: 'pending-upload',
          importedAt: new Date().toISOString(),
          importSource: 'csv-web-import',
          importedBy: `${currentUser.firstName} ${currentUser.lastName}`
        };

        for (const key in row) {
          if (key.startsWith('metadata_') && row[key]) {
            const metaKey = key.replace('metadata_', '');
            metadata[metaKey] = row[key];
          }
        }

        // Parse expiresAt
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
            fileName: '',
            filePath: '',
            createdById: currentUser.id,
            status: 'DRAFT',
            version: '1.0'
          }
        });

        // Log activity
        await prisma.documentActivity.create({
          data: {
            documentId: document.id,
            userId: currentUser.id,
            action: 'CREATE',
            description: `Document "${document.title}" created via CSV import (pending file upload)`
          }
        });

        results.push({
          success: true,
          row: rowNumber,
          id: document.id,
          title: row.title
        });

      } catch (error) {
        results.push({
          success: false,
          row: rowNumber,
          title: row.title || 'Unknown',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      message: 'Import completed',
      total: results.length,
      success: successCount,
      failed: failedCount,
      results
    });

  } catch (error) {
    console.error('CSV import error:', error);
    return NextResponse.json(
      { error: 'Import failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

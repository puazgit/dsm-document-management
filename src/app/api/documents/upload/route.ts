import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '../../../../lib/next-auth';
import { prisma } from '../../../../lib/prisma';
import { requireCapability } from '@/lib/rbac-helpers';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { serializeForResponse } from '../../../../lib/bigint-utils';
import { processPdfExtraction } from '@/lib/jobs/pdf-extraction-job';
import { buildHierarchyPath, calculateHierarchyLevel } from '@/lib/document-hierarchy';

// Allowed file types and their MIME types
const ALLOWED_FILE_TYPES = {
  // Documents
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-powerpoint': '.ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'text/plain': '.txt',
  'text/csv': '.csv',
  
  // Images
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  
  // Archives
  'application/zip': '.zip',
  'application/x-rar-compressed': '.rar',
  'application/x-7z-compressed': '.7z',
  
  // Others
  'application/json': '.json',
  'application/xml': '.xml',
  'text/html': '.html',
};

// Maximum file size (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// POST /api/documents/upload - Upload file and create/update document
export async function POST(request: NextRequest) {
  try {
    console.log('[UPLOAD] Starting document upload request');
    const auth = await requireCapability(request, 'DOCUMENT_CREATE');
    console.log('[UPLOAD] Auth successful:', { userId: auth.userId });
    
    // Check if user exists in database and get fresh user data
    const currentUser = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { 
        id: true, 
        email: true, 
        firstName: true, 
        lastName: true,
        isActive: true 
      }
    });
    
    if (!currentUser) {
      console.error('User not found:', { authUserId: auth.userId });
      return NextResponse.json({ 
        error: 'User account not found. Please login again.',
      }, { status: 400 });
    }

    if (!currentUser.isActive) {
      return NextResponse.json({ 
        error: 'User account is inactive',
      }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentId = formData.get('documentId') as string | null;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string | null;
    const documentTypeId = formData.get('documentTypeId') as string;
    const accessGroups = formData.get('accessGroups') ? JSON.parse(formData.get('accessGroups') as string) : [];
    const tags = formData.get('tags') ? JSON.parse(formData.get('tags') as string) : [];
    const metadata = formData.get('metadata') ? JSON.parse(formData.get('metadata') as string) : {};
    const parentDocumentId = formData.get('parentDocumentId') as string | null;

    console.log('[UPLOAD] Parsed data:', { 
      title, 
      description, 
      documentTypeId, 
      accessGroups, 
      tags, 
      metadata,
      parentDocumentId,
      fileSize: file.size 
    });

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `File size too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` 
      }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES[file.type as keyof typeof ALLOWED_FILE_TYPES]) {
      return NextResponse.json({ 
        error: `File type ${file.type} is not allowed` 
      }, { status: 400 });
    }

    // Verify document type exists if creating new document
    if (!documentId) {
      const documentType = await prisma.documentType.findUnique({
        where: { id: documentTypeId },
      });

      if (!documentType || !documentType.isActive) {
        return NextResponse.json({ error: 'Invalid or inactive document type' }, { status: 400 });
      }
    }

    // Generate unique filename
    const fileExtension = ALLOWED_FILE_TYPES[file.type as keyof typeof ALLOWED_FILE_TYPES];
    const uniqueFilename = `${uuidv4()}${fileExtension}`;
    
    // Create upload directory structure
    const uploadDir = join(process.cwd(), 'uploads', 'documents');
    await mkdir(uploadDir, { recursive: true });
    
    // Save file to disk
    const filePath = join(uploadDir, uniqueFilename);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    let document: any;

    if (documentId) {
      // Update existing document with new file
      const existingDocument = await prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!existingDocument) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }

      // Check edit permissions (capability already checked)
      const canEdit = 
        existingDocument.createdById === currentUser.id;

      if (!canEdit) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      // Create new version before updating
      await prisma.documentVersion.create({
        data: {
          documentId: existingDocument.id,
          version: existingDocument.version,
          changes: `File updated from "${existingDocument.fileName}" to "${file.name}"`,
          fileName: existingDocument.fileName,
          filePath: existingDocument.filePath,
          fileSize: existingDocument.fileSize,
          previousVersion: existingDocument.version,
          createdById: currentUser.id,
        },
      });

      // Update document with new file
      document = await prisma.document.update({
        where: { id: documentId },
        data: {
          fileName: file.name,
          filePath: `/uploads/documents/${uniqueFilename}`,
          fileSize: BigInt(file.size),
          fileType: fileExtension,
          mimeType: file.type,
          version: incrementVersion(existingDocument.version),
          updatedById: currentUser.id,
        },
        include: {
          documentType: {
            select: {
              id: true,
              name: true,
              slug: true,
              icon: true,
              color: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          updatedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: {
            select: {
              comments: true,
              versions: true,
            },
          },
        },
      });

      // Log file update activity
      await prisma.documentActivity.create({
        data: {
          documentId: document.id,
          userId: currentUser.id,
          action: 'UPDATE',
          description: `File updated for document "${document.title}" (version ${document.version})`,
        },
      });

      // Trigger PDF extraction asynchronously if new file is PDF
      if (file.type === 'application/pdf') {
        processPdfExtraction(document.id).catch((error) => {
          console.error(`Failed to trigger PDF extraction for document ${document.id}:`, error)
        })
      }

    } else {
      // Prepare hierarchy data if parent is specified
      let hierarchyLevel = 0;
      let hierarchyPath = '';
      let parentDoc = null;

      if (parentDocumentId) {
        // Fetch parent document to validate and get hierarchy info
        parentDoc = await prisma.document.findUnique({
          where: { id: parentDocumentId },
          select: {
            id: true,
            hierarchyLevel: true,
            hierarchyPath: true,
          },
        });

        if (!parentDoc) {
          return NextResponse.json({ 
            error: 'Parent document not found' 
          }, { status: 400 });
        }

        hierarchyLevel = calculateHierarchyLevel(parentDoc.hierarchyLevel);
      }

      // Create new document
      document = await prisma.document.create({
        data: {
          title: title || file.name,
          description,
          fileName: file.name,
          filePath: `/uploads/documents/${uniqueFilename}`,
          fileSize: BigInt(file.size),
          fileType: fileExtension,
          mimeType: file.type,
          documentTypeId,
          createdById: currentUser.id,
          accessGroups,
          tags,
          metadata,
          parentDocumentId: parentDocumentId || null,
          hierarchyLevel,
          hierarchyPath: '', // Will be updated after document is created
        },
        include: {
          documentType: {
            select: {
              id: true,
              name: true,
              slug: true,
              icon: true,
              color: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: {
            select: {
              comments: true,
              versions: true,
            },
          },
        },
      });

      // Update hierarchy path now that we have the document ID
      if (parentDocumentId && parentDoc) {
        hierarchyPath = buildHierarchyPath(parentDoc.hierarchyPath, document.id);
        await prisma.document.update({
          where: { id: document.id },
          data: { hierarchyPath },
        });
        document.hierarchyPath = hierarchyPath;
      }

      // Log document creation activity
      await prisma.documentActivity.create({
        data: {
          documentId: document.id,
          userId: currentUser.id,
          action: 'CREATE',
          description: `Document "${document.title}" was created with file upload`,
        },
      });
    }

    // Trigger PDF extraction asynchronously (non-blocking)
    if (file.type === 'application/pdf') {
      processPdfExtraction(document.id).catch((error) => {
        console.error(`Failed to trigger PDF extraction for document ${document.id}:`, error)
      })
    }

    return NextResponse.json(serializeForResponse({
      message: documentId ? 'File updated successfully' : 'Document created successfully',
      document,
    }), { status: documentId ? 200 : 201 });

  } catch (error) {
    console.error('Error uploading file:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ 
      error: 'Internal server error',
      details: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
    }, { status: 500 });
  }
}

// Helper function to increment version number
function incrementVersion(currentVersion: string): string {
  const parts = currentVersion.split('.');
  const major = parseInt(parts[0] || '1');
  const minor = parseInt(parts[1] || '0');
  
  // Increment minor version
  return `${major}.${minor + 1}`;
}
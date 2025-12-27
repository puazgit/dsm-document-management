import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/next-auth';
import { prisma } from '../../../../lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { serializeForResponse } from '../../../../lib/bigint-utils';

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
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user exists in database and get fresh user data
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { 
        id: true, 
        email: true, 
        firstName: true, 
        lastName: true,
        isActive: true 
      }
    });
    
    if (!currentUser) {
      console.error('User not found:', { sessionUserId: session.user.id });
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
    const isPublic = formData.get('isPublic') === 'true';
    const accessGroups = formData.get('accessGroups') ? JSON.parse(formData.get('accessGroups') as string) : [];
    const tags = formData.get('tags') ? JSON.parse(formData.get('tags') as string) : [];
    const metadata = formData.get('metadata') ? JSON.parse(formData.get('metadata') as string) : {};

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

    let document;

    if (documentId) {
      // Update existing document with new file
      const existingDocument = await prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!existingDocument) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }

      // Check edit permissions
      const canEdit = 
        existingDocument.createdById === currentUser.id ||
        session.user.role === 'ADMIN' ||
        session.user.role === 'manager';

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

    } else {
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
          isPublic: false, // Always false on upload, will be true when status becomes PUBLISHED
          accessGroups,
          tags,
          metadata,
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

    return NextResponse.json(serializeForResponse({
      message: documentId ? 'File updated successfully' : 'Document created successfully',
      document,
    }), { status: documentId ? 200 : 201 });

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
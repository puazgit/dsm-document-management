import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/next-auth';
import { prisma } from '../../../../../lib/prisma';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { trackDocumentFileChanged, addDocumentHistory } from '../../../../../lib/document-history';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documentId = params.id;

    // Check if document exists and user has permission
    const existingDocument = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        createdBy: true,
        documentType: true
      }
    });

    if (!existingDocument) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check permissions
    const userPermissions = session.user.permissions || [];
    const userRole = session.user.role?.toLowerCase();
    const isOwner = existingDocument.createdById === session.user.id;
    
    const canUpdate = 
      userPermissions.includes('documents.update') ||
      userPermissions.includes('documents.update.own') ||
      isOwner ||
      ['admin', 'editor', 'org_administrator', 'org_ppd', 'org_dirut', 'org_gm', 'org_kadiv'].includes(userRole);

    if (!canUpdate) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF, DOC, DOCX, TXT, and MD files are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // Create unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFileName = `${timestamp}-${sanitizedFileName}`;
    
    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'uploads', 'documents');
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    const filePath = join(uploadDir, uniqueFileName);
    const relativePath = `uploads/documents/${uniqueFileName}`;

    // Save file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Store old file information for history
    const oldFileName = existingDocument.fileName;
    const oldFilePath = existingDocument.filePath;

    // Helper function to increment version properly
    const incrementVersion = (currentVersion: string): string => {
      const parts = currentVersion.split('.');
      const major = parseInt(parts[0] || '1');
      const minor = parseInt(parts[1] || '0');
      return `${major}.${minor + 1}`;
    };

    const oldVersion = existingDocument.version || '1.0';
    const newVersion = incrementVersion(oldVersion);

    // Create document version entry for old file (preserve history)
    if (oldFilePath && oldFileName) {
      await prisma.documentVersion.create({
        data: {
          documentId,
          version: oldVersion,
          fileName: oldFileName,
          filePath: oldFilePath,
          fileSize: existingDocument.fileSize || BigInt(0),
          changes: `Previous version before file update to ${file.name}`,
          createdById: session.user.id
        }
      });
    }

    // Update document in database
    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: {
        fileName: file.name,
        filePath: relativePath,
        fileSize: BigInt(file.size),
        fileType: fileExtension || null,
        mimeType: file.type,
        version: newVersion,
        updatedAt: new Date(),
        updatedById: session.user.id
      },
      include: {
        createdBy: true,
        updatedBy: true,
        documentType: true
      }
    });

    // Track file replacement in history with old file information
    await addDocumentHistory({
      documentId,
      action: 'file_replaced',
      fieldChanged: 'file',
      oldValue: JSON.stringify({ fileName: oldFileName, filePath: oldFilePath }),
      newValue: JSON.stringify({ fileName: file.name, filePath: relativePath }),
      changedById: session.user.id,
      changeReason: `File updated from ${oldFileName} to ${file.name}`,
      metadata: {
        oldFile: {
          fileName: oldFileName,
          filePath: oldFilePath,
          version: oldVersion
        },
        newFile: {
          fileName: file.name,
          filePath: relativePath,
          version: newVersion
        }
      }
    });

    return NextResponse.json({
      message: 'File uploaded successfully',
      document: {
        id: updatedDocument.id,
        title: updatedDocument.title,
        fileName: updatedDocument.fileName,
        filePath: updatedDocument.filePath,
        fileSize: updatedDocument.fileSize?.toString() || '0',
        fileType: updatedDocument.fileType,
        mimeType: updatedDocument.mimeType,
        updatedAt: updatedDocument.updatedAt
      }
    });

  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
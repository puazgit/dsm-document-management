import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../../lib/next-auth';
import { prisma } from '../../../../../../lib/prisma';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; version: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documentId = params.id;
    const versionId = params.version;

    // First check if this is the current version
    const currentDocument = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        createdBy: true
      }
    });

    if (!currentDocument) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // If requesting current version, serve the current file
    if (currentDocument.version === versionId || 
        parseFloat(currentDocument.version).toFixed(1) === parseFloat(versionId).toFixed(1)) {
      
      // Check if file exists
      const filePath = join(process.cwd(), currentDocument.filePath);
      if (!existsSync(filePath)) {
        return NextResponse.json({ error: 'Current file not found on disk' }, { status: 404 });
      }

      // Check permissions for current document (capability-based)
      const userCapabilities = session.user.capabilities || [];
      const userRole = session.user.role?.toLowerCase();
      const isOwner = currentDocument.createdById === session.user.id;
      
      const canRead = 
        userCapabilities.includes('DOCUMENT_VIEW') ||
        userCapabilities.includes('DOCUMENT_READ') ||
        userCapabilities.includes('PDF_VIEW') ||
        isOwner ||
        ['admin', 'editor', 'administrator', 'ppd', 'dirut', 'gm', 'kadiv', 'org_supervisor'].includes(userRole);

      if (!canRead) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }

      // Read and serve current file
      const fileBuffer = await readFile(filePath);
      
      const ext = currentDocument.fileName.split('.').pop()?.toLowerCase();
      let contentType = 'application/octet-stream';
      
      switch (ext) {
        case 'pdf':
          contentType = 'application/pdf';
          break;
        case 'doc':
          contentType = 'application/msword';
          break;
        case 'docx':
          contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          break;
        case 'txt':
          contentType = 'text/plain';
          break;
        case 'md':
          contentType = 'text/markdown';
          break;
      }

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `inline; filename="${currentDocument.fileName}"`,
          'Content-Length': fileBuffer.length.toString(),
        },
      });
    }

    // Get document version from history - try exact match first, then fuzzy match
    let documentVersion = await prisma.documentVersion.findFirst({
      where: {
        documentId,
        version: versionId
      },
      include: {
        document: {
          include: {
            createdBy: true
          }
        }
      }
    });

    // If not found with exact match, try to find similar version (handle floating point errors)
    if (!documentVersion) {
      const normalizedVersion = parseFloat(versionId).toFixed(1);
      const allVersions = await prisma.documentVersion.findMany({
        where: { documentId },
        include: {
          document: {
            include: {
              createdBy: true
            }
          }
        }
      });
      
      documentVersion = allVersions.find(v => {
        const vNormalized = parseFloat(v.version).toFixed(1);
        return vNormalized === normalizedVersion;
      }) || null;
    }

    if (!documentVersion) {
      return NextResponse.json({ error: 'Document version not found' }, { status: 404 });
    }

    // Check permissions (capability-based)
    const userCapabilities = session.user.capabilities || [];
    const userRole = session.user.role?.toLowerCase();
    const isOwner = documentVersion.document.createdById === session.user.id;
    
    const canRead = 
      userCapabilities.includes('DOCUMENT_VIEW') ||
      userCapabilities.includes('DOCUMENT_READ') ||
      userCapabilities.includes('PDF_VIEW') ||
      isOwner ||
      ['admin', 'editor', 'administrator', 'ppd', 'dirut', 'gm', 'kadiv', 'org_supervisor'].includes(userRole);

    if (!canRead) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if file exists
    const filePath = join(process.cwd(), documentVersion.filePath);
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
    }

    // Read file
    const fileBuffer = await readFile(filePath);
    
    // Determine content type
    const ext = documentVersion.fileName.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (ext) {
      case 'pdf':
        contentType = 'application/pdf';
        break;
      case 'doc':
        contentType = 'application/msword';
        break;
      case 'docx':
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
      case 'txt':
        contentType = 'text/plain';
        break;
      case 'md':
        contentType = 'text/markdown';
        break;
    }

    // Return file with proper headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${documentVersion.fileName}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Document version access error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
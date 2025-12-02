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

    // Get document version
    const documentVersion = await prisma.documentVersion.findFirst({
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

    if (!documentVersion) {
      return NextResponse.json({ error: 'Document version not found' }, { status: 404 });
    }

    // Check permissions
    const userPermissions = session.user.permissions || [];
    const userRole = session.user.role?.toLowerCase();
    const isOwner = documentVersion.document.createdById === session.user.id;
    
    const canRead = 
      userPermissions.includes('documents.read') ||
      userPermissions.includes('pdf.view') ||
      isOwner ||
      ['admin', 'administrator', 'editor', 'manager', 'org_administrator', 'ppd', 'org_dirut', 'org_gm', 'org_kadiv', 'org_supervisor'].includes(userRole);

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
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '../../../../../lib/next-auth';
import { prisma } from '../../../../../lib/prisma';
import { requireCapability } from '@/lib/rbac-helpers';
import { readFile } from 'fs/promises';
import { join } from 'path';

// GET /api/documents/[id]/download - Download document file
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireCapability(request, 'DOCUMENT_DOWNLOAD');

    const { id } = params;

    // Get document with access control check
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Permission check done via capability system (DOCUMENT_DOWNLOAD)

    // Check if file exists
    const filePath = join(process.cwd(), document.filePath.replace(/^\//, ''));
    
    try {
      const fileBuffer = await readFile(filePath);
      
      // Increment download count
      await prisma.document.update({
        where: { id },
        data: { downloadCount: { increment: 1 } },
      });

      // Log download activity only for published documents
      if (document.status === 'PUBLISHED') {
        // Check for duplicate download logs within the last 5 minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const recentDownload = await prisma.documentActivity.findFirst({
          where: {
            documentId: id,
            userId: auth.userId!,
            action: 'DOWNLOAD',
            createdAt: {
              gte: fiveMinutesAgo,
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        if (recentDownload) {
          console.log(`⏭️  [DOWNLOAD] Skipping duplicate download log - already downloaded recently at: ${recentDownload.createdAt.toISOString()}`);
        } else {
          await prisma.documentActivity.create({
            data: {
              documentId: id,
              userId: auth.userId!,
              action: 'DOWNLOAD',
              description: `Document "${document.title}" was downloaded`,
              metadata: {
                source: 'document_download',
                fileName: document.fileName,
                fileSize: document.fileSize ? document.fileSize.toString() : null,
                timestamp: new Date().toISOString(),
              } as any,
            },
          });
        }
      }

      // Set appropriate headers for file download
      const headers = new Headers();
      headers.set('Content-Type', document.mimeType || 'application/octet-stream');
      headers.set('Content-Disposition', `attachment; filename="${document.fileName}"`);
      headers.set('Content-Length', fileBuffer.length.toString());

      return new NextResponse(fileBuffer, {
        status: 200,
        headers,
      });

    } catch (fileError) {
      console.error('File not found:', fileError);
      return NextResponse.json({ error: 'File not found on server' }, { status: 404 });
    }

  } catch (error) {
    console.error('Error downloading document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
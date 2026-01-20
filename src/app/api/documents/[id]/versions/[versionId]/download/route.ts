import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/next-auth';
import { prisma } from '@/lib/prisma';
import { requireCapability } from '@/lib/rbac-helpers';
import fs from 'fs';
import path from 'path';

// GET /api/documents/[id]/versions/[versionId]/download - Download specific version
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  try {
    // Check authentication and download permission
    const auth = await requireCapability(request, 'DOCUMENT_VIEW');
    if (!auth.authorized || !auth.userId) {
      return auth.error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: documentId, versionId } = params;

    // Fetch the specific version
    const version = await prisma.documentVersion.findUnique({
      where: { 
        id: versionId,
        documentId: documentId, // Ensure version belongs to this document
      },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            createdById: true,
          },
        },
      },
    });

    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    // Check if file exists
    const filePath = version.filePath;
    const fullPath = path.join(process.cwd(), filePath);

    if (!fs.existsSync(fullPath)) {
      console.error('Version file not found:', fullPath);
      return NextResponse.json(
        { error: 'Version file not found on server' },
        { status: 404 }
      );
    }

    // Read file
    const fileBuffer = fs.readFileSync(fullPath);

    // Log download activity
    try {
      await prisma.documentActivity.create({
        data: {
          documentId: version.documentId,
          userId: auth.userId!,
          action: 'DOWNLOAD_VERSION',
          description: `Downloaded version ${version.version} of document`,
          metadata: {
            versionId: version.id,
            version: version.version,
            fileName: version.fileName,
            fileSize: version.fileSize?.toString(),
          },
        },
      });
    } catch (activityError) {
      console.error('Error logging version download activity:', activityError);
      // Continue with download even if activity logging fails
    }

    // Return file
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${version.fileName}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error downloading document version:', error);
    return NextResponse.json(
      { error: 'Failed to download version' },
      { status: 500 }
    );
  }
}

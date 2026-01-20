import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/next-auth';
import { prisma } from '@/lib/prisma';
import { requireCapability } from '@/lib/rbac-helpers';

// GET /api/documents/[id]/versions - Get document version history
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication and basic document view permission
    const auth = await requireCapability(request, 'DOCUMENT_VIEW');
    if (!auth.authorized || !auth.userId) {
      return auth.error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: documentId } = params;

    // Check if document exists and user has access
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        title: true,
        status: true,
        createdById: true,
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Fetch all versions for this document
    const versions = await prisma.documentVersion.findMany({
      where: { documentId },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Convert BigInt to string for JSON serialization
    const serializedVersions = versions.map(version => ({
      ...version,
      fileSize: version.fileSize ? version.fileSize.toString() : null,
    }));

    return NextResponse.json({
      success: true,
      versions: serializedVersions,
      count: versions.length,
    });
  } catch (error) {
    console.error('Error fetching document versions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document versions' },
      { status: 500 }
    );
  }
}

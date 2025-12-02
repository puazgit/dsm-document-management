import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/next-auth';
import { prisma } from '../../../../../lib/prisma';
import { serializeForResponse } from '../../../../../lib/bigint-utils';

// GET /api/documents/[id]/history - Get document history
export async function GET(
  request: NextRequest, 
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documentId = params.id;

    // Check if user has access to the document
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        createdById: true,
        isPublic: true,
        accessGroups: true,
        status: true,
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check access permissions
    const userRole = session.user.role || '';
    const isAdmin = ['administrator', 'admin', 'ADMIN'].includes(userRole);
    const isOwner = document.createdById === session.user.id;
    const hasRoleAccess = document.accessGroups.includes(session.user.role || '');
    const hasGroupAccess = document.accessGroups.includes(session.user.groupId || '');
    const isPublished = document.status === 'PUBLISHED';

    if (!isAdmin && !isOwner && !hasRoleAccess && !hasGroupAccess && !document.isPublic && !isPublished) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get document history
    const history = await prisma.documentHistory.findMany({
      where: {
        documentId,
      },
      include: {
        changedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(serializeForResponse({ history }));
  } catch (error) {
    console.error('Error fetching document history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
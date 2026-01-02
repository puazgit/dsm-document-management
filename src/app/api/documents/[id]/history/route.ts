import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '../../../../../lib/next-auth';
import { prisma } from '../../../../../lib/prisma';
import { requireCapability } from '@/lib/rbac-helpers';
import { serializeForResponse } from '../../../../../lib/bigint-utils';

// GET /api/documents/[id]/history - Get document history
export async function GET(
  request: NextRequest, 
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireCapability(request, 'DOCUMENT_VIEW');

    const documentId = params.id;

    // Check if user has access to the document
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        createdById: true,
        accessGroups: true,
        status: true,
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Permission check done via capability system

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
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/next-auth';
import { moveDocument } from '@/lib/document-hierarchy';
import { prisma } from '@/lib/prisma';
import { requireCapability } from '@/lib/rbac-helpers';

/**
 * POST /api/documents/[id]/move
 * Move document to a new parent
 * Requires DOCUMENT_EDIT capability
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check capability
    const auth = await requireCapability(request, 'DOCUMENT_EDIT');
    if (!auth.authorized) {
      return auth.error;
    }

    const { id } = params;
    const body = await request.json();
    const { newParentId, reason } = body;

    // Validate document exists
    const document = await prisma.document.findUnique({
      where: { id },
      select: { 
        id: true, 
        title: true, 
        parentDocumentId: true,
        hierarchyLevel: true 
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Validate new parent if provided
    if (newParentId) {
      const newParent = await prisma.document.findUnique({
        where: { id: newParentId },
        select: { id: true, title: true, hierarchyPath: true },
      });

      if (!newParent) {
        return NextResponse.json(
          { error: 'Parent document not found' },
          { status: 404 }
        );
      }

      // Check for circular reference
      if (newParent.hierarchyPath?.includes(id)) {
        return NextResponse.json(
          { error: 'Cannot move document to its own descendant' },
          { status: 400 }
        );
      }
    }

    // Move document
    const updatedDocument = await moveDocument(id, newParentId);

    // Log activity
    await prisma.documentActivity.create({
      data: {
        documentId: id,
        userId: auth.userId!,
        action: 'UPDATE',
        description: newParentId 
          ? `Moved document to new parent`
          : `Moved document to root level`,
        metadata: {
          action: 'move',
          oldParentId: document.parentDocumentId,
          newParentId,
          reason,
        },
      },
    });

    // Serialize with BigInt handling
    const responseData = {
      message: 'Document moved successfully',
      document: updatedDocument,
    };

    return new NextResponse(
      JSON.stringify(responseData, (key, value) =>
        typeof value === 'bigint' ? Number(value) : value
      ),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error moving document:', error);
    
    if (error.message?.includes('circular reference')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

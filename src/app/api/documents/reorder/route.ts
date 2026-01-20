import { NextRequest, NextResponse } from 'next/server';
import { reorderDocuments } from '@/lib/document-hierarchy';
import { requireCapability } from '@/lib/rbac-helpers';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/documents/reorder
 * Reorder documents within same parent
 * Requires DOCUMENT_EDIT capability
 */
export async function POST(request: NextRequest) {
  try {
    // Check capability
    const auth = await requireCapability(request, 'DOCUMENT_EDIT');
    if (!auth.authorized) {
      return auth.error;
    }

    const body = await request.json();
    const { parentId, documentOrders } = body;

    // Validate input
    if (!Array.isArray(documentOrders) || documentOrders.length === 0) {
      return NextResponse.json(
        { error: 'documentOrders must be a non-empty array' },
        { status: 400 }
      );
    }

    // Validate each item has id and sortOrder
    for (const item of documentOrders) {
      if (!item.id || typeof item.sortOrder !== 'number') {
        return NextResponse.json(
          { error: 'Each item must have id and sortOrder' },
          { status: 400 }
        );
      }
    }

    // Reorder documents
    await reorderDocuments(parentId, documentOrders);

    // Log activity
    await prisma.documentActivity.create({
      data: {
        documentId: documentOrders[0].id, // Log to first document
        userId: auth.userId!,
        action: 'UPDATE',
        description: 'Reordered documents',
        metadata: {
          action: 'reorder',
          parentId,
          count: documentOrders.length,
        },
      },
    });

    return NextResponse.json({
      message: 'Documents reordered successfully',
      count: documentOrders.length,
    });
  } catch (error) {
    console.error('Error reordering documents:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

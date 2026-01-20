import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/next-auth';
import { createDocumentRelation } from '@/lib/document-hierarchy';
import { prisma } from '@/lib/prisma';
import { requireCapability } from '@/lib/rbac-helpers';

/**
 * POST /api/documents/relations
 * Create a document relationship
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
    const { parentId, childId, relationType, metadata } = body;

    // Validate required fields
    if (!parentId || !childId || !relationType) {
      return NextResponse.json(
        { error: 'parentId, childId, and relationType are required' },
        { status: 400 }
      );
    }

    // Validate relation type
    const validTypes = ['PARENT_CHILD', 'REFERENCE', 'SUPERSEDES', 'RELATED', 'ATTACHMENT'];
    if (!validTypes.includes(relationType)) {
      return NextResponse.json(
        { error: `Invalid relationType. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate both documents exist
    const [parent, child] = await Promise.all([
      prisma.document.findUnique({ where: { id: parentId } }),
      prisma.document.findUnique({ where: { id: childId } }),
    ]);

    if (!parent) {
      return NextResponse.json(
        { error: 'Parent document not found' },
        { status: 404 }
      );
    }

    if (!child) {
      return NextResponse.json(
        { error: 'Child document not found' },
        { status: 404 }
      );
    }

    // Create relation
    const relation = await createDocumentRelation(
      parentId,
      childId,
      relationType,
      metadata
    );

    // Log activity for both documents
    await Promise.all([
      prisma.documentActivity.create({
        data: {
          documentId: parentId,
          userId: auth.userId!,
          action: 'UPDATE',
          description: `Created ${relationType} relationship with "${child.title}"`,
          metadata: { 
            action: 'create_relation',
            relationType,
            targetDocId: childId 
          },
        },
      }),
      prisma.documentActivity.create({
        data: {
          documentId: childId,
          userId: auth.userId!,
          action: 'UPDATE',
          description: `${relationType} relationship created by "${parent.title}"`,
          metadata: { 
            action: 'create_relation',
            relationType,
            sourceDocId: parentId 
          },
        },
      }),
    ]);

    return NextResponse.json({
      message: 'Relation created successfully',
      relation,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating document relation:', error);

    if (error.message?.includes('already exists')) {
      return NextResponse.json(
        { error: 'Relation already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/documents/relations
 * Delete a document relationship
 * Requires DOCUMENT_EDIT capability
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check capability
    const auth = await requireCapability(request, 'DOCUMENT_EDIT');
    if (!auth.authorized) {
      return auth.error;
    }

    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId');
    const childId = searchParams.get('childId');

    if (!parentId || !childId) {
      return NextResponse.json(
        { error: 'parentId and childId are required' },
        { status: 400 }
      );
    }

    // Delete relation
    await prisma.documentRelation.delete({
      where: {
        parentId_childId: {
          parentId,
          childId,
        },
      },
    });

    // Log activity
    await prisma.documentActivity.create({
      data: {
        documentId: parentId,
        userId: auth.userId!,
        action: 'UPDATE',
        description: 'Removed document relationship',
        metadata: { 
          action: 'delete_relation',
          targetDocId: childId 
        },
      },
    });

    return NextResponse.json({
      message: 'Relation deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting document relation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

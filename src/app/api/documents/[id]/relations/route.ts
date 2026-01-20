import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/next-auth';
import { getRelatedDocuments } from '@/lib/document-hierarchy';

/**
 * GET /api/documents/[id]/relations
 * Get all related documents for a document
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const relations = await getRelatedDocuments(id);

    return NextResponse.json({
      documentId: id,
      parents: relations.parents,
      children: relations.children,
      totalCount: relations.parents.length + relations.children.length,
    });
  } catch (error) {
    console.error('Error fetching document relations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

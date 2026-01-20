import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/next-auth';
import { getDocumentSiblings } from '@/lib/document-hierarchy';

/**
 * GET /api/documents/[id]/siblings
 * Get all sibling documents (documents with same parent)
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

    const siblings = await getDocumentSiblings(id);

    return NextResponse.json({
      documentId: id,
      siblings,
      count: siblings.length,
    });
  } catch (error) {
    console.error('Error fetching document siblings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

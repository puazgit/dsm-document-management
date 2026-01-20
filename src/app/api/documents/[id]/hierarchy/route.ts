import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/next-auth';
import { getDocumentWithChildren, getDocumentWithParents } from '@/lib/document-hierarchy';

/**
 * GET /api/documents/[id]/hierarchy
 * Get document with full hierarchy tree and breadcrumb
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
    const { searchParams } = new URL(request.url);
    const maxDepth = parseInt(searchParams.get('maxDepth') || '3');
    const withParents = searchParams.get('withParents') === 'true';

    // Get document with children
    const documentTree = await getDocumentWithChildren(id, maxDepth);

    if (!documentTree) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    let breadcrumb = null;
    if (withParents) {
      const result = await getDocumentWithParents(id);
      breadcrumb = result?.breadcrumb || null;
    }

    // Serialize with BigInt handling
    const responseData = {
      document: documentTree,
      breadcrumb,
      metadata: {
        maxDepth,
        childCount: documentTree.childDocuments?.length || 0,
      },
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
  } catch (error) {
    console.error('Error fetching document hierarchy:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

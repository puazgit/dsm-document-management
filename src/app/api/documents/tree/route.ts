import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/next-auth';
import { getRootDocuments } from '@/lib/document-hierarchy';

/**
 * GET /api/documents/tree
 * Get all root documents (documents without parent)
 * Optionally include children for tree view
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const documentTypeId = searchParams.get('documentTypeId') || undefined;
    const status = searchParams.get('status') || undefined;
    const includeChildren = searchParams.get('includeChildren') === 'true';

    const rootDocuments = await getRootDocuments({
      documentTypeId,
      status,
      includeChildren,
    });

    // Convert BigInt to Number for JSON serialization
    const serializedDocuments = JSON.parse(
      JSON.stringify(rootDocuments, (key, value) =>
        typeof value === 'bigint' ? Number(value) : value
      )
    );

    return NextResponse.json({
      documents: serializedDocuments,
      count: serializedDocuments.length,
      filters: {
        documentTypeId,
        status,
        includeChildren,
      },
    });
  } catch (error) {
    console.error('Error fetching document tree:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

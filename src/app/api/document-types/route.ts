import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/next-auth';
import { prisma } from '../../../lib/prisma';
import { serializeForResponse } from '../../../lib/bigint-utils';

// GET /api/document-types - Get all active document types
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documentTypes = await prisma.documentType.findMany({
      where: { isActive: true },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
      include: {
        _count: {
          select: {
            documents: true,
          },
        },
      },
    });

    return NextResponse.json(serializeForResponse(documentTypes));
  } catch (error) {
    console.error('Error fetching document types:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
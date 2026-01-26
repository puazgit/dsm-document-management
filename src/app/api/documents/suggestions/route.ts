import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/next-auth'
import { prisma } from '@/lib/prisma'
import { requireCapability } from '@/lib/rbac-helpers'
import { UnifiedAccessControl } from '@/lib/unified-access-control'

/**
 * GET /api/documents/suggestions - Get autocomplete suggestions
 * Uses the PostgreSQL get_search_suggestions function created in migration
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireCapability(request, 'DOCUMENT_VIEW')
    if (!auth.authorized) {
      return auth.error;
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '10')

    if (q.length < 2) {
      return NextResponse.json({
        suggestions: [],
        message: 'Query too short (minimum 2 characters)',
      })
    }

    // Get suggestions using the PostgreSQL function
    // Try-catch in case the function doesn't exist yet
    let suggestions: Array<{ suggestion: string; rank: number }> = []
    
    try {
      suggestions = await prisma.$queryRaw<
        Array<{ suggestion: string; rank: number }>
      >`
        SELECT * FROM get_search_suggestions(${q.toLowerCase()}::text, ${limit}::int)
      `
    } catch (error) {
      // If function doesn't exist, return empty suggestions
      console.log('get_search_suggestions function not available:', error)
      suggestions = []
    }

    // Also get recent searches from documents that match
    const whereClause: any = {
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { tags: { has: q } },
      ],
    }

    // Add access control for non-admin users
    // Check if user has admin access via capability (already checked DOCUMENT_VIEW above)
    const hasAdminAccess = await UnifiedAccessControl.hasCapability(auth.userId!, 'ADMIN_ACCESS');
    if (!hasAdminAccess) {
      whereClause.AND = [
        {
          OR: [
            { createdById: auth.userId },
            { status: 'PUBLISHED' },
            { accessGroups: { isEmpty: true } },
          ],
        },
      ]
    }

    const recentDocuments = await prisma.document.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        documentType: {
          select: {
            name: true,
            icon: true,
            color: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 5,
    })

    return NextResponse.json({
      suggestions: suggestions.map((s) => ({
        text: s.suggestion || '',
        frequency: typeof s.rank === 'number' ? s.rank : 0,
      })),
      recentDocuments: recentDocuments.map((doc) => ({
        id: doc.id,
        title: doc.title,
        documentType: doc.documentType,
      })),
    })
  } catch (error) {
    console.error('Error getting search suggestions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

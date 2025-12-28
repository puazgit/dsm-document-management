import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/next-auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/documents/suggestions - Get autocomplete suggestions
 * Uses the PostgreSQL get_search_suggestions function created in migration
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    const suggestions = await prisma.$queryRaw<
      Array<{ suggestion: string; frequency: bigint }>
    >`
      SELECT * FROM get_search_suggestions(${q.toLowerCase()}, ${limit})
    `

    // Also get recent searches from documents that match
    const recentDocuments = await prisma.document.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { tags: { has: q } },
        ],
        // Access control
        ...(session.user.role !== 'ADMIN'
          ? {
              OR: [
                { createdById: session.user.id },
                { isPublic: true },
                { status: 'PUBLISHED' },
              ],
            }
          : {}),
      },
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
        text: s.suggestion,
        frequency: Number(s.frequency),
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

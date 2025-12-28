import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/next-auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/documents/search/analytics - Track search queries for analytics
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { query, resultsCount, filters, clickedDocumentId } = body

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    // Log search to system logs for analytics
    await prisma.systemLog.create({
      data: {
        userId: session.user.id,
        action: 'VIEW',
        entity: 'SEARCH',
        entityId: query,
        description: `Search query: "${query}" (${resultsCount} results)`,
        metadata: {
          query,
          resultsCount,
          filters,
          clickedDocumentId,
          timestamp: new Date().toISOString(),
        },
      },
    })

    // If user clicked on a document, log it
    if (clickedDocumentId) {
      await prisma.documentActivity.create({
        data: {
          documentId: clickedDocumentId,
          userId: session.user.id,
          action: 'VIEW',
          description: `Viewed document from search: "${query}"`,
          metadata: {
            searchQuery: query,
            source: 'search',
          },
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error tracking search analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/documents/search/analytics - Get search analytics (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')
    const limit = parseInt(searchParams.get('limit') || '20')

    const since = new Date()
    since.setDate(since.getDate() - days)

    // Get top search queries
    const topQueries = await prisma.$queryRaw<
      Array<{ query: string; count: bigint }>
    >`
      SELECT 
        (metadata->>'query')::text as query,
        COUNT(*)::int as count
      FROM system_logs
      WHERE entity = 'SEARCH'
        AND created_at >= ${since}
        AND metadata->>'query' IS NOT NULL
      GROUP BY metadata->>'query'
      ORDER BY count DESC
      LIMIT ${limit}
    `

    // Get searches with no results
    const noResultQueries = await prisma.$queryRaw<
      Array<{ query: string; count: bigint }>
    >`
      SELECT 
        (metadata->>'query')::text as query,
        COUNT(*)::int as count
      FROM system_logs
      WHERE entity = 'SEARCH'
        AND created_at >= ${since}
        AND (metadata->>'resultsCount')::int = 0
      GROUP BY metadata->>'query'
      ORDER BY count DESC
      LIMIT ${limit}
    `

    // Get total searches
    const totalSearches = await prisma.systemLog.count({
      where: {
        entity: 'SEARCH',
        createdAt: { gte: since },
      },
    })

    // Get average results per search
    const avgResults = await prisma.$queryRaw<Array<{ avg: number }>>`
      SELECT AVG((metadata->>'resultsCount')::int)::float as avg
      FROM system_logs
      WHERE entity = 'SEARCH'
        AND created_at >= ${since}
        AND metadata->>'resultsCount' IS NOT NULL
    `

    return NextResponse.json({
      topQueries: topQueries.map((q) => ({
        query: q.query,
        count: Number(q.count),
      })),
      noResultQueries: noResultQueries.map((q) => ({
        query: q.query,
        count: Number(q.count),
      })),
      stats: {
        totalSearches,
        averageResults: avgResults[0]?.avg || 0,
        period: `Last ${days} days`,
      },
    })
  } catch (error) {
    console.error('Error getting search analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

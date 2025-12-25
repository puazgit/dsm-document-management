import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/next-auth'
import { prisma } from '@/lib/prisma'
import { serializeForResponse } from '@/lib/bigint-utils'

// GET /api/users/performance - Get top performing users
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    // Get users with their document statistics
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        _count: {
          select: {
            createdDocuments: true,
          },
        },
        createdDocuments: {
          select: {
            viewCount: true,
            downloadCount: true,
          },
        },
      },
      take: 50, // Get more for calculation
    })

    // Calculate performance metrics
    const userPerformance = users.map(user => {
      const totalViews = user.createdDocuments.reduce((sum, doc) => sum + (doc.viewCount || 0), 0)
      const totalDownloads = user.createdDocuments.reduce((sum, doc) => sum + (doc.downloadCount || 0), 0)
      const documentsCreated = user._count.createdDocuments

      // Calculate score: 10 points per document, 2 per view, 5 per download
      const score = (documentsCreated * 10) + (totalViews * 2) + (totalDownloads * 5)

      return {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        documentsCreated,
        totalViews,
        totalDownloads,
        score,
      }
    })

    // Sort by score and get top users
    const topUsers = userPerformance
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    return NextResponse.json(serializeForResponse({ topUsers }))
  } catch (error) {
    console.error('Error fetching user performance:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

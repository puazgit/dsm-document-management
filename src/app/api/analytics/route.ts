import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../lib/next-auth'
import { prisma } from '../../../lib/prisma'
import { serializeForResponse } from '../../../lib/bigint-utils'
import { requireRoles } from '@/lib/auth-utils'

export const GET = requireRoles(['admin', 'org_manager', 'org_ppd'])(async function(request: NextRequest) {
  try {

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '7d'

    // Calculate date range based on period
    const now = new Date()
    let startDate: Date

    switch (period) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    }

    // Fetch overview statistics
    const [
      totalUsers,
      activeUsers,
      totalDocuments,
      totalDownloads,
      totalViews,
      recentUsers
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          lastLoginAt: {
            gte: startDate
          }
        }
      }),
      prisma.document.count({
        where: {
          status: {
            not: 'ARCHIVED'
          }
        }
      }),
      prisma.document.aggregate({
        _sum: {
          downloadCount: true
        },
        where: {
          status: {
            not: 'ARCHIVED'
          }
        }
      }),
      prisma.document.aggregate({
        _sum: {
          viewCount: true
        },
        where: {
          status: {
            not: 'ARCHIVED'
          }
        }
      }),
      prisma.user.findMany({
        where: {
          createdAt: {
            gte: startDate
          }
        },
        select: {
          id: true,
          createdAt: true,
          lastLoginAt: true
        }
      })
    ])

    // Fetch document statistics by type
    const documentStats = await prisma.documentType.findMany({
      select: {
        name: true,
        _count: {
          select: {
            documents: true
          }
        },
        documents: {
          select: {
            downloadCount: true,
            viewCount: true
          }
        }
      }
    })

    // Fetch top documents
    const topDocuments = await prisma.document.findMany({
      take: 10,
      orderBy: {
        downloadCount: 'desc'
      },
      where: {
        status: {
          not: 'ARCHIVED'
        }
      },
      select: {
        id: true,
        title: true,
        downloadCount: true,
        viewCount: true,
        createdAt: true,
        documentType: {
          select: {
            name: true
          }
        }
      }
    })

    // Fetch user statistics
    const userStats = await prisma.user.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        lastLoginAt: true,
        createdAt: true,
        group: {
          select: {
            name: true
          }
        },
        _count: {
          select: {
            createdDocuments: true
          }
        }
      }
    })

    // Process document stats
    const processedDocumentStats = documentStats.map((type: any) => ({
      type: type.name,
      count: type._count.documents,
      downloads: type.documents.reduce((sum: number, doc: any) => sum + (doc.downloadCount || 0), 0),
      views: type.documents.reduce((sum: number, doc: any) => sum + (doc.viewCount || 0), 0)
    }))

    // Generate mock user activity data (in real implementation, this would come from audit logs)
    const userActivity = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      userActivity.push({
        date: date.toISOString().split('T')[0],
        activeUsers: Math.floor(Math.random() * 50) + 30,
        newUsers: Math.floor(Math.random() * 10),
        loginCount: Math.floor(Math.random() * 100) + 50
      })
    }

    const analytics = {
      overview: {
        totalUsers,
        activeUsers,
        totalDocuments,
        totalDownloads: totalDownloads._sum.downloadCount || 0,
        totalViews: totalViews._sum.viewCount || 0,
        storageUsed: 2.4 // This would be calculated from actual file sizes
      },
      userActivity,
      documentStats: processedDocumentStats,
      topDocuments: topDocuments.map((doc: any) => ({
        id: doc.id,
        title: doc.title,
        type: doc.documentType?.name || 'Unknown',
        downloads: doc.downloadCount || 0,
        views: doc.viewCount || 0,
        createdAt: doc.createdAt.toISOString()
      })),
      userStats: userStats.map((user: any) => ({
        id: user.id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown',
        email: user.email,
        role: user.group?.name || 'Unknown',
        documentsCreated: user._count.createdDocuments,
        lastLogin: user.lastLoginAt?.toISOString() || 'Never'
      })),
      systemMetrics: {
        cpuUsage: Math.floor(Math.random() * 50) + 25,
        memoryUsage: Math.floor(Math.random() * 40) + 40,
        diskUsage: Math.floor(Math.random() * 30) + 20,
        activeConnections: Math.floor(Math.random() * 50) + 50
      }
    }

    return NextResponse.json(serializeForResponse(analytics))
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
})
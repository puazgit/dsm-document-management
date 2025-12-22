import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/next-auth';
import { prisma } from '../../../../lib/prisma';
import { serializeForResponse } from '../../../../lib/bigint-utils';

// GET /api/documents/stats - Get document statistics for dashboard
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's accessible documents where clause
    const userAccessWhere: any = session.user.role === 'ADMIN' ? {} : {
      OR: [
        { createdById: session.user.id }, // Documents they created
        { isPublic: true }, // Public documents
        { accessGroups: { has: session.user.groupId || '' } }, // Documents accessible to their group
        { status: 'PUBLISHED' }, // All published documents are visible to everyone
      ],
    };

    // Get basic counts
    const [
      totalDocuments,
      draftDocuments,
      pendingDocuments,
      approvedDocuments,
      archivedDocuments,
      myDocuments,
      recentDocuments,
      topDownloadedDocuments,
      documentsByType,
      monthlyStats,
    ] = await Promise.all([
      // Total documents count
      prisma.document.count({
        where: {
          ...userAccessWhere,
          status: { not: 'ARCHIVED' as const },
        },
      }),

      // Draft documents count
      prisma.document.count({
        where: {
          ...userAccessWhere,
          status: 'DRAFT' as const,
        },
      }),

      // Pending documents count (pending review or approval)
      prisma.document.count({
        where: {
          ...userAccessWhere,
          status: { in: ['PENDING_REVIEW', 'PENDING_APPROVAL'] },
        },
      }),

      // Approved documents count
      prisma.document.count({
        where: {
          ...userAccessWhere,
          status: { in: ['APPROVED' as const, 'PUBLISHED' as const] },
        },
      }),

      // Archived documents count
      prisma.document.count({
        where: {
          ...userAccessWhere,
          status: 'ARCHIVED' as const,
        },
      }),

      // Documents created by current user
      prisma.document.count({
        where: {
          createdById: session.user.id,
          status: { not: 'ARCHIVED' as const },
        },
      }),

      // Recent documents (last 10)
      prisma.document.findMany({
        where: {
          ...userAccessWhere,
          status: { not: 'ARCHIVED' as const },
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          documentType: {
            select: {
              name: true,
              icon: true,
              color: true,
            },
          },
          createdBy: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),

      // Top downloaded documents
      prisma.document.findMany({
        where: {
          ...userAccessWhere,
          status: { not: 'ARCHIVED' },
          downloadCount: { gt: 0 },
        },
        take: 5,
        orderBy: { downloadCount: 'desc' },
        include: {
          documentType: {
            select: {
              name: true,
              icon: true,
              color: true,
            },
          },
          createdBy: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),

      // Documents grouped by type
      prisma.document.groupBy({
        by: ['documentTypeId'],
        where: {
          ...userAccessWhere,
          status: { not: 'ARCHIVED' },
        },
        _count: {
          id: true,
        },
      }),

      // Monthly document creation stats (last 12 months)
      session.user.role === 'ADMIN' 
        ? prisma.$queryRaw`
            SELECT 
              DATE_TRUNC('month', created_at) as month,
              COUNT(*)::int as count
            FROM documents 
            WHERE created_at >= NOW() - INTERVAL '12 months'
              AND status != 'ARCHIVED'
            GROUP BY DATE_TRUNC('month', created_at)
            ORDER BY month DESC
          `
        : prisma.$queryRaw`
            SELECT 
              DATE_TRUNC('month', created_at) as month,
              COUNT(*)::int as count
            FROM documents 
            WHERE created_at >= NOW() - INTERVAL '12 months'
              AND status != 'ARCHIVED'
              AND (
                created_by_id = ${session.user.id} OR 
                is_public = true OR 
                ${session.user.groupId || ''} = ANY(access_groups)
              )
            GROUP BY DATE_TRUNC('month', created_at)
            ORDER BY month DESC
          `,
    ]);

    // Get document type names for the grouped data
    const documentTypeIds = documentsByType.map((d: any) => d.documentTypeId);
    const documentTypes = await prisma.documentType.findMany({
      where: { id: { in: documentTypeIds } },
      select: { id: true, name: true, icon: true, color: true },
    });

    // Combine document type data with counts
    const documentTypeStats = documentsByType.map((stat: any) => {
      const type = documentTypes.find((t: any) => t.id === stat.documentTypeId);
      return {
        ...stat,
        documentType: type,
      };
    });

    // Calculate additional metrics
    const totalViewCount = await prisma.document.aggregate({
      where: {
        ...userAccessWhere,
        status: { not: 'ARCHIVED' },
      },
      _sum: {
        viewCount: true,
        downloadCount: true,
      },
    });

    // Calculate percentage changes (comparing last 30 days vs previous 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const [recentCount, previousCount] = await Promise.all([
      prisma.document.count({
        where: {
          ...userAccessWhere,
          createdAt: { gte: thirtyDaysAgo },
          status: { not: 'ARCHIVED' },
        },
      }),
      prisma.document.count({
        where: {
          ...userAccessWhere,
          createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
          status: { not: 'ARCHIVED' },
        },
      }),
    ]);

    const changePercentage = previousCount > 0 
      ? ((recentCount - previousCount) / previousCount) * 100 
      : 0;

    return NextResponse.json(serializeForResponse({
      overview: {
        totalDocuments,
        draftDocuments,
        pendingDocuments,
        approvedDocuments,
        archivedDocuments,
        myDocuments,
        totalViews: totalViewCount._sum.viewCount || 0,
        totalDownloads: totalViewCount._sum.downloadCount || 0,
        recentChangePercentage: Math.round(changePercentage * 100) / 100,
      },
      recentDocuments,
      topDownloadedDocuments,
      documentTypeStats,
      monthlyStats,
    }));
  } catch (error) {
    console.error('Error fetching document stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
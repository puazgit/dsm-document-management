import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/next-auth'
import { prisma } from '@/lib/prisma'
import { serializeForResponse } from '@/lib/bigint-utils'

// GET /api/activities/recent - Get recent activities for dashboard
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    // Fetch recent document activities
    const activities = await prisma.documentActivity.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        document: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    })

    // Map activities to a simplified format
    const formattedActivities = activities.map((activity) => ({
      id: activity.id,
      type: activity.action.toLowerCase(),
      user: `${activity.user.firstName} ${activity.user.lastName}`,
      userId: activity.user.id,
      description: getActivityDescription(activity.action, activity.document?.title || ''),
      timestamp: activity.createdAt,
      target: activity.document?.title,
      documentId: activity.document?.id,
    }))

    return NextResponse.json(serializeForResponse(formattedActivities))
  } catch (error) {
    console.error('Error fetching recent activities:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getActivityDescription(action: string, documentTitle: string): string {
  switch (action) {
    case 'CREATED':
      return `created ${documentTitle}`
    case 'UPDATED':
      return `updated ${documentTitle}`
    case 'VIEWED':
      return `viewed ${documentTitle}`
    case 'DOWNLOADED':
      return `downloaded ${documentTitle}`
    case 'APPROVED':
      return `approved ${documentTitle}`
    case 'REJECTED':
      return `rejected ${documentTitle}`
    case 'DELETED':
      return `deleted ${documentTitle}`
    case 'ARCHIVED':
      return `archived ${documentTitle}`
    case 'UNARCHIVED':
      return `unarchived ${documentTitle}`
    case 'COMMENTED':
      return `commented on ${documentTitle}`
    default:
      return `performed action on ${documentTitle}`
  }
}

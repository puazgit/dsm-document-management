import { NextResponse, NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkApiPermission } from '@/lib/permissions'

export async function GET(request: NextRequest) {
  try {
    // Check authentication and permissions
    const permissionCheck = await checkApiPermission(request, 'audit.read')
    
    if (!permissionCheck.success) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.error === 'Unauthorized' ? 401 : 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const documentId = searchParams.get('documentId')
    const userId = searchParams.get('userId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = {}

    if (action && action !== 'all') {
      where.action = action
    }

    if (documentId) {
      where.documentId = documentId
    }

    if (userId) {
      where.userId = userId
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate)
      }
    }

    const [activities, total] = await Promise.all([
      prisma.documentActivity.findMany({
        where,
        include: {
          document: {
            select: {
              id: true,
              title: true,
              fileName: true,
              fileType: true
            }
          },
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.documentActivity.count({ where })
    ])

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      activities,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    })
  } catch (error) {
    console.error('Error fetching document activities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch document activities' },
      { status: 500 }
    )
  }
}

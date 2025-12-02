import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/next-auth'
import { prisma } from '../../../lib/prisma'
import { checkApiPermission } from '../../../lib/permissions'
import { auditHelpers } from '../../../lib/audit'
import { requireRoles, getCurrentUser } from '../../../lib/auth-utils'
import { z } from 'zod'

const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  displayName: z.string().min(1).max(255),
  description: z.string().optional(),
  level: z.number().int().min(0).max(10)
  // Removed permissions - Groups are now purely organizational
})

const updateGroupSchema = z.object({
  displayName: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  level: z.number().int().min(0).max(10).optional()
  // Removed permissions - Groups are organizational structure only
})

// GET /api/groups - List all groups
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    console.log('🔐 Groups API - Session check:', { user: session?.user?.email, hasUser: !!session?.user })
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if current user has permission to view groups
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: { 
        userRoles: { 
          include: { role: true } 
        },
        group: true
      }
    })

    // Allow group viewing for administrators, ppd, managers, or kadiv
    const canViewGroups = currentUser?.userRoles.some(ur => 
      ['administrator', 'ppd', 'manager', 'kadiv'].includes(ur.role.name)
    ) || currentUser?.group?.name === 'administrator'

    if (!canViewGroups) {
      return NextResponse.json({ 
        error: 'Insufficient permissions', 
        details: 'Group viewing requires administrator, ppd, manager, or kadiv role'
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const includeUsers = searchParams.get('includeUsers') === 'true'

    const groups = await prisma.group.findMany({
      orderBy: [
        { level: 'desc' },
        { name: 'asc' }
      ],
      include: includeUsers ? {
        _count: {
          select: {
            users: true
          }
        }
      } : undefined
    })

    // Filter out groups with invalid IDs (safety check)
    const validGroups = groups.filter(group => group.id && typeof group.id === 'string' && group.id.trim() !== '')
    
    console.log('✅ Groups fetched successfully:', { count: validGroups.length })
    return NextResponse.json(validGroups)
  } catch (error) {
    console.error('💥 Error fetching groups:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

// POST /api/groups - Create new group
export const POST = requireRoles(['administrator'])(async function(request: NextRequest) {
  try {

    const body = await request.json()
    const validatedData = createGroupSchema.parse(body)

    // Check if group name already exists
    const existingGroup = await prisma.group.findUnique({
      where: { name: validatedData.name }
    })

    if (existingGroup) {
      return NextResponse.json(
        { error: 'Group name already exists' },
        { status: 400 }
      )
    }

    // Create the group
    const group = await prisma.group.create({
      data: {
        name: validatedData.name,
        displayName: validatedData.displayName,
        description: validatedData.description,
        level: validatedData.level
        // No permissions - Groups are organizational structure only
      }
    })

    // Log the creation
    const currentUser = await getCurrentUser(request)
    if (currentUser.success && currentUser.user) {
      const clientIp = request.headers.get('x-forwarded-for') || 
                       request.headers.get('x-real-ip') || 
                       'unknown'
      const userAgent = request.headers.get('user-agent') || undefined

      await auditHelpers.groupCreated(
        group.id,
        currentUser.user.id,
        {
          name: group.name,
          displayName: group.displayName,
          level: group.level
        },
        clientIp,
        userAgent
      )
    }

    return NextResponse.json(group, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating group:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
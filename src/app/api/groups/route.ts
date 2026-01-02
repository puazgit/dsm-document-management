import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { requireCapability } from '../../../lib/rbac-helpers'
import { auditHelpers } from '../../../lib/audit'
import { requireRoles, getCurrentUser } from '../../../lib/auth-utils'
import { z } from 'zod'

const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  displayName: z.string().min(1).max(255),
  description: z.string().optional()
  // Removed permissions - Groups are now purely organizational
})

const updateGroupSchema = z.object({
  displayName: z.string().min(1).max(255).optional(),
  description: z.string().optional()
  // Removed permissions - Groups are organizational structure only
})

// GET /api/groups - List all groups
export async function GET(request: NextRequest) {
  try {
    // Check authentication - all authenticated users can view groups
    const auth = await requireCapability(request, 'USER_VIEW')

    const { searchParams } = new URL(request.url)
    const includeUsers = searchParams.get('includeUsers') === 'true'

    const groups = await prisma.group.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        isActive: true,
        ...(includeUsers && {
          _count: {
            select: { users: true }
          }
        })
      },
      orderBy: [
        { name: 'asc' }
      ]
    })
    
    console.log('✅ Groups fetched successfully:', { count: groups.length })
    return NextResponse.json({ 
      groups,
      count: groups.length 
    })
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
export async function POST(request: NextRequest) {
  // Check capability - creating groups requires USER_MANAGE
  const auth = await requireCapability(request, 'USER_MANAGE')
  if (!auth.authorized) {
    return auth.error
  }
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
        description: validatedData.description
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
          displayName: group.displayName
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
}
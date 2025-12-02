import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/next-auth'
import { prisma } from '../../../../lib/prisma'
import { checkApiPermission } from '../../../../lib/permissions'
import { auditHelpers } from '../../../../lib/audit'
import { z } from 'zod'

const updateGroupSchema = z.object({
  displayName: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  level: z.number().int().min(0).max(10).optional(),
  // Removed permissions - Groups are now purely organizational
})

// GET /api/groups/[id] - Get specific group
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role
    const userRole = session.user.role?.toLowerCase()
    if (!userRole || userRole !== 'administrator') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const group = await prisma.group.findUnique({
      where: { id: params.id },
      include: {
        users: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true
          }
        },
        _count: {
          select: {
            users: true
          }
        }
      }
    })

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    return NextResponse.json(group)
  } catch (error) {
    console.error('Error fetching group:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/groups/[id] - Update group
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role
    const userRole = session.user.role?.toLowerCase()
    if (!userRole || userRole !== 'administrator') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const group = await prisma.group.findUnique({
      where: { id: params.id }
    })

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    const body = await request.json()
    console.log('PUT /api/groups/[id] - Request body:', JSON.stringify(body, null, 2))
    console.log('PUT /api/groups/[id] - Group ID:', params.id)
    console.log('PUT /api/groups/[id] - User role:', session.user.role)
    
    const validatedData = updateGroupSchema.parse(body)

    // Get original data for audit
    const originalData = {
      displayName: group.displayName,
      description: group.description,
      level: group.level
    }

    // Update the group (organizational structure only)
    const updatedGroup = await prisma.group.update({
      where: { id: params.id },
      data: {
        ...(validatedData.displayName && { displayName: validatedData.displayName }),
        ...(validatedData.description !== undefined && { description: validatedData.description }),
        ...(validatedData.level !== undefined && { level: validatedData.level })
      }
    })

    // Log the update
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || undefined

    await auditHelpers.groupUpdated(
      updatedGroup.id,
      session.user.id,
      {
        name: updatedGroup.name,
        changes: validatedData,
        originalData
      },
      clientIp,
      userAgent
    )

    return NextResponse.json(updatedGroup)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('PUT /api/groups/[id] - Validation error:', error.errors)
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('PUT /api/groups/[id] - Error updating group:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// DELETE /api/groups/[id] - Delete group
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role
    const userRole = session.user.role?.toLowerCase()
    if (!userRole || userRole !== 'administrator') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const group = await prisma.group.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            users: true
          }
        }
      }
    })

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Prevent deletion of system groups or groups with users
    if (group.name === 'administrator' || group.name === 'ppd') {
      return NextResponse.json(
        { error: 'Cannot delete system group' },
        { status: 400 }
      )
    }

    if (group._count.users > 0) {
      return NextResponse.json(
        { error: 'Cannot delete group with assigned users' },
        { status: 400 }
      )
    }

    // Delete the group
    await prisma.group.delete({
      where: { id: params.id }
    })

    // Log the deletion
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || undefined

    await auditHelpers.groupDeleted(
      params.id,
      session.user.id,
      {
        name: group.name,
        displayName: group.displayName,
        level: group.level
      },
      clientIp,
      userAgent
    )

    return NextResponse.json({ message: 'Group deleted successfully' })
  } catch (error) {
    console.error('Error deleting group:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
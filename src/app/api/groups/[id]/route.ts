import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { requireCapability } from '../../../../lib/rbac-helpers'
import { auditHelpers } from '../../../../lib/audit'
import { z } from 'zod'

const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  displayName: z.string().min(1).max(255).optional(),
  description: z.string().optional()
  // Removed permissions - Groups are now purely organizational
})

// GET /api/groups/[id] - Get specific group
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require USER_MANAGE capability for viewing group details
    const auth = await requireCapability(request, 'USER_MANAGE')

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
    // Require USER_MANAGE capability for updating groups
    const auth = await requireCapability(request, 'USER_MANAGE')

    const group = await prisma.group.findUnique({
      where: { id: params.id }
    })

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    const body = await request.json()
    console.log('PUT /api/groups/[id] - Request body:', JSON.stringify(body, null, 2))
    console.log('PUT /api/groups/[id] - Group ID:', params.id)
    
    let validatedData
    try {
      validatedData = updateGroupSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('❌ Validation error:', error.errors)
        return NextResponse.json(
          { error: 'Validation error', details: error.errors },
          { status: 400 }
        )
      }
      throw error
    }

    // Get original data for audit
    const originalData = {
      name: group.name,
      displayName: group.displayName,
      description: group.description
    }

    // Update the group (organizational structure only)
    const updatedGroup = await prisma.group.update({
      where: { id: params.id },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.displayName && { displayName: validatedData.displayName }),
        ...(validatedData.description !== undefined && { description: validatedData.description })
      }
    })

    // Log the update
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || undefined

    await auditHelpers.groupUpdated(
      updatedGroup.id,
      auth.userId!,
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
    // Require USER_DELETE capability for deleting groups
    const auth = await requireCapability(request, 'USER_DELETE')

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
      auth.userId!,
      {
        name: group.name,
        displayName: group.displayName
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
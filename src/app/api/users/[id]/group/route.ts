import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/next-auth'
import { prisma } from '@/lib/prisma'
import { requireCapability } from '@/lib/rbac-helpers'
import { auditHelpers } from '@/lib/audit'
import { z } from 'zod'

const assignGroupSchema = z.object({
  groupId: z.string().cuid('Invalid group ID').nullable(),
})

// PUT /api/users/[id]/group - Assign user to group (organizational structure)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireCapability(request, 'USER_MANAGE')

    const userId = params.id
    
    const body = await request.json()
    
    const { groupId } = assignGroupSchema.parse(body)

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        group: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if group exists (if groupId is not null)
    if (groupId) {
      const group = await prisma.group.findUnique({
        where: { id: groupId },
      })

      if (!group) {
        return NextResponse.json(
          { error: 'Group not found' },
          { status: 404 }
        )
      }
    }

    // Update user's group assignment
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        groupId: groupId, // null to remove from group
      },
      include: {
        group: true,
      }
    })

    // Log group assignment/removal
    if (groupId && user.groupId !== groupId) {
      // Group assignment
      await auditHelpers.groupAssigned(
        userId,
        groupId,
        auth.userId!,
        updatedUser.group?.name || 'Unknown',
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        request.headers.get('user-agent') || undefined
      )
    } else if (!groupId && user.groupId) {
      // Group removal
      await auditHelpers.groupRemoved(
        userId,
        user.groupId,
        auth.userId!,
        user.group?.name || 'Unknown',
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        request.headers.get('user-agent') || undefined
      )
    }

    return NextResponse.json({
      message: groupId ? 'User assigned to group successfully' : 'User removed from group successfully',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        group: updatedUser.group,
        groupId: updatedUser.groupId,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating user group:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/users/[id]/group - Get user's current group
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireCapability(request, 'USER_VIEW')

    const userId = params.id

    // Get user with group information
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        group: {
          include: {
            _count: {
              select: {
                users: true
              }
            }
          }
        },
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        group: user.group,
        groupId: user.groupId,
      }
    })
  } catch (error) {
    console.error('💥 Error updating user group:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data', 
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}
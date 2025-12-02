import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/next-auth'
import { prisma } from '@/lib/prisma'
import { checkApiPermission } from '@/lib/permissions'
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
    // Check authentication and permissions
    const session = await getServerSession(authOptions)
    console.log('🔐 Group Assignment - Session check:', { user: session?.user?.email, hasUser: !!session?.user })
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if current user has permission to assign groups
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: { 
        userRoles: { 
          include: { role: true } 
        },
        group: true
      }
    })

    // Allow group assignment for administrators, ppd, managers, or kadiv
    const canAssignGroups = currentUser?.userRoles.some(ur => 
      ['administrator', 'ppd', 'manager', 'kadiv'].includes(ur.role.name)
    ) || currentUser?.group?.name === 'administrator'

    if (!canAssignGroups) {
      return NextResponse.json({ 
        error: 'Insufficient permissions', 
        details: 'Group assignment requires administrator, ppd, manager, or kadiv role'
      }, { status: 403 })
    }

    const userId = params.id
    console.log('📝 Group Assignment Request:', { userId, requestingUser: currentUser?.email })
    
    const body = await request.json()
    console.log('📝 Request body:', body)
    
    const { groupId } = assignGroupSchema.parse(body)
    console.log('🎯 Parsed groupId:', groupId)

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
    const assignedById = (session.user as any).id
    if (groupId && user.groupId !== groupId) {
      // Group assignment
      await auditHelpers.groupAssigned(
        userId,
        groupId,
        assignedById,
        updatedUser.group?.name || 'Unknown',
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        request.headers.get('user-agent') || undefined
      )
    } else if (!groupId && user.groupId) {
      // Group removal
      await auditHelpers.groupRemoved(
        userId,
        user.groupId,
        assignedById,
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
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const permissionCheck = await checkApiPermission(request, 'users.read')
    
    if (!permissionCheck.success) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.error === 'Unauthorized' ? 401 : 403 }
      )
    }

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
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/next-auth'
import { prisma } from '@/lib/prisma'
import { checkApiPermission } from '@/lib/permissions'

// DELETE /api/users/[id]/roles/[roleId] - Revoke specific role from user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; roleId: string } }
) {
  try {
    // Check authentication and permissions
    const session = await getServerSession(authOptions)
    console.log('🔐 Role Revoke - Session check:', { user: session?.user?.email, hasUser: !!session?.user })
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if current user has permission to revoke roles
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: { 
        userRoles: { 
          include: { role: true } 
        },
        group: true
      }
    })

    // Allow role revocation for administrators, ppd, managers, or kadiv
    const canRevokeRoles = currentUser?.userRoles.some(ur => 
      ['administrator', 'ppd', 'manager', 'kadiv'].includes(ur.role.name)
    ) || currentUser?.group?.name === 'administrator'

    if (!canRevokeRoles) {
      return NextResponse.json({ 
        error: 'Insufficient permissions', 
        details: 'Role revocation requires administrator, ppd, manager, or kadiv role'
      }, { status: 403 })
    }

    const { id: userId, roleId } = params

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if role exists
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    })

    if (!role) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      )
    }

    // Check if role is a system role
    if (role.isSystem) {
      return NextResponse.json(
        { error: 'Cannot revoke system roles' },
        { status: 400 }
      )
    }

    // Check if user has this role
    const userRole = await prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    })

    if (!userRole) {
      return NextResponse.json(
        { error: 'User does not have this role' },
        { status: 400 }
      )
    }

    // Revoke role from user
    await prisma.userRole.delete({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    })

    // TODO: Add audit log entry for role revocation

    // Return updated user with all remaining roles
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
        group: true,
      },
    })

    return NextResponse.json({
      message: 'Role revoked successfully',
      user: updatedUser,
    })
  } catch (error) {
    console.error('Error revoking role from user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
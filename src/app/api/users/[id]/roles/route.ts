import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/next-auth'
import { prisma } from '@/lib/prisma'
import { auditHelpers } from '@/lib/audit'
import { z } from 'zod'
import { ROLE_PERMISSIONS, hasAnyRoleWithPermission } from '@/config/role-permissions'

const assignRolesSchema = z.object({
  roleIds: z.array(z.string()),
})

const assignSingleRoleSchema = z.object({
  roleId: z.string().cuid('Invalid role ID'),
})

// PUT /api/users/[id]/roles - Assign roles to user
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    console.log('🔐 Role Bulk Assignment - Session check:', { user: session?.user?.email, hasUser: !!session?.user })
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if current user has permission to assign roles
    const requestingUser = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: { 
        userRoles: { 
          include: { role: true } 
        }
      }
    })

    // Check role-based permission using centralized constants
    const userRoleNames = requestingUser?.userRoles.map(ur => ur.role.name) || []
    const canAssignRoles = hasAnyRoleWithPermission(userRoleNames, 'CAN_ASSIGN_ROLES')

    if (!canAssignRoles) {
      return NextResponse.json({ 
        error: 'Insufficient permissions', 
        details: `Role assignment requires one of: ${ROLE_PERMISSIONS.CAN_ASSIGN_ROLES.join(', ')}`
      }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const { roleIds } = assignRolesSchema.parse(body)

    // Verify all roles exist
    const roles = await prisma.role.findMany({
      where: { id: { in: roleIds } },
    })

    if (roles.length !== roleIds.length) {
      return NextResponse.json(
        { error: 'One or more roles not found' },
        { status: 400 }
      )
    }

    // Get current user roles for audit
    const currentUser = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    })

    const currentRoleIds = currentUser?.userRoles.map(ur => ur.roleId) || []
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || undefined

    // Use transaction to update roles
    await prisma.$transaction(async (tx: any) => {
      // Remove existing roles
      await tx.userRole.deleteMany({
        where: { userId: params.id },
      })

      // Add new roles
      if (roleIds.length > 0) {
        await tx.userRole.createMany({
          data: roleIds.map((roleId) => ({
            userId: params.id,
            roleId,
          })),
        })
      }
    })

    // Log role changes
    const removedRoles = currentRoleIds.filter(id => !roleIds.includes(id))
    const addedRoles = roleIds.filter(id => !currentRoleIds.includes(id))

    // Log role removals
    for (const roleId of removedRoles) {
      const role = currentUser?.userRoles.find(ur => ur.roleId === roleId)?.role
      if (role) {
        await auditHelpers.roleRevoked(
          params.id,
          roleId,
          session.user.id,
          role.name,
          clientIp,
          userAgent
        )
      }
    }

    // Log role additions
    for (const roleId of addedRoles) {
      const role = await prisma.role.findUnique({ where: { id: roleId } })
      if (role) {
        await auditHelpers.roleAssigned(
          params.id,
          roleId,
          session.user.id,
          role.name,
          clientIp,
          userAgent
        )
      }
    }

    // Return updated user with roles
    const updatedUser = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating user roles:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/users/[id]/roles - Assign single role to user
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication and permissions
    const session = await getServerSession(authOptions)
    console.log('🔐 Role Assignment - Session check:', { user: session?.user?.email, hasUser: !!session?.user })
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if current user has permission to assign roles
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: { 
        userRoles: { 
          include: { role: true } 
        }
      }
    })

    console.log('👤 Role Assignment - Current user:', { 
      email: currentUser?.email, 
      roles: currentUser?.userRoles.map(ur => ur.role.name)
    })

    // Check role-based permission using centralized constants
    const userRoleNames = currentUser?.userRoles.map(ur => ur.role.name) || []
    const canAssignRoles = hasAnyRoleWithPermission(userRoleNames, 'CAN_ASSIGN_ROLES')

    console.log('🔑 Role Assignment - Access check:', { 
      canAssignRoles, 
      userRoles: userRoleNames,
      requiredRoles: ROLE_PERMISSIONS.CAN_ASSIGN_ROLES 
    })

    if (!canAssignRoles) {
      console.log('❌ Role assignment access denied for user:', currentUser?.email)
      return NextResponse.json({ 
        error: 'Insufficient permissions', 
        details: `Role assignment requires one of: ${ROLE_PERMISSIONS.CAN_ASSIGN_ROLES.join(', ')}`
      }, { status: 403 })
    }

    const userId = params.id
    const body = await request.json()
    const { roleId } = assignSingleRoleSchema.parse(body)

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

    // Check if user already has this role
    const existingUserRole = await prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    })

    if (existingUserRole) {
      return NextResponse.json(
        { error: 'User already has this role' },
        { status: 400 }
      )
    }

    // Assign role to user
    const assignedById = (session.user as any).id
    if (!assignedById) {
      return NextResponse.json(
        { error: 'User ID not found in session' },
        { status: 401 }
      )
    }

    const userRole = await prisma.userRole.create({
      data: {
        userId,
        roleId,
        assignedBy: assignedById,
      },
      include: {
        role: true,
        user: true,
      },
    })

    // Add audit log entry for role assignment
    await auditHelpers.roleAssigned(
      userId,
      roleId,
      assignedById,
      role.name,
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      request.headers.get('user-agent') || undefined
    )

    // Return updated user with all roles
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
      message: 'Role assigned successfully',
      user: updatedUser,
      userRole,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error assigning role to user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/users/[id]/roles - Get user roles
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

    // Allow users to view their own roles or require admin permissions for others
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: { userRoles: { include: { role: true } } }
    })

    const isOwnProfile = currentUser?.id === params.id
    const userRoleNames = currentUser?.userRoles.map(ur => ur.role.name) || []
    const hasAdminAccess = hasAnyRoleWithPermission(userRoleNames, 'CAN_ASSIGN_ROLES')

    if (!isOwnProfile && !hasAdminAccess) {
      return NextResponse.json({ 
        error: 'Insufficient permissions',
        details: 'You can only view your own roles or need admin access'
      }, { status: 403 })
    }

    const userId = params.id

    // Get user with roles
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                capabilityAssignments: {
                  include: {
                    capability: true,
                  },
                },
              },
            },
          },
          orderBy: {
            assignedAt: 'desc',
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

    // Remove sensitive data
    const { passwordHash: _, ...safeUser } = user

    return NextResponse.json(safeUser)
  } catch (error) {
    console.error('Error fetching user roles:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
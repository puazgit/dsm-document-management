import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/next-auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const assignPermissionsSchema = z.object({
  permissionIds: z.array(z.string()),
})

const updateSinglePermissionSchema = z.object({
  permissionId: z.string().uuid(),
  isGranted: z.boolean(),
})

// PUT /api/roles/[id]/permissions - Assign permissions to role
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Check if user has admin role permissions

    const role = await prisma.role.findUnique({
      where: { id: params.id },
    })

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // Prevent updating system roles
    if (role.isSystem) {
      return NextResponse.json(
        { error: 'Cannot update permissions for system role' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { permissionIds } = assignPermissionsSchema.parse(body)

    // Verify all permissions exist
    const permissions = await prisma.permission.findMany({
      where: { id: { in: permissionIds } },
    })

    if (permissions.length !== permissionIds.length) {
      return NextResponse.json(
        { error: 'One or more permissions not found' },
        { status: 400 }
      )
    }

        // Use transaction to update roles
    await prisma.$transaction(async (tx) => {
      // Remove existing roles
      await tx.rolePermission.deleteMany({
        where: { roleId: params.id },
      })

      // Add new roles
      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            roleId: params.id,
            permissionId,
          })),
        })
      }
    })

    // Return updated role with permissions
    const updatedRole = await prisma.role.findUnique({
      where: { id: params.id },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    })

    return NextResponse.json(updatedRole)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating role permissions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/roles/[id]/permissions - Update single permission for role
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = await prisma.role.findUnique({
      where: { id: params.id },
    })

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // Prevent updating system roles
    if (role.isSystem) {
      return NextResponse.json(
        { error: 'Cannot update permissions for system role' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { permissionId, isGranted } = updateSinglePermissionSchema.parse(body)

    // Check if permission exists
    const permission = await prisma.permission.findUnique({
      where: { id: permissionId },
    })

    if (!permission) {
      return NextResponse.json(
        { error: 'Permission not found' },
        { status: 404 }
      )
    }

    // Update or create role permission
    const existingRolePermission = await prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId: params.id,
          permissionId,
        },
      },
    })

    if (existingRolePermission) {
      // Update existing permission
      await prisma.rolePermission.update({
        where: {
          roleId_permissionId: {
            roleId: params.id,
            permissionId,
          },
        },
        data: {
          isGranted,
        },
      })
    } else if (isGranted) {
      // Create new permission (only if granting)
      await prisma.rolePermission.create({
        data: {
          roleId: params.id,
          permissionId,
          isGranted,
        },
      })
    }

    // Get updated role with permissions
    const updatedRole = await prisma.role.findUnique({
      where: { id: params.id },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    })

    return NextResponse.json(updatedRole)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating role permission:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
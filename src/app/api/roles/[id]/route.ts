import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireRoles, checkRoleAccess } from '@/lib/auth-utils'
import { z } from 'zod'

const updateRoleSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  displayName: z.string().min(3).max(255).optional(),
  description: z.string().optional(),
  level: z.number().int().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
  permissions: z.array(z.string()).optional(),
})

const assignPermissionsSchema = z.object({
  permissionIds: z.array(z.string()),
})

// GET /api/roles/[id] - Get role by ID
export const GET = requireRoles(['administrator', 'ppd'])(
  async function(request: NextRequest, { params }: { params: { id: string } }) {
    try {

    const role = await prisma.role.findUnique({
      where: { id: params.id },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        userRoles: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    })

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    return NextResponse.json(role)
  } catch (error) {
    console.error('Error fetching role:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

// PUT /api/roles/[id] - Update role
export const PUT = requireRoles(['administrator'])(
  async function(request: NextRequest, { params }: { params: { id: string } }) {
    try {

    const role = await prisma.role.findUnique({
      where: { id: params.id },
    })

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // Prevent updating system roles
    if (role.isSystem) {
      return NextResponse.json(
        { error: 'Cannot update system role' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = updateRoleSchema.parse(body)

    // Check if role name already exists (excluding current role)
    if (validatedData.name && validatedData.name !== role.name) {
      const existingRole = await prisma.role.findUnique({
        where: { name: validatedData.name },
      })

      if (existingRole) {
        return NextResponse.json(
          { error: 'Role name already exists' },
          { status: 400 }
        )
      }
    }

    // Update role basic fields
    const updatedRole = await prisma.role.update({
      where: { id: params.id },
      data: {
        name: validatedData.name,
        displayName: validatedData.displayName,
        description: validatedData.description,
        level: validatedData.level,
        isActive: validatedData.isActive,
      },
    })

    // Update permissions if provided
    if (validatedData.permissions !== undefined) {
      // Remove all existing role permissions
      await prisma.rolePermission.deleteMany({
        where: { roleId: params.id },
      })

      // Add new role permissions
      if (validatedData.permissions.length > 0) {
        const rolePermissionsData = validatedData.permissions.map(permissionId => ({
          roleId: params.id,
          permissionId,
          isGranted: true,
        }))

        await prisma.rolePermission.createMany({
          data: rolePermissionsData,
        })
      }
    }

    // Fetch updated role with permissions
    const roleWithPermissions = await prisma.role.findUnique({
      where: { id: params.id },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    })

    return NextResponse.json(roleWithPermissions)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating role:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

// DELETE /api/roles/[id] - Delete role
export const DELETE = requireRoles(['administrator'])(
  async function(request: NextRequest, { params }: { params: { id: string } }) {
    try {

    const role = await prisma.role.findUnique({
      where: { id: params.id },
      include: {
        userRoles: true,
      },
    })

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // Prevent deleting system roles
    if (role.isSystem) {
      return NextResponse.json(
        { error: 'Cannot delete system role' },
        { status: 403 }
      )
    }

    // Check if role is being used by users
    if (role.userRoles.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete role that is assigned to users' },
        { status: 400 }
      )
    }

    await prisma.role.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Role deleted successfully' })
  } catch (error) {
    console.error('Error deleting role:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
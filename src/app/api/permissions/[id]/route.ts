import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/next-auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updatePermissionSchema = z.object({
  action: z.string().min(3).max(100).optional(),
  module: z.string().min(3).max(100).optional(),
  resource: z.string().min(3).max(100).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
})

// GET /api/permissions/[id] - Get permission by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const permission = await prisma.permission.findUnique({
      where: { id: params.id },
      include: {
        rolePermissions: {
          include: {
            role: true,
          },
        },
      },
    })

    if (!permission) {
      return NextResponse.json(
        { error: 'Permission not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(permission)
  } catch (error) {
    console.error('Error fetching permission:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/permissions/[id] - Update permission
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Check if user has admin permissions

    const permission = await prisma.permission.findUnique({
      where: { id: params.id },
    })

    if (!permission) {
      return NextResponse.json(
        { error: 'Permission not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validatedData = updatePermissionSchema.parse(body)

    // Check if updated permission already exists (excluding current permission)
    if (
      validatedData.action ||
      validatedData.module ||
      validatedData.resource
    ) {
      const existingPermission = await prisma.permission.findFirst({
        where: {
          AND: [
            { id: { not: params.id } },
            {
              action: validatedData.action || permission.action,
              module: validatedData.module || permission.module,
              resource: validatedData.resource || permission.resource,
            },
          ],
        },
      })

      if (existingPermission) {
        return NextResponse.json(
          { error: 'Permission already exists' },
          { status: 400 }
        )
      }
    }

    const updatedPermission = await prisma.permission.update({
      where: { id: params.id },
      data: validatedData,
      include: {
        rolePermissions: {
          include: {
            role: true,
          },
        },
      },
    })

    return NextResponse.json(updatedPermission)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating permission:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/permissions/[id] - Delete permission
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Check if user has admin permissions

    const permission = await prisma.permission.findUnique({
      where: { id: params.id },
      include: {
        rolePermissions: true,
      },
    })

    if (!permission) {
      return NextResponse.json(
        { error: 'Permission not found' },
        { status: 404 }
      )
    }

    // Check if permission is being used by roles
    if (permission.rolePermissions.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete permission that is assigned to roles' },
        { status: 400 }
      )
    }

    await prisma.permission.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Permission deleted successfully' })
  } catch (error) {
    console.error('Error deleting permission:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
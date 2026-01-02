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

    // Permission system has been replaced with capabilities
    // Return deprecation notice
    return NextResponse.json({
      error: 'This endpoint is deprecated. Use /api/roles/[id]/capabilities instead',
      deprecatedSince: '2024'
    }, { status: 410 })
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

    // Permission system has been replaced with capabilities
    return NextResponse.json({
      error: 'This endpoint is deprecated. Use /api/roles/[id]/capabilities instead',
      deprecatedSince: '2024'
    }, { status: 410 })
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
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/next-auth'
import { prisma } from '../../../lib/prisma'
import { z } from 'zod'
import { serializeForResponse } from '../../../lib/bigint-utils'
import { requireRoles } from '@/lib/auth-utils'

const createRoleSchema = z.object({
  name: z.string().min(3).max(100),
  displayName: z.string().min(3).max(255),
  description: z.string().optional(),
  level: z.number().int().min(0).max(100).default(10),
  isActive: z.boolean().default(true),
  permissions: z.array(z.string()).optional(),
})

const updateRoleSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  displayName: z.string().min(3).max(255).optional(),
  description: z.string().optional(),
  level: z.number().int().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
})

// GET /api/roles - List all roles  
export async function GET(request: NextRequest) {
  try {
    // Check authentication first
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // For role assignment purposes, any authenticated user can view roles
    // But for management operations, still require proper permissions
    const { searchParams } = new URL(request.url)
    const includePermissions = searchParams.get('includePermissions') === 'true'
    const isActive = searchParams.get('isActive')

    const where: any = {}
    if (isActive !== null) where.isActive = isActive === 'true'

    const roles = await prisma.role.findMany({
      where,
      include: {
        rolePermissions: includePermissions
          ? {
              include: {
                permission: true,
              },
            }
          : false,
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
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
      orderBy: [{ level: 'desc' }, { name: 'asc' }],
    })

    // Filter out any roles with invalid IDs (should not happen, but safety check)
    const validRoles = roles.filter(role => role.id && typeof role.id === 'string' && role.id.trim() !== '')

    return NextResponse.json(serializeForResponse(validRoles))
  } catch (error) {
    console.error('Error fetching roles:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/roles - Create new role
export const POST = requireRoles(['administrator'])(async function(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createRoleSchema.parse(body)

    // Check if role name already exists
    const existingRole = await prisma.role.findUnique({
      where: { name: validatedData.name },
    })

    if (existingRole) {
      return NextResponse.json(
        { error: 'Role name already exists' },
        { status: 400 }
      )
    }

    // Create role
    const role = await prisma.role.create({
      data: {
        name: validatedData.name,
        displayName: validatedData.displayName,
        description: validatedData.description,
        level: validatedData.level,
        isActive: validatedData.isActive,
        isSystem: false,
      },
    })

    // Add permissions if provided
    if (validatedData.permissions && validatedData.permissions.length > 0) {
      const rolePermissionsData = validatedData.permissions.map(permissionId => ({
        roleId: role.id,
        permissionId,
        isGranted: true,
      }))

      await prisma.rolePermission.createMany({
        data: rolePermissionsData,
      })
    }

    // Fetch created role with permissions
    const roleWithPermissions = await prisma.role.findUnique({
      where: { id: role.id },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    })

    return NextResponse.json(serializeForResponse(roleWithPermissions), { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating role:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
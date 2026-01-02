import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '../../../lib/next-auth'
import { prisma } from '../../../lib/prisma'
import { requireCapability } from '@/lib/rbac-helpers'
import { z } from 'zod'
import { serializeForResponse } from '../../../lib/bigint-utils'

const createRoleSchema = z.object({
  name: z.string().min(3).max(100),
  displayName: z.string().min(3).max(255),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  permissions: z.array(z.string()).optional(),
})

const updateRoleSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  displayName: z.string().min(3).max(255).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
})

// GET /api/roles - List all roles  
export async function GET(request: NextRequest) {
  try {
    const auth = await requireCapability(request, 'ROLE_VIEW')

    const { searchParams } = new URL(request.url)
    const includePermissions = searchParams.get('includePermissions') === 'true'
    const isActive = searchParams.get('isActive')

    const where: any = {}
    if (isActive !== null) where.isActive = isActive === 'true'

    const roles = await prisma.role.findMany({
      where,
      include: {
        capabilityAssignments: includePermissions
          ? {
              include: {
                capability: true,
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
      orderBy: { name: 'asc' },
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
export async function POST(request: NextRequest) {
  try {
    const auth = await requireCapability(request, 'ROLE_MANAGE')

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
        isActive: validatedData.isActive,
        isSystem: false,
      },
    })

    // Note: Permissions system replaced with capabilities
    // Use /api/roles/[id]/capabilities endpoint to assign capabilities

    return NextResponse.json(role, { status: 201 })
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
}
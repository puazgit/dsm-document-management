import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/next-auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createPermissionSchema = z.object({
  name: z.string().min(3).max(100),
  displayName: z.string().min(3).max(255),
  action: z.string().min(3).max(100),
  module: z.string().min(3).max(100),
  resource: z.string().min(3).max(100).optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
})

// GET /api/permissions - List all permissions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const module = searchParams.get('module')
    const action = searchParams.get('action')
    const isActive = searchParams.get('isActive')
    const includeRoles = searchParams.get('includeRoles') === 'true'

    const where: any = {}
    if (module) where.module = module
    if (action) where.action = action
    if (isActive !== null) where.isActive = isActive === 'true'

    const permissions = await prisma.permission.findMany({
      where,
      include: {
        rolePermissions: includeRoles
          ? {
              include: {
                role: true,
              },
            }
          : false,
        _count: {
          select: {
            rolePermissions: true,
          },
        },
      },
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    })



    return NextResponse.json(permissions)
  } catch (error) {
    console.error('Error fetching permissions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/permissions - Create new permission
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Check if user has admin role permissions

    const body = await request.json()
    const validatedData = createPermissionSchema.parse(body)

    // Check if permission already exists
    const existingPermission = await prisma.permission.findFirst({
      where: {
        action: validatedData.action,
        module: validatedData.module,
        resource: validatedData.resource,
      },
    })

    if (existingPermission) {
      return NextResponse.json(
        { error: 'Permission already exists' },
        { status: 400 }
      )
    }

    const permission = await prisma.permission.create({
      data: {
        name: validatedData.name,
        displayName: validatedData.displayName,
        action: validatedData.action,
        module: validatedData.module,
        resource: validatedData.resource,
        description: validatedData.description,
        isActive: validatedData.isActive,
      },
    })

    return NextResponse.json(permission, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating permission:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
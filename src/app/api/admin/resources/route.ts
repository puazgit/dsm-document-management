import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/next-auth'
import { PrismaClient } from '@prisma/client'
import { UnifiedAccessControl } from '@/lib/unified-access-control'

const prisma = new PrismaClient()

/**
 * GET /api/admin/resources
 * List all resources
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const hasAccess = await UnifiedAccessControl.hasCapability(
      session.user.id,
      'PERMISSION_MANAGE'
    )
    
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { type } = Object.fromEntries(req.nextUrl.searchParams)
    
    const where = type ? { type } : {}
    
    const resources = await prisma.resource.findMany({
      where,
      orderBy: [
        { type: 'asc' },
        { sortOrder: 'asc' },
      ],
      include: {
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })
    
    return NextResponse.json({ resources })
  } catch (error) {
    console.error('Error fetching resources:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/resources
 * Create new resource
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const hasAccess = await UnifiedAccessControl.hasCapability(
      session.user.id,
      'PERMISSION_MANAGE'
    )
    
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await req.json()
    const {
      id,
      type,
      path,
      name,
      description,
      parentId,
      requiredCapability,
      icon,
      sortOrder,
      isActive,
      metadata,
    } = body
    
    // Validate required fields
    if (!id || !type || !path || !name) {
      return NextResponse.json(
        { error: 'ID, type, path, and name are required' },
        { status: 400 }
      )
    }
    
    // Check if exists
    const existing = await prisma.resource.findUnique({
      where: { id },
    })
    
    if (existing) {
      return NextResponse.json(
        { error: 'Resource with this ID already exists' },
        { status: 400 }
      )
    }
    
    const resource = await prisma.resource.create({
      data: {
        id,
        type,
        path,
        name,
        description,
        parentId: parentId || null,
        requiredCapability: requiredCapability || null,
        icon,
        sortOrder: sortOrder || 0,
        isActive: isActive !== false,
        metadata: metadata || null,
      },
    })
    
    // Clear cache
    UnifiedAccessControl.clearAllCache()
    
    return NextResponse.json({ resource }, { status: 201 })
  } catch (error) {
    console.error('Error creating resource:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

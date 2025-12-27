import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/next-auth'
import { PrismaClient } from '@prisma/client'
import { UnifiedAccessControl } from '@/lib/unified-access-control'

const prisma = new PrismaClient()

/**
 * GET /api/admin/capabilities
 * List all capabilities
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check permission
    const hasAccess = await UnifiedAccessControl.hasCapability(
      session.user.id,
      'PERMISSION_MANAGE'
    )
    
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const capabilities = await prisma.roleCapability.findMany({
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
      include: {
        assignments: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
    })
    
    return NextResponse.json({ capabilities })
  } catch (error) {
    console.error('Error fetching capabilities:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/capabilities
 * Create new capability
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
    
    const { name, description, category } = await req.json()
    
    // Validate
    if (!name || !category) {
      return NextResponse.json(
        { error: 'Name and category are required' },
        { status: 400 }
      )
    }
    
    // Check if exists
    const existing = await prisma.roleCapability.findUnique({
      where: { name },
    })
    
    if (existing) {
      return NextResponse.json(
        { error: 'Capability with this name already exists' },
        { status: 400 }
      )
    }
    
    const capability = await prisma.roleCapability.create({
      data: {
        name,
        description,
        category,
      },
    })
    
    // Clear cache
    UnifiedAccessControl.clearAllCache()
    
    return NextResponse.json({ capability }, { status: 201 })
  } catch (error) {
    console.error('Error creating capability:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

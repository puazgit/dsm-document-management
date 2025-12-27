import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/next-auth'
import { PrismaClient } from '@prisma/client'
import { UnifiedAccessControl } from '@/lib/unified-access-control'

const prisma = new PrismaClient()

/**
 * PUT /api/admin/resources/:id
 * Update resource
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    
    const resource = await prisma.resource.update({
      where: { id: params.id },
      data: {
        type,
        path,
        name,
        description,
        parentId: parentId || null,
        requiredCapability: requiredCapability || null,
        icon,
        sortOrder,
        isActive,
        metadata: metadata || null,
      },
    })
    
    // Clear cache
    UnifiedAccessControl.clearAllCache()
    
    return NextResponse.json({ resource })
  } catch (error) {
    console.error('Error updating resource:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/resources/:id
 * Delete resource
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    
    await prisma.resource.delete({
      where: { id: params.id },
    })
    
    // Clear cache
    UnifiedAccessControl.clearAllCache()
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting resource:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

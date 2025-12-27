import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/next-auth'
import { PrismaClient } from '@prisma/client'
import { UnifiedAccessControl } from '@/lib/unified-access-control'

const prisma = new PrismaClient()

/**
 * PUT /api/admin/capabilities/:id
 * Update capability
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
    
    const { name, description, category } = await req.json()
    
    const capability = await prisma.roleCapability.update({
      where: { id: params.id },
      data: {
        name,
        description,
        category,
      },
    })
    
    // Clear cache
    UnifiedAccessControl.clearAllCache()
    
    return NextResponse.json({ capability })
  } catch (error) {
    console.error('Error updating capability:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/capabilities/:id
 * Delete capability
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
    
    await prisma.roleCapability.delete({
      where: { id: params.id },
    })
    
    // Clear cache
    UnifiedAccessControl.clearAllCache()
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting capability:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

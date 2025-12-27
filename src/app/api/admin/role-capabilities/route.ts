import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/next-auth'
import { PrismaClient } from '@prisma/client'
import { UnifiedAccessControl } from '@/lib/unified-access-control'

const prisma = new PrismaClient()

/**
 * GET /api/admin/role-capabilities
 * Get all roles with their capabilities
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const hasAccess = await UnifiedAccessControl.hasCapability(
      session.user.id,
      'ROLE_MANAGE'
    )
    
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const roles = await prisma.role.findMany({
      orderBy: { level: 'desc' },
      include: {
        capabilityAssignments: {
          include: {
            capability: true,
          },
        },
      },
    })
    
    return NextResponse.json({ roles })
  } catch (error) {
    console.error('Error fetching role capabilities:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/role-capabilities
 * Assign/unassign capability to role
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const hasAccess = await UnifiedAccessControl.hasCapability(
      session.user.id,
      'ROLE_MANAGE'
    )
    
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { roleId, capabilityId, action } = await req.json()
    
    if (!roleId || !capabilityId || !action) {
      return NextResponse.json(
        { error: 'roleId, capabilityId, and action are required' },
        { status: 400 }
      )
    }
    
    if (action === 'assign') {
      // Check if already exists
      const existing = await prisma.roleCapabilityAssignment.findUnique({
        where: {
          roleId_capabilityId: {
            roleId,
            capabilityId,
          },
        },
      })
      
      if (existing) {
        return NextResponse.json(
          { error: 'Assignment already exists' },
          { status: 400 }
        )
      }
      
      const assignment = await prisma.roleCapabilityAssignment.create({
        data: {
          roleId,
          capabilityId,
        },
      })
      
      // Clear cache
      UnifiedAccessControl.clearAllCache()
      
      return NextResponse.json({ assignment }, { status: 201 })
    } else if (action === 'unassign') {
      await prisma.roleCapabilityAssignment.delete({
        where: {
          roleId_capabilityId: {
            roleId,
            capabilityId,
          },
        },
      })
      
      // Clear cache
      UnifiedAccessControl.clearAllCache()
      
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "assign" or "unassign"' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error managing role capability:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

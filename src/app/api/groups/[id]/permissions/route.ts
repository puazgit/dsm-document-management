import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../../lib/auth'
import { prisma } from '../../../../../lib/prisma'
import { requireCapability } from '../../../../../lib/rbac-helpers'

// GET /api/groups/[id]/permissions - Get group permissions with detailed info
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check capability - viewing group permissions requires USER_MANAGE
  const auth = await requireCapability(request, 'USER_MANAGE')
  if (!auth.authorized) {
    return auth.error
  }

  try {
    const { id } = params

    // Get group with its permissions
    const group = await prisma.group.findUnique({
      where: { id }
    })

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Note: Permission system has been replaced with capabilities
    // This endpoint returns empty structure for backwards compatibility
    return NextResponse.json({
      group,
      availablePermissions: {},
      groupPermissions: {}
    })
  } catch (error) {
    console.error('Error fetching group permissions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/groups/[id]/permissions - Sync group permissions with role-permission system
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check capability - managing group permissions requires USER_MANAGE
  const auth = await requireCapability(request, 'USER_MANAGE')
  if (!auth.authorized) {
    return auth.error
  }

  try {
    const { id } = params
    const body = await request.json()
    const { syncToRoles } = body

    // Get group with its current permissions
    const group = await prisma.group.findUnique({
      where: { id }
    })

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    const groupPermissions = (group as any).permissions
    if (!groupPermissions) {
      return NextResponse.json({ error: 'Group has no permissions to sync' }, { status: 400 })
    }

    if (syncToRoles) {
      // Note: This functionality has been replaced by the capabilities system
      // Returning success for backwards compatibility
      return NextResponse.json({
        message: 'Permission sync is deprecated - use role capabilities instead',
        groupName: group.name,
        migratedToCapabilities: true
      })
    }

    return NextResponse.json({ message: 'No sync requested' })
  } catch (error) {
    console.error('Error syncing group permissions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
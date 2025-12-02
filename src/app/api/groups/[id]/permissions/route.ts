import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../../lib/auth'
import { prisma } from '../../../../../lib/prisma'
import { requireRoles } from '../../../../../lib/auth-utils'

// GET /api/groups/[id]/permissions - Get group permissions with detailed info
export const GET = requireRoles(['administrator'])(async function(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Get group with its permissions
    const group = await prisma.group.findUnique({
      where: { id }
    })

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Get all available permissions from the permissions table
    const availablePermissions = await prisma.permission.findMany({
      orderBy: [
        { module: 'asc' },
        { action: 'asc' }
      ]
    })

    // Group permissions by module
    const permissionsByModule = availablePermissions.reduce((acc: Record<string, any[]>, permission: any) => {
      if (!acc[permission.module]) {
        acc[permission.module] = []
      }
      acc[permission.module]!.push(permission)
      return acc
    }, {} as Record<string, any[]>)

    return NextResponse.json({
      group,
      availablePermissions: permissionsByModule,
      groupPermissions: (group as any).permissions || {
        documents: { create: false, read: true, update: false, delete: false, approve: false },
        users: { create: false, read: false, update: false, delete: false },
        admin: { access: false, systemConfig: false }
      }
    })
  } catch (error) {
    console.error('Error fetching group permissions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

// POST /api/groups/[id]/permissions - Sync group permissions with role-permission system
export const POST = requireRoles(['administrator'])(async function(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      // Create a role for this group if it doesn't exist
      let role = await prisma.role.findUnique({
        where: { name: group.name }
      })

      if (!role) {
        role = await prisma.role.create({
          data: {
            name: group.name,
            displayName: group.displayName,
            description: `Auto-generated role for ${group.displayName} group`,
            level: 0,
            isSystem: false
          }
        })
      }

      // Convert group permissions to individual permissions
      const permissions = groupPermissions as any
      const permissionsToSync = []

      // Documents permissions
      if (permissions.documents) {
        Object.entries(permissions.documents).forEach(([action, enabled]) => {
          if (enabled) {
            permissionsToSync.push(`documents.${action}`)
          }
        })
      }

      // Users permissions
      if (permissions.users) {
        Object.entries(permissions.users).forEach(([action, enabled]) => {
          if (enabled) {
            permissionsToSync.push(`users.${action}`)
          }
        })
      }

      // Admin permissions
      if (permissions.admin) {
        if (permissions.admin.access) {
          permissionsToSync.push('admin.access')
        }
        if (permissions.admin.systemConfig) {
          permissionsToSync.push('system.config')
        }
      }

      // Find or create permissions and link them to the role
      const createdRolePermissions = []
      for (const permName of permissionsToSync) {
        const parts = permName.split('.')
        const module = parts[0] || ''
        const action = parts[1] || ''
        
        if (!module || !action) continue
        
        let permission = await prisma.permission.findFirst({
          where: {
            module,
            action,
            resource: 'all'
          }
        })

        if (!permission) {
          permission = await prisma.permission.create({
            data: {
              name: permName,
              displayName: `${action.charAt(0).toUpperCase()}${action.slice(1)} ${module}`,
              description: `Auto-generated permission for ${action} on ${module}`,
              module,
              action,
              resource: 'all'
            }
          })
        }

        // Link permission to role
        const existingRolePermission = await prisma.rolePermission.findUnique({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permission.id
            }
          }
        })

        if (!existingRolePermission) {
          const rolePermission = await prisma.rolePermission.create({
            data: {
              roleId: role.id,
              permissionId: permission.id,
              isGranted: true
            }
          })
          createdRolePermissions.push(rolePermission)
        }
      }

      return NextResponse.json({
        message: 'Group permissions synced to role-permission system',
        role,
        syncedPermissions: permissionsToSync,
        createdRolePermissions: createdRolePermissions.length
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
})
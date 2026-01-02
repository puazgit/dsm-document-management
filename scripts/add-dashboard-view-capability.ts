#!/usr/bin/env tsx
/**
 * Add DASHBOARD_VIEW Capability and Assign to Admin
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('\n🔧 Adding DASHBOARD_VIEW Capability\n')

  try {
    // 1. Create or get DASHBOARD_VIEW capability
    let capability = await prisma.roleCapability.findUnique({
      where: { name: 'DASHBOARD_VIEW' }
    })

    if (capability) {
      console.log('✅ DASHBOARD_VIEW capability already exists')
    } else {
      capability = await prisma.roleCapability.create({
        data: {
          name: 'DASHBOARD_VIEW',
          description: 'Permission to view and access the dashboard',
          category: 'dashboard'
        }
      })
      console.log('✅ Created DASHBOARD_VIEW capability')
    }

    // 2. Find admin user
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@dsm.com' },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    })

    if (!adminUser) {
      console.error('❌ Admin user (admin@dsm.com) not found')
      return
    }

    console.log(`✅ Found admin user: ${adminUser.firstName} ${adminUser.lastName}`)

    // 3. Get all roles for the admin user
    if (adminUser.userRoles.length === 0) {
      console.error('❌ Admin user has no roles assigned')
      return
    }

    // 4. Assign capability to all admin's roles
    for (const userRole of adminUser.userRoles) {
      const role = userRole.role
      
      // Check if already assigned
      const existing = await prisma.roleCapabilityAssignment.findUnique({
        where: {
          roleId_capabilityId: {
            roleId: role.id,
            capabilityId: capability.id
          }
        }
      })

      if (existing) {
        console.log(`⏭️  DASHBOARD_VIEW already assigned to role: ${role.displayName}`)
      } else {
        await prisma.roleCapabilityAssignment.create({
          data: {
            roleId: role.id,
            capabilityId: capability.id
          }
        })
        console.log(`✅ Assigned DASHBOARD_VIEW to role: ${role.displayName}`)
      }
    }

    // 5. Verify the assignment
    console.log('\n📋 Verification:')
    const userWithCapabilities = await prisma.user.findUnique({
      where: { email: 'admin@dsm.com' },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                capabilityAssignments: {
                  include: {
                    capability: true
                  }
                }
              }
            }
          }
        }
      }
    })

    const capabilities = userWithCapabilities?.userRoles.flatMap(ur =>
      ur.role.capabilityAssignments.map(ca => ca.capability.name)
    ) || []

    const hasDashboardView = capabilities.includes('DASHBOARD_VIEW')
    
    if (hasDashboardView) {
      console.log('✅ Admin user now has DASHBOARD_VIEW capability')
      console.log(`📊 Total capabilities: ${[...new Set(capabilities)].length}`)
    } else {
      console.log('❌ DASHBOARD_VIEW capability not found for admin user')
    }

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

main()
  .then(() => {
    console.log('\n✅ Script completed successfully\n')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

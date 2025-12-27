import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixManagerTikCapabilities() {
  console.log('🔍 Checking capabilities for manager.tik@dsm.com...\n')
  
  try {
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: 'manager.tik@dsm.com' },
      include: {
        userRoles: {
          where: { isActive: true },
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
    
    if (!user) {
      console.log('❌ User manager.tik@dsm.com not found')
      return
    }
    
    console.log('👤 User:', user.email)
    console.log('   Name:', user.firstName, user.lastName)
    console.log('   Roles:', user.userRoles.map(ur => ur.role.name).join(', '))
    console.log('')
    
    // Get current capabilities
    const capabilities = user.userRoles.flatMap(ur =>
      ur.role.capabilityAssignments.map(ca => ca.capability.name)
    )
    
    const uniqueCapabilities = [...new Set(capabilities)]
    
    console.log('🔑 Current Capabilities:')
    if (uniqueCapabilities.length === 0) {
      console.log('   ❌ (none)')
    } else {
      uniqueCapabilities.sort().forEach(cap => {
        console.log(`   ✓ ${cap}`)
      })
    }
    console.log(`   Total: ${uniqueCapabilities.length}`)
    
    // Check for DASHBOARD_VIEW
    const hasDashboardView = uniqueCapabilities.includes('DASHBOARD_VIEW')
    console.log(`\n📊 DASHBOARD_VIEW: ${hasDashboardView ? '✅ Present' : '❌ Missing'}`)
    
    if (!hasDashboardView) {
      console.log('\n🔧 Need to add DASHBOARD_VIEW capability...')
      
      // Get the role(s) for this user
      const roles = user.userRoles.map(ur => ur.role)
      
      if (roles.length === 0) {
        console.log('❌ User has no roles assigned')
        return
      }
      
      // Find or create DASHBOARD_VIEW capability
      let dashboardViewCap = await prisma.roleCapability.findUnique({
        where: { name: 'DASHBOARD_VIEW' }
      })
      
      if (!dashboardViewCap) {
        console.log('   Creating DASHBOARD_VIEW capability...')
        dashboardViewCap = await prisma.roleCapability.create({
          data: {
            name: 'DASHBOARD_VIEW',
            description: 'Can view main dashboard',
            category: 'dashboard'
          }
        })
        console.log('   ✅ DASHBOARD_VIEW capability created')
      } else {
        console.log('   ✓ DASHBOARD_VIEW capability exists')
      }
      
      // Add DASHBOARD_VIEW to all user's roles
      for (const role of roles) {
        const existing = await prisma.roleCapabilityAssignment.findUnique({
          where: {
            roleId_capabilityId: {
              roleId: role.id,
              capabilityId: dashboardViewCap.id
            }
          }
        })
        
        if (!existing) {
          await prisma.roleCapabilityAssignment.create({
            data: {
              roleId: role.id,
              capabilityId: dashboardViewCap.id
            }
          })
          console.log(`   ✅ Added DASHBOARD_VIEW to role: ${role.name}`)
        } else {
          console.log(`   ✓ Role "${role.name}" already has DASHBOARD_VIEW`)
        }
      }
      
      console.log('\n✅ DASHBOARD_VIEW capability added successfully!')
    } else {
      console.log('\n✅ User already has DASHBOARD_VIEW capability')
    }
    
    // Verify the fix
    console.log('\n\n🔍 Verifying capabilities after fix...\n')
    
    const updatedUser = await prisma.user.findUnique({
      where: { email: 'manager.tik@dsm.com' },
      include: {
        userRoles: {
          where: { isActive: true },
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
    
    const updatedCapabilities = updatedUser?.userRoles.flatMap(ur =>
      ur.role.capabilityAssignments.map(ca => ca.capability.name)
    ) || []
    
    const updatedUniqueCapabilities = [...new Set(updatedCapabilities)]
    
    console.log('🔑 Updated Capabilities:')
    updatedUniqueCapabilities.sort().forEach(cap => {
      const isNew = !uniqueCapabilities.includes(cap)
      console.log(`   ${isNew ? '🆕' : '✓'} ${cap}`)
    })
    console.log(`   Total: ${updatedUniqueCapabilities.length}`)
    
    const nowHasDashboardView = updatedUniqueCapabilities.includes('DASHBOARD_VIEW')
    console.log(`\n✅ DASHBOARD_VIEW: ${nowHasDashboardView ? '✅ Present' : '❌ Still Missing'}`)
    
    if (nowHasDashboardView) {
      console.log('\n🎉 Success! manager.tik@dsm.com can now access the dashboard')
      console.log('   Please refresh the browser to see the changes')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the fix
fixManagerTikCapabilities()
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })

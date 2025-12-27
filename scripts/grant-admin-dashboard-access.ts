import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Granting Dashboard access to admin@dsm.com...\n')
  
  // 1. Find admin user
  const admin = await prisma.user.findUnique({
    where: { email: 'admin@dsm.com' },
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
  
  if (!admin) {
    console.log('❌ admin@dsm.com not found')
    return
  }
  
  console.log('👤 User:', admin.email)
  console.log('📋 Roles:', admin.userRoles.map(ur => ur.role.name).join(', '))
  console.log('')
  
  // 2. Get DASHBOARD_VIEW capability
  const dashboardCap = await prisma.roleCapability.findUnique({
    where: { name: 'DASHBOARD_VIEW' }
  })
  
  if (!dashboardCap) {
    console.log('❌ DASHBOARD_VIEW capability not found')
    return
  }
  
  console.log('✅ Found DASHBOARD_VIEW capability')
  console.log('')
  
  // 3. Assign to admin's roles
  console.log('🔧 Assigning DASHBOARD_VIEW to admin roles...\n')
  
  for (const userRole of admin.userRoles) {
    const role = userRole.role
    
    // Check if already assigned
    const hasCapability = role.capabilityAssignments.some(
      ca => ca.capability.name === 'DASHBOARD_VIEW'
    )
    
    if (hasCapability) {
      console.log(`   ✅ ${role.name} - already has DASHBOARD_VIEW`)
    } else {
      try {
        await prisma.roleCapabilityAssignment.create({
          data: {
            roleId: role.id,
            capabilityId: dashboardCap.id
          }
        })
        console.log(`   ✅ ${role.name} - DASHBOARD_VIEW assigned`)
      } catch (error: any) {
        if (error.code === 'P2002') {
          console.log(`   ℹ️  ${role.name} - already assigned (duplicate key)`)
        } else {
          console.log(`   ❌ ${role.name} - error: ${error.message}`)
        }
      }
    }
  }
  
  console.log('')
  console.log('🎉 Setup complete!')
  console.log('')
  console.log('📋 Next steps:')
  console.log('   1. Admin must logout and login again to refresh capabilities')
  console.log('   2. After login, admin@dsm.com will see Dashboard in sidebar')
  console.log('   3. Admin can access http://localhost:3000/dashboard')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

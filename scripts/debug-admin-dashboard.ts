import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Debugging admin@dsm.com Dashboard access...\n')
  
  // 1. Check user and roles
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
    console.log('❌ admin@dsm.com not found in database')
    return
  }
  
  console.log('✅ User found:', admin.email)
  console.log(`   Active: ${admin.isActive}`)
  console.log('')
  
  // 2. Check roles
  console.log('📋 User Roles:')
  if (admin.userRoles.length === 0) {
    console.log('   ❌ NO ROLES ASSIGNED!')
    console.log('')
    console.log('💡 Solution: Assign a role to admin@dsm.com')
    return
  }
  
  admin.userRoles.forEach(ur => {
    console.log(`   • ${ur.role.name} (${ur.role.displayName})`)
    console.log(`     Active: ${ur.isActive}`)
  })
  console.log('')
  
  // 3. Check capabilities
  console.log('🔑 Capabilities:')
  
  const allCapabilities = admin.userRoles.flatMap(ur =>
    ur.role.capabilityAssignments.map(ca => ca.capability.name)
  )
  
  const uniqueCaps = [...new Set(allCapabilities)]
  
  if (uniqueCaps.length === 0) {
    console.log('   ❌ NO CAPABILITIES!')
  } else {
    uniqueCaps.forEach(cap => {
      if (cap === 'DASHBOARD_VIEW') {
        console.log(`   ✅ ${cap}`)
      } else {
        console.log(`   • ${cap}`)
      }
    })
  }
  console.log('')
  
  const hasDashboard = uniqueCaps.includes('DASHBOARD_VIEW')
  
  if (!hasDashboard) {
    console.log('❌ MISSING DASHBOARD_VIEW capability!')
    console.log('')
    console.log('🔧 Fixing now...')
    console.log('')
    
    const dashboardCap = await prisma.roleCapability.findUnique({
      where: { name: 'DASHBOARD_VIEW' }
    })
    
    if (!dashboardCap) {
      console.log('❌ DASHBOARD_VIEW capability does not exist in database!')
      console.log('   Run: npx tsx scripts/complete-dashboard-setup.ts')
      return
    }
    
    // Assign to all admin roles
    for (const ur of admin.userRoles) {
      try {
        await prisma.roleCapabilityAssignment.create({
          data: {
            roleId: ur.role.id,
            capabilityId: dashboardCap.id
          }
        })
        console.log(`✅ Assigned DASHBOARD_VIEW to ${ur.role.name}`)
      } catch (error: any) {
        if (error.code === 'P2002') {
          console.log(`ℹ️  ${ur.role.name} already has assignment (duplicate)`)
        }
      }
    }
    
    console.log('')
    console.log('✅ Fixed! Now:')
    console.log('   1. Logout from admin@dsm.com')
    console.log('   2. Login again')
    console.log('   3. Dashboard should be accessible')
  } else {
    console.log('✅ User HAS DASHBOARD_VIEW capability')
    console.log('')
    console.log('🔍 Checking if user logged out and back in...')
    console.log('')
    console.log('⚠️  If still cannot access:')
    console.log('   1. Make sure you LOGGED OUT completely')
    console.log('   2. Clear browser cache (Cmd+Shift+Delete)')
    console.log('   3. Login again as admin@dsm.com')
    console.log('   4. Check browser console for errors (F12)')
    console.log('')
    console.log('🔍 Checking Dashboard route protection...')
    
    const dashboard = await prisma.resource.findFirst({
      where: {
        type: 'route',
        path: '/dashboard'
      }
    })
    
    if (dashboard) {
      console.log(`   Route capability: ${dashboard.requiredCapability || '(none)'}`)
      
      if (dashboard.requiredCapability !== 'DASHBOARD_VIEW') {
        console.log('   ⚠️  Route has wrong capability!')
        console.log('   Fixing...')
        
        await prisma.resource.update({
          where: { id: dashboard.id },
          data: { requiredCapability: 'DASHBOARD_VIEW' }
        })
        
        console.log('   ✅ Fixed route capability')
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

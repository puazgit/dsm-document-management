import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Force Refresh: Ensuring admin has DASHBOARD_VIEW\n')
  
  // 1. Get admin user
  const admin = await prisma.user.findUnique({
    where: { email: 'admin@dsm.com' },
    include: {
      userRoles: {
        where: { isActive: true },
        include: {
          role: true
        }
      }
    }
  })
  
  if (!admin) {
    console.log('❌ admin@dsm.com not found')
    return
  }
  
  console.log('✅ Found admin@dsm.com')
  console.log(`   Roles: ${admin.userRoles.map(ur => ur.role.name).join(', ')}`)
  console.log('')
  
  // 2. Get or create DASHBOARD_VIEW capability
  const capability = await prisma.roleCapability.upsert({
    where: { name: 'DASHBOARD_VIEW' },
    update: {},
    create: {
      name: 'DASHBOARD_VIEW',
      description: 'View and access the main dashboard',
      category: 'dashboard'
    }
  })
  
  console.log(`✅ DASHBOARD_VIEW capability: ${capability.id}`)
  console.log('')
  
  // 3. Assign to ALL admin roles (force upsert)
  console.log('🔧 Assigning to all admin roles...')
  console.log('')
  
  for (const userRole of admin.userRoles) {
    const result = await prisma.roleCapabilityAssignment.upsert({
      where: {
        roleId_capabilityId: {
          roleId: userRole.role.id,
          capabilityId: capability.id
        }
      },
      update: {
        assignedAt: new Date() // Force update timestamp
      },
      create: {
        roleId: userRole.role.id,
        capabilityId: capability.id
      }
    })
    
    console.log(`   ✅ ${userRole.role.name} - DASHBOARD_VIEW assigned`)
  }
  
  console.log('')
  console.log('✅ Database updated!')
  console.log('')
  console.log('=' .repeat(60))
  console.log('')
  console.log('⚠️  IMPORTANT: COMPLETE LOGOUT PROCESS')
  console.log('')
  console.log('1. Click Logout button in the app')
  console.log('2. Wait for redirect to login page')
  console.log('3. Open Browser Console (F12)')
  console.log('4. Run these commands:')
  console.log('')
  console.log('   sessionStorage.clear();')
  console.log('   localStorage.clear();')
  console.log('   document.cookie.split(";").forEach(c => {')
  console.log('     document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");')
  console.log('   });')
  console.log('')
  console.log('5. Close ALL browser tabs for localhost:3000')
  console.log('6. Open NEW tab: http://localhost:3000')
  console.log('7. Login as admin@dsm.com')
  console.log('8. Dashboard should now be accessible')
  console.log('')
  console.log('=' .repeat(60))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Comprehensive Dashboard Access Check\n')
  console.log('=' .repeat(60))
  console.log('')
  
  // 1. Check admin user
  const admin = await prisma.user.findUnique({
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
  
  if (!admin) {
    console.log('❌ admin@dsm.com NOT FOUND')
    return
  }
  
  console.log('👤 USER INFO:')
  console.log(`   Email: ${admin.email}`)
  console.log(`   Active: ${admin.isActive}`)
  console.log(`   Roles Count: ${admin.userRoles.length}`)
  console.log('')
  
  // 2. List roles and their capabilities
  console.log('📋 ROLES & CAPABILITIES:')
  console.log('')
  
  let hasDashboardView = false
  
  for (const userRole of admin.userRoles) {
    const role = userRole.role
    console.log(`   Role: ${role.name}`)
    console.log(`   Display Name: ${role.displayName}`)
    console.log(`   Active: ${userRole.isActive}`)
    console.log(`   Capabilities (${role.capabilityAssignments.length}):`)
    
    if (role.capabilityAssignments.length === 0) {
      console.log('      (none)')
    } else {
      role.capabilityAssignments.forEach(ca => {
        const marker = ca.capability.name === 'DASHBOARD_VIEW' ? '✅' : '  '
        console.log(`      ${marker} ${ca.capability.name}`)
        if (ca.capability.name === 'DASHBOARD_VIEW') {
          hasDashboardView = true
        }
      })
    }
    console.log('')
  }
  
  console.log('=' .repeat(60))
  console.log('')
  
  if (!hasDashboardView) {
    console.log('❌ PROBLEM: Admin does NOT have DASHBOARD_VIEW capability!')
    console.log('')
    console.log('🔧 FIXING NOW...')
    console.log('')
    
    const cap = await prisma.roleCapability.findUnique({
      where: { name: 'DASHBOARD_VIEW' }
    })
    
    if (!cap) {
      console.log('❌ DASHBOARD_VIEW capability not in database!')
      return
    }
    
    for (const userRole of admin.userRoles) {
      await prisma.roleCapabilityAssignment.upsert({
        where: {
          roleId_capabilityId: {
            roleId: userRole.role.id,
            capabilityId: cap.id
          }
        },
        create: {
          roleId: userRole.role.id,
          capabilityId: cap.id
        },
        update: {}
      })
      console.log(`✅ Assigned DASHBOARD_VIEW to ${userRole.role.name}`)
    }
    
    console.log('')
    console.log('✅ FIXED! MUST LOGOUT AND LOGIN AGAIN!')
  } else {
    console.log('✅ Admin HAS DASHBOARD_VIEW in database')
    console.log('')
    console.log('🔍 Since you already logged out/in, checking other issues...')
    console.log('')
    
    // Check if session is loading capabilities correctly
    console.log('📝 CHECKLIST:')
    console.log('')
    console.log('1. Open browser console (F12)')
    console.log('2. Check for errors in console')
    console.log('3. Run this in console:')
    console.log('')
    console.log('   sessionStorage.clear(); localStorage.clear();')
    console.log('')
    console.log('4. Then logout and login again')
    console.log('')
    console.log('5. After login, check session in console:')
    console.log('')
    console.log('   fetch("/api/auth/session").then(r=>r.json()).then(console.log)')
    console.log('')
    console.log('6. Look for "capabilities" array in the response')
    console.log('   Should contain "DASHBOARD_VIEW"')
    console.log('')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

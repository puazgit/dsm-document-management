import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Testing capability loading logic (simulate JWT callback)\n')
  
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
    console.log('❌ User not found')
    return
  }
  
  console.log('✅ User:', admin.email)
  console.log('')
  
  // Get primary role
  const primaryRole = admin.userRoles?.[0]?.role?.name || 'user'
  console.log('📋 Primary Role:', primaryRole)
  console.log('')
  
  // Check if special admin handling
  if (primaryRole === 'admin') {
    console.log('⚠️  User has "admin" role - SPECIAL HANDLING')
    console.log('   next-auth.ts grants ALL capabilities to admin role')
    console.log('')
    console.log('✅ Expected capabilities: [ALL CAPABILITIES]')
    console.log('   Including: DASHBOARD_VIEW')
  } else {
    console.log('📊 Regular user - Loading from database')
    console.log('')
    
    const capabilities = admin.userRoles.flatMap(userRole =>
      userRole.role.capabilityAssignments.map(ca => ca.capability.name)
    )
    
    const uniqueCapabilities = [...new Set(capabilities)]
    
    console.log(`✅ Capabilities loaded: ${uniqueCapabilities.length}`)
    uniqueCapabilities.forEach(cap => {
      const marker = cap === 'DASHBOARD_VIEW' ? '✅' : '  '
      console.log(`   ${marker} ${cap}`)
    })
    
    if (!uniqueCapabilities.includes('DASHBOARD_VIEW')) {
      console.log('')
      console.log('❌ DASHBOARD_VIEW NOT FOUND!')
    }
  }
  
  console.log('')
  console.log('🔍 Checking what role name is stored...')
  
  // Check what would be stored as role in JWT
  const storedRole = admin.userRoles?.[0]?.role?.name || admin.groupId || 'user'
  console.log(`   JWT will store role as: "${storedRole}"`)
  console.log('')
  
  if (storedRole === 'admin') {
    console.log('✅ This will trigger admin special case')
  } else {
    console.log('⚠️  This will NOT trigger admin special case')
    console.log('   Capabilities must be loaded from database')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

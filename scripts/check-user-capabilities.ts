import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Checking capabilities for tik@dsm.com...\n')
  
  const user = await prisma.user.findUnique({
    where: { email: 'tik@dsm.com' },
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
    console.log('❌ User not found')
    return
  }
  
  console.log('👤 User:', user.email)
  console.log('📋 Roles:', user.userRoles.map(ur => ur.role.name).join(', '))
  console.log('')
  
  const capabilities = user.userRoles.flatMap(ur =>
    ur.role.capabilityAssignments.map(ca => ca.capability.name)
  )
  
  const uniqueCapabilities = [...new Set(capabilities)]
  
  console.log('🔑 Capabilities assigned to user:')
  if (uniqueCapabilities.length === 0) {
    console.log('   (none)')
  } else {
    uniqueCapabilities.forEach(cap => {
      console.log(`   • ${cap}`)
    })
  }
  
  console.log(`\n✅ Total unique capabilities: ${uniqueCapabilities.length}`)
  
  // Check if USER_MANAGE is present
  if (uniqueCapabilities.includes('USER_MANAGE')) {
    console.log('✅ USER_MANAGE capability found - should have access to /admin/users')
  } else {
    console.log('❌ USER_MANAGE capability NOT found - will not have access to /admin/users')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Checking tik@dsm.com Dashboard access...\n')
  
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
  
  const hasDashboardView = uniqueCapabilities.includes('DASHBOARD_VIEW')
  
  console.log('🔑 Capabilities:', uniqueCapabilities.length)
  console.log('')
  console.log(`DASHBOARD_VIEW: ${hasDashboardView ? '✅ YES' : '❌ NO'}`)
  console.log('')
  
  if (hasDashboardView) {
    console.log('⚠️  User HAS DASHBOARD_VIEW capability')
    console.log('   This is why they can access /dashboard')
    console.log('')
    console.log('💡 To block access:')
    console.log('   1. Go to http://localhost:3000/admin/rbac/assignments')
    console.log('   2. Find the role: ' + user.userRoles[0]?.role.name)
    console.log('   3. Uncheck DASHBOARD_VIEW capability')
    console.log('   4. Save changes')
    console.log('   5. User must logout and login again')
  } else {
    console.log('✅ User does NOT have DASHBOARD_VIEW')
    console.log('   They should NOT be able to access /dashboard')
    console.log('')
    console.log('🔍 Checking if dashboard page is protected...')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

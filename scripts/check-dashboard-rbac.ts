import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Checking Dashboard navigation setup...\n')
  
  const dashboard = await prisma.resource.findFirst({
    where: {
      type: 'navigation',
      path: '/dashboard'
    }
  })
  
  if (!dashboard) {
    console.log('❌ Dashboard navigation not found')
    return
  }
  
  console.log('📋 Dashboard Navigation:')
  console.log(`   ID: ${dashboard.id}`)
  console.log(`   Name: ${dashboard.name}`)
  console.log(`   Path: ${dashboard.path}`)
  console.log(`   Icon: ${dashboard.icon}`)
  console.log(`   Required Capability: ${dashboard.requiredCapability || '(none)'}`)
  console.log(`   Active: ${dashboard.isActive}`)
  console.log('')
  
  if (!dashboard.requiredCapability) {
    console.log('⚠️  Dashboard has NO required capability')
    console.log('   This means everyone with access to navigation can see it')
    console.log('')
    console.log('💡 To add RBAC control:')
    console.log('   1. Create a capability (e.g., DASHBOARD_VIEW)')
    console.log('   2. Assign capability to Dashboard navigation')
    console.log('   3. Assign capability to roles in /admin/rbac/assignments')
  } else {
    console.log('✅ Dashboard has required capability:', dashboard.requiredCapability)
    
    // Check if capability exists
    const capability = await prisma.roleCapability.findFirst({
      where: { name: dashboard.requiredCapability }
    })
    
    if (capability) {
      console.log('✅ Capability exists in database')
      
      // Check role assignments
      const assignments = await prisma.roleCapabilityAssignment.findMany({
        where: { capabilityId: capability.id },
        include: {
          role: { select: { name: true, displayName: true } }
        }
      })
      
      console.log(`\n📊 Roles with ${dashboard.requiredCapability}:`)
      if (assignments.length === 0) {
        console.log('   (none)')
      } else {
        assignments.forEach(a => {
          console.log(`   • ${a.role.displayName} (${a.role.name})`)
        })
      }
    } else {
      console.log('❌ Capability does NOT exist in database')
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

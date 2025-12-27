import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Checking Dashboard resources in database...\n')
  
  // Get all Dashboard-related resources
  const resources = await prisma.resource.findMany({
    where: {
      OR: [
        { path: '/dashboard' },
        { name: { contains: 'Dashboard' } }
      ]
    },
    orderBy: { type: 'asc' }
  })
  
  console.log('📋 Dashboard Resources:\n')
  
  resources.forEach(resource => {
    console.log(`Type: ${resource.type.toUpperCase()}`)
    console.log(`  ID: ${resource.id}`)
    console.log(`  Name: ${resource.name}`)
    console.log(`  Path: ${resource.path}`)
    console.log(`  Required Capability: ${resource.requiredCapability || '(none)'}`)
    console.log(`  Description: ${resource.description || '(none)'}`)
    console.log(`  Active: ${resource.isActive}`)
    console.log('')
  })
  
  console.log('💡 Explanation:\n')
  console.log('NAVIGATION (nav-dashboard):')
  console.log('  • Controls sidebar menu visibility')
  console.log('  • If user lacks capability → menu item hidden')
  console.log('  • Purpose: UI navigation control')
  console.log('')
  console.log('ROUTE (route-dashboard):')
  console.log('  • Controls actual page access')
  console.log('  • If user lacks capability → redirect to unauthorized')
  console.log('  • Purpose: Page-level access control')
  console.log('')
  console.log('🎯 Both should have SAME capability for consistency:')
  console.log('  • Navigation: Hide menu if no access')
  console.log('  • Route: Block direct URL access if no capability')
  console.log('')
  
  // Check if both have same capability
  const nav = resources.find(r => r.type === 'navigation')
  const route = resources.find(r => r.type === 'route')
  
  if (nav && route) {
    if (nav.requiredCapability === route.requiredCapability) {
      console.log('✅ Consistent: Both have same capability')
    } else {
      console.log('⚠️  Inconsistent:')
      console.log(`   Navigation: ${nav.requiredCapability || '(none)'}`)
      console.log(`   Route: ${route.requiredCapability || '(none)'}`)
      console.log('')
      console.log('💡 Recommendation: Set both to same capability')
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

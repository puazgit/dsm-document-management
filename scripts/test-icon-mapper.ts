import { PrismaClient } from '@prisma/client'
import { getIconComponent } from '@/lib/icon-mapper'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Testing icon mapping with real navigation data...\n')
  
  // Get navigation items
  const navItems = await prisma.resource.findMany({
    where: {
      type: 'navigation',
      isActive: true
    },
    orderBy: {
      sortOrder: 'asc'
    },
    select: {
      id: true,
      name: true,
      icon: true,
      path: true
    }
  })
  
  console.log('📋 Navigation Items from Database:\n')
  
  navItems.forEach(item => {
    console.log(`   ${item.name}`)
    console.log(`     Icon String: "${item.icon || '(null)'}"`)
    
    // Test icon mapper
    try {
      const IconComponent = getIconComponent(item.icon)
      console.log(`     Icon Component: ${IconComponent ? IconComponent.displayName || IconComponent.name || 'Component' : 'null'}`)
      console.log(`     Type: ${typeof IconComponent}`)
    } catch (error: any) {
      console.log(`     ❌ Error: ${error.message}`)
    }
    console.log('')
  })
  
  // Test specific icons
  console.log('\n🧪 Testing specific icon mappings:\n')
  
  const testCases = [
    'LayoutDashboard',
    'FileText',
    'Users',
    'Shield',
    'BarChart3',
    'Settings',
    null,
    undefined,
    'InvalidIcon'
  ]
  
  testCases.forEach(iconName => {
    try {
      const Icon = getIconComponent(iconName as any)
      console.log(`   "${iconName}": ${Icon ? '✅ ' + (Icon.displayName || Icon.name || 'Component') : '❌ null'}`)
    } catch (error: any) {
      console.log(`   "${iconName}": ❌ Error - ${error.message}`)
    }
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

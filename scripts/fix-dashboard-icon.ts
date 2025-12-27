import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Checking Dashboard in navigation and routes...\n')
  
  // Check navigation items
  const navItems = await prisma.resource.findMany({
    where: {
      type: 'navigation',
      OR: [
        { name: { contains: 'Dashboard', mode: 'insensitive' } },
        { path: '/dashboard' }
      ]
    }
  })
  
  console.log('📋 Navigation Items:')
  if (navItems.length === 0) {
    console.log('   No Dashboard navigation found')
  } else {
    navItems.forEach(item => {
      console.log(`   • ${item.name}`)
      console.log(`     ID: ${item.id}`)
      console.log(`     Path: ${item.path}`)
      console.log(`     Icon: ${item.icon || '(null)'}`)
      console.log(`     Sort: ${item.sortOrder}`)
      console.log('')
    })
  }
  
  // Check route items
  const routeItems = await prisma.resource.findMany({
    where: {
      type: 'route',
      OR: [
        { name: { contains: 'Dashboard', mode: 'insensitive' } },
        { path: '/dashboard' }
      ]
    }
  })
  
  console.log('📋 Route Items:')
  if (routeItems.length === 0) {
    console.log('   No Dashboard routes found')
  } else {
    routeItems.forEach(item => {
      console.log(`   • ${item.name}`)
      console.log(`     ID: ${item.id}`)
      console.log(`     Path: ${item.path}`)
      console.log(`     Icon: ${item.icon || '(null)'}`)
      console.log('')
    })
  }
  
  // Update navigation Dashboard icon
  console.log('\n💡 Updating Dashboard navigation icon to "LayoutDashboard"...')
  
  const updateResult = await prisma.resource.updateMany({
    where: {
      type: 'navigation',
      OR: [
        { name: { contains: 'Dashboard', mode: 'insensitive' } },
        { path: '/dashboard' }
      ]
    },
    data: {
      icon: 'LayoutDashboard'
    }
  })
  
  console.log(`✅ Updated ${updateResult.count} navigation item(s)`)
  
  // Verify
  const updated = await prisma.resource.findMany({
    where: {
      type: 'navigation',
      icon: 'LayoutDashboard'
    },
    select: {
      name: true,
      icon: true
    }
  })
  
  console.log('\n✅ Verification:')
  updated.forEach(item => {
    console.log(`   • ${item.name}: ${item.icon}`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

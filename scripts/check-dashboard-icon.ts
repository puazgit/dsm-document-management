import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Checking Dashboard resource icon...\n')
  
  const dashboard = await prisma.resource.findFirst({
    where: {
      OR: [
        { path: '/dashboard' },
        { name: 'Dashboard' }
      ]
    }
  })
  
  if (!dashboard) {
    console.log('❌ Dashboard resource not found')
    return
  }
  
  console.log('📋 Dashboard Resource:')
  console.log(`   ID: ${dashboard.id}`)
  console.log(`   Name: ${dashboard.name}`)
  console.log(`   Path: ${dashboard.path}`)
  console.log(`   Icon: ${dashboard.icon}`)
  console.log(`   Type: ${dashboard.type}`)
  
  if (dashboard.icon === 'layout-dashboard') {
    console.log('\n⚠️  Issue Found: Icon name is "layout-dashboard" (kebab-case)')
    console.log('   Lucide expects PascalCase: "LayoutDashboard"')
    console.log('\n💡 Fix: Update to "LayoutDashboard"')
  } else if (dashboard.icon === 'LayoutDashboard') {
    console.log('\n✅ Icon name is correct: "LayoutDashboard"')
  } else {
    console.log(`\n⚠️  Icon is: "${dashboard.icon}"`)
    console.log('   Expected: "LayoutDashboard"')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

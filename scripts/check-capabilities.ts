import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Checking DASHBOARD_VIEW capability in database...\n')
  
  // Check if capability exists
  const capability = await prisma.roleCapability.findUnique({
    where: { name: 'DASHBOARD_VIEW' }
  })
  
  if (!capability) {
    console.log('❌ DASHBOARD_VIEW capability NOT FOUND in database')
    console.log('   Creating now...\n')
    
    const newCap = await prisma.roleCapability.create({
      data: {
        name: 'DASHBOARD_VIEW',
        description: 'View and access the main dashboard',
        category: 'dashboard'
      }
    })
    
    console.log('✅ Created DASHBOARD_VIEW capability')
    console.log(`   ID: ${newCap.id}`)
    console.log('')
  } else {
    console.log('✅ DASHBOARD_VIEW exists:')
    console.log(`   ID: ${capability.id}`)
    console.log(`   Name: ${capability.name}`)
    console.log(`   Description: ${capability.description}`)
    console.log(`   Category: ${capability.category}`)
    console.log('')
  }
  
  // Check all capabilities
  const allCapabilities = await prisma.roleCapability.findMany({
    orderBy: { category: 'asc' }
  })
  
  console.log(`📊 Total capabilities in database: ${allCapabilities.length}`)
  console.log('')
  
  console.log('📋 All capabilities:')
  allCapabilities.forEach(cap => {
    console.log(`   • ${cap.name} (${cap.category || 'general'})`)
  })
  console.log('')
  
  // Check assignments
  const dashboardCap = capability || allCapabilities.find(c => c.name === 'DASHBOARD_VIEW')
  
  if (dashboardCap) {
    const assignments = await prisma.roleCapabilityAssignment.findMany({
      where: { capabilityId: dashboardCap.id },
      include: {
        role: { select: { name: true } }
      }
    })
    
    console.log(`📊 DASHBOARD_VIEW assignments: ${assignments.length}`)
    if (assignments.length > 0) {
      assignments.forEach(a => {
        console.log(`   • ${a.role.name}`)
      })
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

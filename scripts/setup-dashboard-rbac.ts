import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Setting up Dashboard RBAC control...\n')
  
  // 1. Create DASHBOARD_VIEW capability if not exists
  console.log('Step 1: Creating DASHBOARD_VIEW capability...')
  
  const capability = await prisma.roleCapability.upsert({
    where: { name: 'DASHBOARD_VIEW' },
    update: {},
    create: {
      name: 'DASHBOARD_VIEW',
      description: 'View and access the main dashboard',
      category: 'dashboard'
    }
  })
  
  console.log(`✅ Capability created/found: ${capability.name}`)
  console.log('')
  
  // 2. Assign capability to Dashboard navigation
  console.log('Step 2: Assigning capability to Dashboard navigation...')
  
  const dashboard = await prisma.resource.updateMany({
    where: {
      type: 'navigation',
      path: '/dashboard'
    },
    data: {
      requiredCapability: 'DASHBOARD_VIEW'
    }
  })
  
  console.log(`✅ Updated ${dashboard.count} navigation item(s)`)
  console.log('')
  
  // 3. Assign capability to all existing roles (default access)
  console.log('Step 3: Assigning DASHBOARD_VIEW to all active roles...')
  
  const roles = await prisma.role.findMany({
    where: { isActive: true },
    select: { id: true, name: true, displayName: true }
  })
  
  let assignedCount = 0
  
  for (const role of roles) {
    try {
      await prisma.roleCapabilityAssignment.upsert({
        where: {
          roleId_capabilityId: {
            roleId: role.id,
            capabilityId: capability.id
          }
        },
        update: {},
        create: {
          roleId: role.id,
          capabilityId: capability.id
        }
      })
      console.log(`   ✅ ${role.displayName}`)
      assignedCount++
    } catch (error) {
      console.log(`   ⚠️  ${role.displayName} - already assigned or error`)
    }
  }
  
  console.log(`\n✅ Assigned to ${assignedCount} roles`)
  console.log('')
  
  // 4. Verify setup
  console.log('Step 4: Verification...')
  
  const dashboardNav = await prisma.resource.findFirst({
    where: {
      type: 'navigation',
      path: '/dashboard'
    }
  })
  
  const assignments = await prisma.roleCapabilityAssignment.count({
    where: { capabilityId: capability.id }
  })
  
  console.log(`✅ Dashboard navigation: requiredCapability = ${dashboardNav?.requiredCapability}`)
  console.log(`✅ Total role assignments: ${assignments}`)
  console.log('')
  
  console.log('🎉 Setup complete!')
  console.log('')
  console.log('📋 Next steps:')
  console.log('   1. Go to http://localhost:3000/admin/rbac/assignments')
  console.log('   2. You will see DASHBOARD_VIEW in the capability matrix')
  console.log('   3. Uncheck roles to control who can see Dashboard menu')
  console.log('   4. Users without DASHBOARD_VIEW will not see Dashboard in sidebar')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

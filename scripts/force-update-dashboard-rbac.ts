import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Checking and fixing Dashboard RBAC...\n')
  
  // Find Dashboard navigation
  const dashboard = await prisma.resource.findFirst({
    where: {
      type: 'navigation',
      OR: [
        { path: '/dashboard' },
        { name: 'Dashboard' }
      ]
    }
  })
  
  if (!dashboard) {
    console.log('❌ Dashboard not found')
    return
  }
  
  console.log('📋 Found Dashboard:')
  console.log(`   ID: ${dashboard.id}`)
  console.log(`   Name: ${dashboard.name}`)
  console.log(`   Current capability: ${dashboard.requiredCapability || '(null)'}`)
  console.log('')
  
  // Find or create capability
  const capability = await prisma.roleCapability.upsert({
    where: { name: 'DASHBOARD_VIEW' },
    update: {},
    create: {
      name: 'DASHBOARD_VIEW',
      description: 'View and access the main dashboard',
      category: 'dashboard'
    }
  })
  
  console.log(`✅ Capability: ${capability.name} (ID: ${capability.id})`)
  console.log('')
  
  // Update Dashboard with capability
  console.log('🔧 Updating Dashboard navigation...')
  
  const updated = await prisma.resource.update({
    where: { id: dashboard.id },
    data: {
      requiredCapability: 'DASHBOARD_VIEW'
    }
  })
  
  console.log(`✅ Updated: requiredCapability = ${updated.requiredCapability}`)
  console.log('')
  
  // Assign to all roles
  console.log('🔧 Assigning DASHBOARD_VIEW to all roles...')
  
  const roles = await prisma.role.findMany({
    where: { isActive: true }
  })
  
  for (const role of roles) {
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
    console.log(`   ✅ ${role.name}`)
  }
  
  console.log('')
  console.log('🎉 Setup complete!')
  console.log('')
  console.log('📋 What changed:')
  console.log('   • Dashboard navigation now requires DASHBOARD_VIEW capability')
  console.log('   • All active roles have been assigned DASHBOARD_VIEW by default')
  console.log('   • You can now control Dashboard visibility in /admin/rbac/assignments')
  console.log('')
  console.log('🔄 Next steps:')
  console.log('   1. Refresh http://localhost:3000/admin/rbac/assignments')
  console.log('   2. You\'ll see DASHBOARD_VIEW in the capability matrix')
  console.log('   3. Uncheck a role to hide Dashboard menu for that role')
  console.log('   4. Users with that role will not see Dashboard in sidebar')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

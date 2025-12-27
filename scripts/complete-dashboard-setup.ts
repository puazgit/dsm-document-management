import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Complete Dashboard RBAC setup...\n')
  
  // 1. Get DASHBOARD_VIEW capability
  const capability = await prisma.roleCapability.findUnique({
    where: { name: 'DASHBOARD_VIEW' }
  })
  
  if (!capability) {
    console.log('❌ DASHBOARD_VIEW not found')
    return
  }
  
  console.log('✅ Found DASHBOARD_VIEW capability')
  console.log(`   ID: ${capability.id}\n`)
  
  // 2. Assign to ALL active roles
  console.log('Step 1: Assigning DASHBOARD_VIEW to all active roles...\n')
  
  const roles = await prisma.role.findMany({
    where: { isActive: true }
  })
  
  for (const role of roles) {
    try {
      await prisma.roleCapabilityAssignment.create({
        data: {
          roleId: role.id,
          capabilityId: capability.id
        }
      })
      console.log(`   ✅ ${role.displayName} (${role.name})`)
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log(`   ℹ️  ${role.displayName} - already assigned`)
      } else {
        console.log(`   ❌ ${role.displayName} - error: ${error.message}`)
      }
    }
  }
  
  console.log('')
  
  // 3. Update Dashboard navigation
  console.log('Step 2: Updating Dashboard navigation...\n')
  
  const updateResult = await prisma.resource.updateMany({
    where: {
      type: 'navigation',
      path: '/dashboard'
    },
    data: {
      requiredCapability: 'DASHBOARD_VIEW'
    }
  })
  
  console.log(`✅ Updated ${updateResult.count} navigation item(s)`)
  console.log('')
  
  // 4. Verify
  console.log('Step 3: Verification...\n')
  
  const dashboard = await prisma.resource.findFirst({
    where: {
      type: 'navigation',
      path: '/dashboard'
    }
  })
  
  const assignments = await prisma.roleCapabilityAssignment.count({
    where: { capabilityId: capability.id }
  })
  
  console.log('✅ Dashboard navigation:')
  console.log(`   Path: ${dashboard?.path}`)
  console.log(`   Required Capability: ${dashboard?.requiredCapability}`)
  console.log('')
  console.log(`✅ Total role assignments: ${assignments}`)
  console.log('')
  
  console.log('🎉 Setup complete!')
  console.log('')
  console.log('📋 Next steps:')
  console.log('   1. Hard refresh: http://localhost:3000/admin/rbac/assignments')
  console.log('      Press: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)')
  console.log('   2. You should see DASHBOARD_VIEW in the capability matrix')
  console.log('   3. All roles currently have DASHBOARD_VIEW checked')
  console.log('   4. Uncheck a role to test hiding Dashboard from that role')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

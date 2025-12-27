import { PrismaClient } from '@prisma/client'
import { UnifiedAccessControl } from '../src/lib/unified-access-control'

const prisma = new PrismaClient()

async function testAdminNavigation() {
  console.log('🔍 Testing Admin User Navigation\n')
  
  // Find admin user
  const adminUserRole = await prisma.userRole.findFirst({
    where: {
      isActive: true,
      role: {
        name: {
          in: ['admin', 'ppd.pusat'] // admin or ppd.pusat with PERMISSION_MANAGE
        }
      }
    },
    include: {
      user: true,
      role: true
    }
  })
  
  if (!adminUserRole) {
    console.log('❌ No admin user found')
    return
  }
  
  console.log(`✅ Admin User: ${adminUserRole.user.email}`)
  console.log(`   Role: ${adminUserRole.role.name} (Level ${adminUserRole.role.level})`)
  
  // Get navigation for this user
  const navigation = await UnifiedAccessControl.getNavigationForUser(adminUserRole.user.id)
  
  console.log(`\n📋 Navigation Items: ${navigation.length} items\n`)
  
  // Find Admin menu
  const adminMenu = navigation.find(n => n.id === 'nav-admin')
  if (adminMenu) {
    console.log('✅ Admin menu found:')
    console.log(`   - ${adminMenu.name} (${adminMenu.path})`)
    console.log(`   - Children: ${adminMenu.children?.length || 0}`)
    
    if (adminMenu.children && adminMenu.children.length > 0) {
      console.log('\n   Submenu items:')
      adminMenu.children.forEach(child => {
        console.log(`   - ${child.name} (${child.path})`)
        
        // Check for RBAC submenu
        if (child.id === 'nav-admin-rbac' && child.children) {
          console.log('\n   ✅ RBAC Management submenu found:')
          child.children.forEach(rbacChild => {
            console.log(`      - ${rbacChild.name} (${rbacChild.path})`)
          })
        }
      })
    }
  } else {
    console.log('❌ Admin menu NOT found in navigation')
  }
  
  // Check capabilities
  const hasPerm = await UnifiedAccessControl.hasCapability(adminUserRole.user.id, 'PERMISSION_MANAGE')
  const hasRole = await UnifiedAccessControl.hasCapability(adminUserRole.user.id, 'ROLE_MANAGE')
  
  console.log(`\n🔐 Capabilities Check:`)
  console.log(`   PERMISSION_MANAGE: ${hasPerm ? '✅' : '❌'}`)
  console.log(`   ROLE_MANAGE: ${hasRole ? '✅' : '❌'}`)
  
  await prisma.$disconnect()
}

testAdminNavigation()
  .then(() => {
    console.log('\n✅ Test completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })

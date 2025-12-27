import { PrismaClient } from '@prisma/client'
import { UnifiedAccessControl } from '../src/lib/unified-access-control'

const prisma = new PrismaClient()

async function testNestedNavigation() {
  console.log('🔍 Testing Nested Navigation Structure\n')
  
  // Find admin user
  const adminUserRole = await prisma.userRole.findFirst({
    where: {
      isActive: true,
      role: { name: 'admin' }
    },
    include: { user: true, role: true }
  })
  
  if (!adminUserRole) {
    console.log('❌ No admin user found')
    return
  }
  
  console.log(`✅ Testing with: ${adminUserRole.user.email}\n`)
  
  // Get navigation
  const navigation = await UnifiedAccessControl.getNavigationForUser(adminUserRole.user.id)
  
  // Find Admin menu
  const adminMenu = navigation.find(n => n.id === 'nav-admin')
  
  if (!adminMenu) {
    console.log('❌ Admin menu not found')
    return
  }
  
  console.log(`✅ Admin Menu: ${adminMenu.name}`)
  console.log(`   Children: ${adminMenu.children?.length || 0}\n`)
  
  // Find RBAC Management submenu
  const rbacMenu = adminMenu.children?.find((c: any) => c.id === 'nav-admin-rbac')
  
  if (!rbacMenu) {
    console.log('❌ RBAC Management submenu NOT FOUND')
    console.log('\n📋 Available submenus:')
    adminMenu.children?.forEach((child: any) => {
      console.log(`   - ${child.id}: ${child.name} (${child.path})`)
    })
  } else {
    console.log(`✅ RBAC Management Submenu: ${rbacMenu.name}`)
    console.log(`   Path: ${rbacMenu.path}`)
    console.log(`   Has children: ${rbacMenu.children ? 'YES' : 'NO'}`)
    console.log(`   Children count: ${rbacMenu.children?.length || 0}`)
    
    if (rbacMenu.children && rbacMenu.children.length > 0) {
      console.log('\n   📂 RBAC Management children:')
      rbacMenu.children.forEach((child: any) => {
        console.log(`      ✓ ${child.name} (${child.path})`)
      })
    } else {
      console.log('\n   ⚠️  RBAC Management has NO children!')
    }
  }
  
  console.log('\n📊 Full Navigation Tree:')
  navigation.forEach(item => {
    console.log(`\n${item.name} (${item.path})`)
    if (item.children) {
      item.children.forEach((child: any) => {
        console.log(`  ├─ ${child.name} (${child.path})`)
        if (child.children) {
          child.children.forEach((grandchild: any) => {
            console.log(`  │  ├─ ${grandchild.name} (${grandchild.path})`)
          })
        }
      })
    }
  })
  
  await prisma.$disconnect()
}

testNestedNavigation()
  .then(() => {
    console.log('\n✅ Test completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })

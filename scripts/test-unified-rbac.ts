import { PrismaClient } from '@prisma/client'
import { UnifiedAccessControl } from '../src/lib/unified-access-control'

const prisma = new PrismaClient()

async function testUnifiedRBAC() {
  console.log('🧪 Testing Unified RBAC System\n')
  console.log('=' .repeat(60))
  
  try {
    // Find test users
    const admin = await prisma.user.findFirst({
      where: { 
        userRoles: {
          some: {
            role: { name: 'admin' }
          }
        }
      },
      include: {
        userRoles: {
          include: { role: true }
        }
      }
    })
    
    const ppdUnit = await prisma.user.findFirst({
      where: { 
        email: 'tik@dsm.com'
      },
      include: {
        userRoles: {
          include: { role: true }
        }
      }
    })
    
    const viewer = await prisma.user.findFirst({
      where: { 
        userRoles: {
          some: {
            role: { name: 'viewer' }
          }
        }
      },
      include: {
        userRoles: {
          include: { role: true }
        }
      }
    })
    
    console.log('\n📋 Test Users Found:')
    if (admin) console.log(`  ✓ Admin: ${admin.email} (${admin.userRoles[0]?.role.name})`)
    if (ppdUnit) console.log(`  ✓ PPD Unit: ${ppdUnit.email} (${ppdUnit.userRoles[0]?.role.name})`)
    if (viewer) console.log(`  ✓ Viewer: ${viewer.email} (${viewer.userRoles[0]?.role.name})`)
    
    if (!admin || !ppdUnit || !viewer) {
      console.log('\n  ⚠️  Some test users not found. Please ensure database is seeded.')
      return
    }
    
    // Test 1: Get User Capabilities
    console.log('\n\n🔑 Test 1: User Capabilities')
    console.log('─'.repeat(60))
    
    const adminCaps = await UnifiedAccessControl.getUserCapabilities(admin.id)
    console.log(`\n Admin capabilities (${adminCaps.length}):`)
    adminCaps.slice(0, 5).forEach(cap => console.log(`   - ${cap}`))
    if (adminCaps.length > 5) console.log(`   ... and ${adminCaps.length - 5} more`)
    
    const ppdUnitCaps = await UnifiedAccessControl.getUserCapabilities(ppdUnit.id)
    console.log(`\n PPD Unit capabilities (${ppdUnitCaps.length}):`)
    ppdUnitCaps.forEach(cap => console.log(`   - ${cap}`))
    
    const viewerCaps = await UnifiedAccessControl.getUserCapabilities(viewer.id)
    console.log(`\n Viewer capabilities (${viewerCaps.length}):`)
    viewerCaps.forEach(cap => console.log(`   - ${cap}`))
    
    // Test 2: Navigation Items
    console.log('\n\n📱 Test 2: Navigation Items')
    console.log('─'.repeat(60))
    
    const adminNav = await UnifiedAccessControl.getNavigationForUser(admin.id)
    console.log(`\n Admin navigation (${adminNav.length} items):`)
    adminNav.forEach(item => {
      console.log(`   📁 ${item.name} (${item.path})`)
      if (item.children) {
        item.children.forEach(child => {
          console.log(`      └─ ${child.name} (${child.path})`)
        })
      }
    })
    
    const ppdUnitNav = await UnifiedAccessControl.getNavigationForUser(ppdUnit.id)
    console.log(`\n PPD Unit navigation (${ppdUnitNav.length} items):`)
    ppdUnitNav.forEach(item => {
      console.log(`   📁 ${item.name} (${item.path})`)
      if (item.children) {
        item.children.forEach(child => {
          console.log(`      └─ ${child.name} (${child.path})`)
        })
      }
    })
    
    const viewerNav = await UnifiedAccessControl.getNavigationForUser(viewer.id)
    console.log(`\n Viewer navigation (${viewerNav.length} items):`)
    viewerNav.forEach(item => {
      console.log(`   📁 ${item.name} (${item.path})`)
      if (item.children) {
        item.children.forEach(child => {
          console.log(`      └─ ${child.name} (${child.path})`)
        })
      }
    })
    
    // Test 3: Route Access
    console.log('\n\n🛣️  Test 3: Route Access Control')
    console.log('─'.repeat(60))
    
    const testRoutes = [
      '/dashboard',
      '/documents',
      '/admin',
      '/admin/users',
      '/analytics',
    ]
    
    console.log('\n Admin route access:')
    for (const route of testRoutes) {
      const hasAccess = await UnifiedAccessControl.canAccessRoute(admin.id, route)
      console.log(`   ${hasAccess ? '✅' : '❌'} ${route}`)
    }
    
    console.log('\n PPD Unit route access:')
    for (const route of testRoutes) {
      const hasAccess = await UnifiedAccessControl.canAccessRoute(ppdUnit.id, route)
      console.log(`   ${hasAccess ? '✅' : '❌'} ${route}`)
    }
    
    console.log('\n Viewer route access:')
    for (const route of testRoutes) {
      const hasAccess = await UnifiedAccessControl.canAccessRoute(viewer.id, route)
      console.log(`   ${hasAccess ? '✅' : '❌'} ${route}`)
    }
    
    // Test 4: API Access
    console.log('\n\n🔌 Test 4: API Access Control')
    console.log('─'.repeat(60))
    
    const testAPIs = [
      { path: '/api/documents', method: 'GET' },
      { path: '/api/documents', method: 'POST' },
      { path: '/api/users', method: 'GET' },
      { path: '/api/users', method: 'POST' },
    ]
    
    console.log('\n Admin API access:')
    for (const api of testAPIs) {
      const hasAccess = await UnifiedAccessControl.canAccessAPI(admin.id, api.path, api.method)
      console.log(`   ${hasAccess ? '✅' : '❌'} ${api.method} ${api.path}`)
    }
    
    console.log('\n PPD Unit API access:')
    for (const api of testAPIs) {
      const hasAccess = await UnifiedAccessControl.canAccessAPI(ppdUnit.id, api.path, api.method)
      console.log(`   ${hasAccess ? '✅' : '❌'} ${api.method} ${api.path}`)
    }
    
    console.log('\n Viewer API access:')
    for (const api of testAPIs) {
      const hasAccess = await UnifiedAccessControl.canAccessAPI(viewer.id, api.path, api.method)
      console.log(`   ${hasAccess ? '✅' : '❌'} ${api.method} ${api.path}`)
    }
    
    // Test 5: Specific Capability Checks
    console.log('\n\n✅ Test 5: Capability Checks')
    console.log('─'.repeat(60))
    
    const testCapabilities = [
      'ADMIN_ACCESS',
      'USER_MANAGE',
      'DOCUMENT_VIEW',
      'DOCUMENT_CREATE',
      'DOCUMENT_EDIT',
    ]
    
    console.log('\n PPD Unit (tik@dsm.com) capabilities:')
    for (const cap of testCapabilities) {
      const has = await UnifiedAccessControl.hasCapability(ppdUnit.id, cap)
      console.log(`   ${has ? '✅' : '❌'} ${cap}`)
    }
    
    console.log('\n\n' + '='.repeat(60))
    console.log('✅ All tests completed successfully!')
    console.log('='.repeat(60))
    
  } catch (error) {
    console.error('\n❌ Test failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run tests
testUnifiedRBAC()
  .then(() => {
    console.log('\n✅ Test script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Test script failed:', error)
    process.exit(1)
  })

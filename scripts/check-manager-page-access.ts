import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Define all available routes in the application
const allRoutes = [
  // Dashboard
  { path: '/dashboard', name: 'Dashboard', requiredCap: null },
  
  // Admin routes
  { path: '/admin/users', name: 'User Management', requiredCap: 'USER_MANAGE' },
  { path: '/admin/roles', name: 'Role Management', requiredCap: 'ROLE_MANAGE' },
  { path: '/admin/groups', name: 'Group Management', requiredCap: 'GROUP_MANAGE' },
  { path: '/admin/permissions', name: 'Permission Management', requiredCap: 'PERMISSION_MANAGE' },
  { path: '/admin/settings', name: 'System Settings', requiredCap: 'SETTING_MANAGE' },
  { path: '/admin/audit-logs', name: 'Audit Logs', requiredCap: 'AUDIT_VIEW' },
  { path: '/admin/dashboard', name: 'Admin Dashboard', requiredCap: 'DASHBOARD_ACCESS' },
  
  // Document routes
  { path: '/documents', name: 'Documents List', requiredCap: 'DOCUMENT_READ' },
  { path: '/documents/create', name: 'Create Document', requiredCap: 'DOCUMENT_CREATE' },
  { path: '/documents/:id', name: 'View Document', requiredCap: 'DOCUMENT_READ' },
  { path: '/documents/:id/edit', name: 'Edit Document', requiredCap: 'DOCUMENT_UPDATE' },
  { path: '/documents/:id/delete', name: 'Delete Document', requiredCap: 'DOCUMENT_DELETE' },
  { path: '/documents/upload', name: 'Upload Document', requiredCap: 'DOCUMENT_CREATE' },
  
  // Group routes  
  { path: '/groups', name: 'Groups List', requiredCap: 'GROUP_READ' },
  { path: '/groups/create', name: 'Create Group', requiredCap: 'GROUP_CREATE' },
  { path: '/groups/:id', name: 'View Group', requiredCap: 'GROUP_READ' },
  { path: '/groups/:id/edit', name: 'Edit Group', requiredCap: 'GROUP_UPDATE' },
  { path: '/groups/:id/delete', name: 'Delete Group', requiredCap: 'GROUP_DELETE' },
  
  // User profile routes
  { path: '/profile', name: 'User Profile', requiredCap: null },
  { path: '/profile/edit', name: 'Edit Profile', requiredCap: null },
  
  // Report routes
  { path: '/reports', name: 'Reports', requiredCap: 'REPORT_VIEW' },
  { path: '/reports/generate', name: 'Generate Report', requiredCap: 'REPORT_CREATE' },
]

async function checkManagerAccess() {
  console.log('🔍 Checking page access for manager@dsm.com...\n')
  
  try {
    // Find the manager user
    const user = await prisma.user.findUnique({
      where: { email: 'manager@dsm.com' },
      include: {
        userRoles: {
          where: { isActive: true },
          include: {
            role: {
              include: {
                capabilityAssignments: {
                  include: {
                    capability: true
                  }
                }
              }
            }
          }
        }
      }
    })
    
    if (!user) {
      console.log('❌ User manager@dsm.com not found')
      return
    }
    
    console.log('👤 User:', user.email)
    console.log('   Name:', user.firstName, user.lastName)
    console.log('   Roles:', user.userRoles.map(ur => ur.role.name).join(', '))
    console.log('')
    
    // Get all capabilities for the user
    const capabilities = user.userRoles.flatMap(ur =>
      ur.role.capabilityAssignments.map(ca => ca.capability.name)
    )
    
    const uniqueCapabilities = [...new Set(capabilities)]
    
    console.log('🔑 Capabilities assigned to manager@dsm.com:')
    if (uniqueCapabilities.length === 0) {
      console.log('   (none)')
    } else {
      uniqueCapabilities.sort().forEach(cap => {
        console.log(`   ✓ ${cap}`)
      })
    }
    
    console.log(`\n   Total: ${uniqueCapabilities.length} capabilities`)
    
    // Check access for each route
    console.log('\n\n📄 PAGE ACCESS ANALYSIS:\n')
    console.log('=' .repeat(80))
    
    const accessiblePages: typeof allRoutes = []
    const restrictedPages: typeof allRoutes = []
    
    allRoutes.forEach(route => {
      if (!route.requiredCap) {
        // Public route or no capability required
        accessiblePages.push(route)
      } else if (uniqueCapabilities.includes(route.requiredCap)) {
        // User has required capability
        accessiblePages.push(route)
      } else {
        // User doesn't have required capability
        restrictedPages.push(route)
      }
    })
    
    // Show accessible pages
    console.log('\n✅ PAGES THAT CAN BE ACCESSED:')
    console.log('-'.repeat(80))
    if (accessiblePages.length === 0) {
      console.log('   (none)')
    } else {
      accessiblePages.forEach(route => {
        const capInfo = route.requiredCap ? `[${route.requiredCap}]` : '[no auth required]'
        console.log(`   ✓ ${route.name.padEnd(30)} → ${route.path}`)
        console.log(`     ${capInfo}`)
      })
    }
    console.log(`\n   Total: ${accessiblePages.length} pages`)
    
    // Show restricted pages
    console.log('\n\n❌ PAGES THAT CANNOT BE ACCESSED:')
    console.log('-'.repeat(80))
    if (restrictedPages.length === 0) {
      console.log('   ✅ All pages are accessible!')
    } else {
      restrictedPages.forEach(route => {
        console.log(`   ✗ ${route.name.padEnd(30)} → ${route.path}`)
        console.log(`     Missing capability: ${route.requiredCap}`)
      })
    }
    console.log(`\n   Total: ${restrictedPages.length} pages restricted`)
    
    // Summary
    console.log('\n\n📊 SUMMARY:')
    console.log('=' .repeat(80))
    console.log(`   Total pages checked:      ${allRoutes.length}`)
    console.log(`   Accessible pages:         ${accessiblePages.length} (${Math.round(accessiblePages.length/allRoutes.length*100)}%)`)
    console.log(`   Restricted pages:         ${restrictedPages.length} (${Math.round(restrictedPages.length/allRoutes.length*100)}%)`)
    
    // Check for missing capabilities
    const allRequiredCaps = [...new Set(allRoutes.map(r => r.requiredCap).filter(Boolean))] as string[]
    const missingCaps = allRequiredCaps.filter(cap => !uniqueCapabilities.includes(cap))
    
    if (missingCaps.length > 0) {
      console.log('\n\n🔐 MISSING CAPABILITIES:')
      console.log('-'.repeat(80))
      missingCaps.sort().forEach(cap => {
        const affectedRoutes = allRoutes.filter(r => r.requiredCap === cap)
        console.log(`   ✗ ${cap}`)
        affectedRoutes.forEach(route => {
          console.log(`     → blocks: ${route.name} (${route.path})`)
        })
      })
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the check
checkManagerAccess()
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })

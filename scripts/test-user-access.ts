import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testUserAccess(userEmail: string) {
  console.log('═══════════════════════════════════════════════════════')
  console.log(`🔍 USER ACCESS TEST - ${userEmail}`)
  console.log('═══════════════════════════════════════════════════════\n')

  try {
    // Get user with role and capabilities
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: {
        userRoles: {
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
        },
        group: true,
        divisi: true
      }
    })

    if (!user) {
      console.log('❌ User not found!\n')
      return
    }

    const userRole = user.userRoles?.[0]?.role
    const roleName = userRole?.name || 'No role assigned'
    const fullName = `${user.firstName} ${user.lastName}`

    console.log('📋 USER INFORMATION')
    console.log('─────────────────────────────────────────────────────')
    console.log(`Name:     ${fullName}`)
    console.log(`Email:    ${user.email}`)
    console.log(`Username: ${user.username}`)
    console.log(`Role:     ${roleName}`)
    console.log(`Group:    ${user.group?.name || 'No group'}`)
    console.log(`Division: ${user.divisi?.name || 'No division'}`)
    console.log(`Status:   ${user.isActive ? '✅ Active' : '❌ Inactive'}`)
    console.log()

    // Get capabilities
    const capabilities = userRole?.capabilityAssignments.map(rc => rc.capability) || []
    
    console.log('🎯 CAPABILITIES')
    console.log('─────────────────────────────────────────────────────')
    console.log(`Total: ${capabilities.length} capabilities\n`)

    // Group by category
    const byCategory: { [key: string]: any[] } = {}
    capabilities.forEach(cap => {
      const category = cap.category || 'other'
      if (!byCategory[category]) byCategory[category] = []
      byCategory[category].push(cap)
    })

    Object.keys(byCategory).sort().forEach(category => {
      const categoryEmoji = {
        document: '📄',
        user: '👥',
        role: '🔐',
        admin: '⚙️',
        group: '👨‍👩‍👧‍👦',
        system: '🖥️'
      }[category] || '📦'
      
      console.log(`${categoryEmoji} ${category.toUpperCase()}:`)
      byCategory[category].forEach(cap => {
        console.log(`   ✓ ${cap.name} - ${cap.description}`)
      })
      console.log()
    })

    // Check what user can access
    console.log('🚪 ACCESS PERMISSIONS')
    console.log('─────────────────────────────────────────────────────')
    
    const capabilityNames = capabilities.map(c => c.name)
    
    // Document Access
    console.log('📄 Documents:')
    console.log(`   ${capabilityNames.includes('DOCUMENT_VIEW') ? '✅' : '❌'} View documents`)
    console.log(`   ${capabilityNames.includes('DOCUMENT_EDIT') ? '✅' : '❌'} Edit documents`)
    console.log(`   ${capabilityNames.includes('DOCUMENT_CREATE') ? '✅' : '❌'} Create documents`)
    console.log(`   ${capabilityNames.includes('DOCUMENT_DELETE') ? '✅' : '❌'} Delete documents`)
    console.log(`   ${capabilityNames.includes('DOCUMENT_DOWNLOAD') ? '✅' : '❌'} Download documents`)
    console.log(`   ${capabilityNames.includes('DOCUMENT_COMMENT') ? '✅' : '❌'} Comment on documents`)
    console.log(`   ${capabilityNames.includes('DOCUMENT_APPROVE') ? '✅' : '❌'} Approve documents`)
    console.log(`   ${capabilityNames.includes('DOCUMENT_MANAGE') ? '✅' : '❌'} Full document management`)
    console.log()

    // User Management
    console.log('👥 User Management:')
    console.log(`   ${capabilityNames.includes('USER_VIEW') ? '✅' : '❌'} View users`)
    console.log(`   ${capabilityNames.includes('USER_MANAGE') ? '✅' : '❌'} Manage users (create, edit)`)
    console.log(`   ${capabilityNames.includes('USER_DELETE') ? '✅' : '❌'} Delete users`)
    console.log()

    // Role Management
    console.log('🔐 Role Management:')
    console.log(`   ${capabilityNames.includes('ROLE_VIEW') ? '✅' : '❌'} View roles`)
    console.log(`   ${capabilityNames.includes('ROLE_MANAGE') ? '✅' : '❌'} Manage roles`)
    console.log()

    // Group Management
    console.log('👨‍👩‍👧‍👦 Group Management:')
    console.log(`   ${capabilityNames.includes('GROUP_VIEW') ? '✅' : '❌'} View groups`)
    console.log(`   ${capabilityNames.includes('GROUP_MANAGE') ? '✅' : '❌'} Manage groups`)
    console.log()

    // Admin Access
    console.log('⚙️ Admin Features:')
    console.log(`   ${capabilityNames.includes('ADMIN_ACCESS') ? '✅' : '❌'} Admin panel access`)
    console.log(`   ${capabilityNames.includes('SYSTEM_CONFIG') ? '✅' : '❌'} System configuration`)
    console.log()

    // Navigation
    console.log('🧭 NAVIGATION ACCESS')
    console.log('─────────────────────────────────────────────────────')
    console.log(`   ${capabilityNames.includes('DOCUMENT_VIEW') ? '✅' : '❌'} Documents Tab`)
    console.log(`   ${capabilityNames.includes('USER_VIEW') ? '✅' : '❌'} Users Tab`)
    console.log(`   ${capabilityNames.includes('ROLE_VIEW') ? '✅' : '❌'} Roles Tab`)
    console.log(`   ${capabilityNames.includes('GROUP_VIEW') ? '✅' : '❌'} Groups Tab`)
    console.log(`   ${capabilityNames.includes('ADMIN_ACCESS') || capabilityNames.includes('USER_VIEW') ? '✅' : '❌'} Admin Menu`)
    console.log()

    // API Endpoints
    console.log('🔌 API ENDPOINTS ACCESS')
    console.log('─────────────────────────────────────────────────────')
    
    const endpoints = [
      { path: 'GET /api/documents', capability: 'DOCUMENT_VIEW' },
      { path: 'POST /api/documents', capability: 'DOCUMENT_CREATE' },
      { path: 'PUT /api/documents/[id]', capability: 'DOCUMENT_EDIT' },
      { path: 'DELETE /api/documents/[id]', capability: 'DOCUMENT_DELETE' },
      { path: 'GET /api/documents/[id]/download', capability: 'DOCUMENT_DOWNLOAD' },
      { path: 'GET /api/users', capability: 'USER_VIEW' },
      { path: 'POST /api/users', capability: 'USER_MANAGE' },
      { path: 'PUT /api/users/[id]', capability: 'USER_MANAGE' },
      { path: 'DELETE /api/users/[id]', capability: 'USER_DELETE' },
      { path: 'GET /api/roles', capability: 'ROLE_VIEW' },
      { path: 'POST /api/roles', capability: 'ROLE_MANAGE' },
      { path: 'GET /api/groups', capability: 'GROUP_VIEW' },
      { path: 'POST /api/groups', capability: 'GROUP_MANAGE' },
      { path: 'GET /api/analytics', capability: 'USER_VIEW' },
    ]

    const accessibleEndpoints = endpoints.filter(e => capabilityNames.includes(e.capability))
    const blockedEndpoints = endpoints.filter(e => !capabilityNames.includes(e.capability))

    console.log(`✅ ACCESSIBLE (${accessibleEndpoints.length}):`)
    accessibleEndpoints.forEach(e => {
      console.log(`   ✓ ${e.path}`)
    })
    console.log()

    console.log(`❌ BLOCKED (${blockedEndpoints.length}):`)
    blockedEndpoints.forEach(e => {
      console.log(`   ✗ ${e.path} (requires ${e.capability})`)
    })
    console.log()

    // Summary
    console.log('📊 SUMMARY')
    console.log('─────────────────────────────────────────────────────')
    console.log(`Total Capabilities:     ${capabilities.length}`)
    console.log(`Accessible Endpoints:   ${accessibleEndpoints.length}/${endpoints.length}`)
    console.log(`Access Level:           ${getAccessLevel(capabilityNames)}`)
    console.log()

    console.log('═══════════════════════════════════════════════════════')
    console.log('✅ User access test completed!')
    console.log('═══════════════════════════════════════════════════════\n')

  } catch (error) {
    console.error('❌ Error testing user access:', error)
  } finally {
    await prisma.$disconnect()
  }
}

function getAccessLevel(capabilities: string[]): string {
  const capCount = capabilities.length
  
  if (capabilities.includes('ADMIN_ACCESS')) {
    return '👑 ADMINISTRATOR (Full Access)'
  } else if (capCount >= 15) {
    return '⭐ MANAGER (High Access)'
  } else if (capCount >= 8) {
    return '✏️ EDITOR (Medium Access)'
  } else if (capCount >= 3) {
    return '📖 CONTRIBUTOR (Basic Access)'
  } else {
    return '👁️ VIEWER (Read-only)'
  }
}

// Get email from command line or use default
const userEmail = process.argv[2] || 'admin@dsm.com'

console.log('\n')
testUserAccess(userEmail)

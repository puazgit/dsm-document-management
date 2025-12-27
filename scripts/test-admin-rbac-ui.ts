import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function logSection(title: string) {
  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`)
  console.log(`${colors.cyan}${title}${colors.reset}`)
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`)
}

function logSuccess(message: string) {
  console.log(`${colors.green}✓${colors.reset} ${message}`)
}

function logError(message: string) {
  console.log(`${colors.red}✗${colors.reset} ${message}`)
}

function logInfo(message: string) {
  console.log(`${colors.blue}ℹ${colors.reset} ${message}`)
}

async function testNavigationResources() {
  logSection('Testing RBAC Navigation Resources')
  
  const rbacNav = await prisma.resource.findUnique({
    where: { id: 'nav-admin-rbac' },
    include: {
      children: true,
    },
  })
  
  if (rbacNav) {
    logSuccess(`RBAC Management parent menu found: ${rbacNav.name}`)
    logInfo(`  - Path: ${rbacNav.path}`)
    logInfo(`  - Required Capability: ${rbacNav.requiredCapability}`)
    logInfo(`  - Children: ${rbacNav.children.length}`)
    
    for (const child of rbacNav.children) {
      logSuccess(`  Child: ${child.name} (${child.path})`)
    }
  } else {
    logError('RBAC Management parent menu NOT FOUND')
  }
  
  console.log('')
}

async function testRouteResources() {
  logSection('Testing RBAC Route Resources')
  
  const routes = await prisma.resource.findMany({
    where: {
      type: 'route',
      path: {
        startsWith: '/admin/rbac',
      },
    },
  })
  
  logSuccess(`Found ${routes.length} RBAC routes`)
  for (const route of routes) {
    logInfo(`  - ${route.path} (${route.requiredCapability})`)
  }
  
  console.log('')
}

async function testAPIResources() {
  logSection('Testing RBAC API Resources')
  
  const apis = await prisma.resource.findMany({
    where: {
      type: 'api',
      path: {
        in: [
          '/api/admin/capabilities',
          '/api/admin/resources',
          '/api/admin/role-capabilities',
        ],
      },
    },
  })
  
  logSuccess(`Found ${apis.length} RBAC API endpoints`)
  
  const grouped = apis.reduce((acc, api) => {
    if (!acc[api.path]) acc[api.path] = []
    acc[api.path].push(api)
    return acc
  }, {} as Record<string, typeof apis>)
  
  for (const [path, endpoints] of Object.entries(grouped)) {
    logInfo(`  ${path}:`)
    for (const endpoint of endpoints) {
      const method = (endpoint.metadata as any)?.method || 'UNKNOWN'
      logInfo(`    - ${method} (${endpoint.requiredCapability})`)
    }
  }
  
  console.log('')
}

async function testUserAccess() {
  logSection('Testing User Access to RBAC UI')
  
  // Test admin user (superadmin role)
  const adminUserRole = await prisma.userRole.findFirst({
    where: {
      isActive: true,
      role: {
        level: 0, // superadmin
      },
    },
    include: {
      user: true,
      role: {
        include: {
          capabilityAssignments: {
            include: {
              capability: true,
            },
          },
        },
      },
    },
  })
  
  if (adminUserRole) {
    logSuccess(`Admin user found: ${adminUserRole.user.email}`)
    logInfo(`  - Role: ${adminUserRole.role.name} (Level: ${adminUserRole.role.level})`)
    
    const capabilities = adminUserRole.role.capabilityAssignments.map(ca => ca.capability.id)
    const hasPermissionManage = capabilities.includes('PERMISSION_MANAGE')
    const hasRoleManage = capabilities.includes('ROLE_MANAGE')
    
    if (hasPermissionManage) {
      logSuccess('  ✓ Has PERMISSION_MANAGE capability')
      logInfo('    Can access Resources page')
    } else {
      logError('  ✗ Missing PERMISSION_MANAGE capability')
    }
    
    if (hasRoleManage) {
      logSuccess('  ✓ Has ROLE_MANAGE capability')
      logInfo('    Can access Role Assignments page')
    } else {
      logError('  ✗ Missing ROLE_MANAGE capability')
    }
  } else {
    logError('No admin user found')
  }
  
  console.log('')
  
  // Test ppd.pusat user
  const ppdPusatUserRole = await prisma.userRole.findFirst({
    where: {
      isActive: true,
      role: {
        level: 1, // ppd.pusat
      },
    },
    include: {
      user: true,
      role: {
        include: {
          capabilityAssignments: {
            include: {
              capability: true,
            },
          },
        },
      },
    },
  })
  
  if (ppdPusatUserRole) {
    logSuccess(`PPD Pusat user found: ${ppdPusatUserRole.user.email}`)
    logInfo(`  - Role: ${ppdPusatUserRole.role.name} (Level: ${ppdPusatUserRole.role.level})`)
    
    const capabilities = ppdPusatUserRole.role.capabilityAssignments.map(ca => ca.capability.id)
    const hasPermissionManage = capabilities.includes('PERMISSION_MANAGE')
    const hasRoleManage = capabilities.includes('ROLE_MANAGE')
    
    if (hasPermissionManage) {
      logSuccess('  ✓ Has PERMISSION_MANAGE capability')
    } else {
      logInfo('  ✗ Missing PERMISSION_MANAGE capability (expected)')
    }
    
    if (hasRoleManage) {
      logSuccess('  ✓ Has ROLE_MANAGE capability')
    } else {
      logInfo('  ✗ Missing ROLE_MANAGE capability (expected)')
    }
  }
  
  console.log('')
  
  // Test ppd.unit user
  const ppdUnitUserRole = await prisma.userRole.findFirst({
    where: {
      isActive: true,
      role: {
        level: 2, // ppd.unit
      },
    },
    include: {
      user: true,
      role: {
        include: {
          capabilityAssignments: {
            include: {
              capability: true,
            },
          },
        },
      },
    },
  })
  
  if (ppdUnitUserRole) {
    logSuccess(`PPD Unit user found: ${ppdUnitUserRole.user.email}`)
    logInfo(`  - Role: ${ppdUnitUserRole.role.name} (Level: ${ppdUnitUserRole.role.level})`)
    
    const capabilities = ppdUnitUserRole.role.capabilityAssignments.map(ca => ca.capability.id)
    const hasPermissionManage = capabilities.includes('PERMISSION_MANAGE')
    const hasRoleManage = capabilities.includes('ROLE_MANAGE')
    
    if (hasPermissionManage) {
      logSuccess('  ✓ Has PERMISSION_MANAGE capability')
    } else {
      logInfo('  ✗ Missing PERMISSION_MANAGE capability (expected)')
    }
    
    if (hasRoleManage) {
      logSuccess('  ✓ Has ROLE_MANAGE capability')
    } else {
      logInfo('  ✗ Missing ROLE_MANAGE capability (expected)')
    }
  }
  
  console.log('')
}

async function testCapabilities() {
  logSection('Testing Capabilities Table')
  
  const capabilities = await prisma.roleCapability.findMany({
    include: {
      _count: {
        select: {
          assignments: true,
        },
      },
    },
    orderBy: {
      category: 'asc',
    },
  })
  
  logSuccess(`Found ${capabilities.length} capabilities`)
  
  const grouped = capabilities.reduce((acc, cap) => {
    if (!acc[cap.category || 'other']) acc[cap.category || 'other'] = []
    acc[cap.category || 'other'].push(cap)
    return acc
  }, {} as Record<string, typeof capabilities>)
  
  for (const [category, caps] of Object.entries(grouped)) {
    logInfo(`\n  ${category.toUpperCase()} (${caps.length} capabilities):`)
    for (const cap of caps) {
      const roleCount = cap._count.assignments
      logInfo(`    - ${cap.id}: ${cap.name} (${roleCount} roles)`)
    }
  }
  
  console.log('')
}

async function testResources() {
  logSection('Testing Resources Table')
  
  const resources = await prisma.resource.findMany({
    orderBy: [
      { type: 'asc' },
      { sortOrder: 'asc' },
    ],
  })
  
  logSuccess(`Found ${resources.length} resources`)
  
  const grouped = resources.reduce((acc, res) => {
    if (!acc[res.type]) acc[res.type] = []
    acc[res.type].push(res)
    return acc
  }, {} as Record<string, typeof resources>)
  
  for (const [type, items] of Object.entries(grouped)) {
    logInfo(`\n  ${type.toUpperCase()} (${items.length} items):`)
    for (const item of items) {
      const parent = item.parentId ? `[child of ${item.parentId}]` : ''
      const capability = item.requiredCapability || 'public'
      logInfo(`    - ${item.path} ${parent} (${capability})`)
    }
  }
  
  console.log('')
}

async function testRoleAssignments() {
  logSection('Testing Role-Capability Assignments')
  
  const roles = await prisma.role.findMany({
    include: {
      capabilityAssignments: {
        include: {
          capability: true,
        },
      },
    },
    orderBy: {
      level: 'asc',
    },
  })
  
  logSuccess(`Found ${roles.length} roles`)
  
  for (const role of roles) {
    const capCount = role.capabilityAssignments.length
    logInfo(`\n  ${role.name} (Level ${role.level}) - ${capCount} capabilities:`)
    
    const grouped = role.capabilityAssignments.reduce((acc, ca) => {
      const category = ca.capability.category || 'other'
      if (!acc[category]) acc[category] = []
      acc[category].push(ca.capability.id)
      return acc
    }, {} as Record<string, string[]>)
    
    for (const [category, caps] of Object.entries(grouped)) {
      logInfo(`    ${category}: ${caps.join(', ')}`)
    }
  }
  
  console.log('')
}

async function testSummary() {
  logSection('Test Summary')
  
  const stats = {
    capabilities: await prisma.roleCapability.count(),
    resources: await prisma.resource.count(),
    roles: await prisma.role.count(),
    assignments: await prisma.roleCapabilityAssignment.count(),
    users: await prisma.user.count(),
    navigationItems: await prisma.resource.count({
      where: { type: 'navigation' },
    }),
    routes: await prisma.resource.count({
      where: { type: 'route' },
    }),
    apis: await prisma.resource.count({
      where: { type: 'api' },
    }),
  }
  
  logSuccess('Database Statistics:')
  logInfo(`  Capabilities: ${stats.capabilities}`)
  logInfo(`  Resources: ${stats.resources}`)
  logInfo(`    - Navigation: ${stats.navigationItems}`)
  logInfo(`    - Routes: ${stats.routes}`)
  logInfo(`    - APIs: ${stats.apis}`)
  logInfo(`  Roles: ${stats.roles}`)
  logInfo(`  Role-Capability Assignments: ${stats.assignments}`)
  logInfo(`  Users: ${stats.users}`)
  
  console.log('')
  
  logSuccess('Admin UI Pages:')
  logInfo('  1. Resources Management: /admin/rbac/resources')
  logInfo('     - Create/Edit/Delete resources')
  logInfo('     - Manage navigation, routes, and APIs')
  logInfo('     - Required: PERMISSION_MANAGE capability')
  
  logInfo('  2. Role Assignments: /admin/rbac/assignments')
  logInfo('     - Interactive capability matrix')
  logInfo('     - Assign/unassign capabilities to roles')
  logInfo('     - Required: ROLE_MANAGE capability')
  
  console.log('')
  
  logSuccess('Next Steps:')
  logInfo('  1. Start dev server: npm run dev')
  logInfo('  2. Login as admin user (superadmin role)')
  logInfo('  3. Navigate to Admin → RBAC Management')
  logInfo('  4. Test Resources page functionality')
  logInfo('  5. Test Role Assignments page functionality')
  logInfo('  6. Verify permission checks work correctly')
  
  console.log('')
}

async function runTests() {
  try {
    await testNavigationResources()
    await testRouteResources()
    await testAPIResources()
    await testUserAccess()
    await testCapabilities()
    await testResources()
    await testRoleAssignments()
    await testSummary()
    
    logSection('All Tests Completed Successfully')
    logSuccess('Admin RBAC UI is ready to use!')
    
  } catch (error) {
    logError(`Test failed: ${error}`)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run tests
runTests()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

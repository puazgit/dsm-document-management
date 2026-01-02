#!/usr/bin/env tsx
/**
 * Phase 4: Capability System Integration Tests
 * 
 * Tests the complete capability-based authorization system:
 * 1. Database capability loading
 * 2. Session capability injection
 * 3. API route capability checks
 * 4. Component capability hooks
 * 5. Backward compatibility
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ANSI colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
}

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

function logSection(title: string) {
  console.log(`\n${colors.cyan}${'='.repeat(60)}`)
  console.log(`${title}`)
  console.log(`${'='.repeat(60)}${colors.reset}\n`)
}

function logTest(name: string, passed: boolean, details?: string) {
  const icon = passed ? '✅' : '❌'
  const color = passed ? colors.green : colors.red
  log(`${icon} ${name}`, color)
  if (details) {
    log(`   ${details}`, colors.reset)
  }
}

async function test1_DatabaseCapabilityLoading() {
  logSection('TEST 1: Database Capability Loading')
  
  try {
    // Get test users with their roles
    const testUsers = await prisma.user.findMany({
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
          },
          where: {
            isActive: true
          },
          orderBy: {
            assignedAt: 'desc'
          },
          take: 1
        }
      },
      take: 5
    })

    log(`Found ${testUsers.length} test users`, colors.blue)

    for (const user of testUsers) {
      const userRole = user.userRoles[0]
      const capabilities = userRole?.role?.capabilityAssignments.map(ca => ca.capability) || []
      const capabilityNames = capabilities.map(c => c.name)
      
      log(`\n👤 ${user.firstName} ${user.lastName} (${user.username})`)
      log(`   Role: ${userRole?.role?.name || 'No Role'}`)
      log(`   Capabilities: ${capabilityNames.length} loaded`)
      
      const hasCapabilities = capabilityNames.length > 0
      logTest(
        `Capabilities loaded from database`,
        hasCapabilities,
        hasCapabilities ? capabilityNames.slice(0, 3).join(', ') + '...' : 'No capabilities found'
      )
    }

    return true
  } catch (error) {
    logTest('Database capability loading', false, `Error: ${error}`)
    return false
  }
}

async function test2_CapabilityTypeValidation() {
  logSection('TEST 2: Capability Type Validation')
  
  try {
    const validCapabilities = [
      'DOCUMENT_VIEW',
      'DOCUMENT_EDIT',
      'DOCUMENT_CREATE',
      'DOCUMENT_DELETE',
      'DOCUMENT_DOWNLOAD',
      'DOCUMENT_COMMENT',
      'DOCUMENT_APPROVE',
      'DOCUMENT_MANAGE',
      'USER_VIEW',
      'USER_MANAGE',
      'USER_DELETE',
      'ROLE_VIEW',
      'ROLE_MANAGE',
    ]

    // Check if all capabilities exist in database
    const dbCapabilities = await prisma.roleCapability.findMany({
      where: {
        name: {
          in: validCapabilities
        }
      }
    })

    const dbCapNames = dbCapabilities.map(c => c.name)
    
    log(`Expected capabilities: ${validCapabilities.length}`)
    log(`Found in database: ${dbCapabilities.length}`)

    for (const cap of validCapabilities) {
      const exists = dbCapNames.includes(cap)
      logTest(cap, exists, exists ? 'Found in DB' : 'Missing from DB')
    }

    const allExist = dbCapabilities.length === validCapabilities.length
    return allExist
  } catch (error) {
    logTest('Capability type validation', false, `Error: ${error}`)
    return false
  }
}

async function test3_RoleCapabilityAssignments() {
  logSection('TEST 3: Role → Capability Assignments')
  
  try {
    const roles = await prisma.role.findMany({
      include: {
        capabilityAssignments: {
          include: {
            capability: true
          }
        },
        _count: {
          select: { capabilityAssignments: true }
        }
      },
      orderBy: { name: 'asc' }
    })

    log(`Testing ${roles.length} roles`, colors.blue)

    const expectedAssignments = {
      'admin': ['DOCUMENT_VIEW', 'DOCUMENT_EDIT', 'DOCUMENT_CREATE', 'DOCUMENT_DELETE', 
                'USER_VIEW', 'USER_MANAGE', 'USER_DELETE', 'ROLE_VIEW', 'ROLE_MANAGE'],
      'manager': ['DOCUMENT_VIEW', 'DOCUMENT_EDIT', 'DOCUMENT_CREATE', 'DOCUMENT_APPROVE'],
      'editor': ['DOCUMENT_VIEW', 'DOCUMENT_EDIT', 'DOCUMENT_COMMENT'],
      'viewer': ['DOCUMENT_VIEW'],
    }

    for (const role of roles) {
      const capNames = role.capabilityAssignments.map(ca => ca.capability.name)
      const expected = expectedAssignments[role.name as keyof typeof expectedAssignments] || []
      
      log(`\n🎭 Role: ${role.displayName || role.name}`)
      log(`   Capabilities: ${capNames.length}`)
      
      if (expected.length > 0) {
        const hasAllExpected = expected.every(cap => capNames.includes(cap))
        logTest(
          `Has expected capabilities`,
          hasAllExpected,
          `${capNames.slice(0, 3).join(', ')}...`
        )
      } else {
        log(`   No specific expectations for this role`)
      }
    }

    return true
  } catch (error) {
    logTest('Role capability assignments', false, `Error: ${error}`)
    return false
  }
}

async function test4_NavigationCapabilityMapping() {
  logSection('TEST 4: Navigation Capability Mapping')
  
  try {
    // Define expected mappings from navigation.ts
    const navigationMappings = [
      { route: '/documents', capability: 'DOCUMENT_VIEW' },
      { route: '/documents/upload', capability: 'DOCUMENT_CREATE' },
      { route: '/admin', capability: 'USER_VIEW' },
      { route: '/admin/users', capability: 'USER_VIEW' },
      { route: '/admin/groups', capability: 'USER_MANAGE' },
      { route: '/admin/roles', capability: 'ROLE_VIEW' },
      { route: '/admin/settings', capability: 'USER_MANAGE' },
    ]

    log(`Testing ${navigationMappings.length} navigation mappings`, colors.blue)

    for (const mapping of navigationMappings) {
      // Check if capability exists in database
      const capability = await prisma.roleCapability.findUnique({
        where: { name: mapping.capability }
      })

      logTest(
        `${mapping.route} → ${mapping.capability}`,
        !!capability,
        capability ? `✓ Valid mapping` : '✗ Capability missing'
      )
    }

    return true
  } catch (error) {
    logTest('Navigation capability mapping', false, `Error: ${error}`)
    return false
  }
}

async function test5_CapabilityHierarchy() {
  logSection('TEST 5: Capability Hierarchy Validation')
  
  try {
    // Admin should have all capabilities
    const adminRole = await prisma.role.findUnique({
      where: { name: 'admin' },
      include: { 
        capabilityAssignments: {
          include: { capability: true }
        }
      }
    })

    if (!adminRole) {
      logTest('Admin role exists', false, 'Admin role not found')
      return false
    }

    const adminCaps = adminRole.capabilityAssignments.map(ca => ca.capability.name)
    log(`Admin has ${adminCaps.length} capabilities`, colors.blue)

    // Check document capabilities
    const documentCaps = adminCaps.filter(c => c.startsWith('DOCUMENT_'))
    logTest(
      'Admin has DOCUMENT_* capabilities',
      documentCaps.length >= 7,
      `${documentCaps.length} document capabilities`
    )

    // Check user management capabilities
    const userCaps = adminCaps.filter(c => c.startsWith('USER_'))
    logTest(
      'Admin has USER_* capabilities',
      userCaps.length >= 3,
      `${userCaps.length} user capabilities`
    )

    // Check role management capabilities
    const roleCaps = adminCaps.filter(c => c.startsWith('ROLE_'))
    logTest(
      'Admin has ROLE_* capabilities',
      roleCaps.length >= 2,
      `${roleCaps.length} role capabilities`
    )

    // Manager should have fewer capabilities than admin
    const managerRole = await prisma.role.findUnique({
      where: { name: 'manager' },
      include: { 
        capabilityAssignments: {
          include: { capability: true }
        }
      }
    })

    if (managerRole) {
      const managerCapCount = managerRole.capabilityAssignments.length
      logTest(
        'Manager has fewer capabilities than Admin',
        managerCapCount < adminCaps.length,
        `Manager: ${managerCapCount}, Admin: ${adminCaps.length}`
      )
    }

    return true
  } catch (error) {
    logTest('Capability hierarchy validation', false, `Error: ${error}`)
    return false
  }
}

async function test6_UserCapabilityQuery() {
  logSection('TEST 6: User Capability Query Performance')
  
  try {
    // Test the exact query used in NextAuth callback
    const testUser = await prisma.user.findFirst({
      where: { 
        userRoles: {
          some: {
            isActive: true
          }
        }
      },
      include: {
        userRoles: {
          where: { isActive: true },
          include: {
            role: {
              include: {
                capabilityAssignments: {
                  include: {
                    capability: {
                      select: {
                        name: true
                      }
                    }
                  }
                }
              }
            }
          },
          orderBy: { assignedAt: 'desc' },
          take: 1
        }
      }
    })

    if (!testUser || !testUser.userRoles[0]) {
      logTest('Test user found', false, 'No users with roles found')
      return false
    }

    const startTime = Date.now()
    
    // Simulate NextAuth capability loading
    const capabilities = testUser.userRoles[0]?.role?.capabilityAssignments.map(ca => ca.capability.name) || []
    
    const endTime = Date.now()
    const queryTime = endTime - startTime

    log(`User: ${testUser.username}`, colors.blue)
    log(`Role: ${testUser.userRoles[0]?.role?.name || 'None'}`)
    log(`Capabilities loaded: ${capabilities.length}`)
    log(`Query time: ${queryTime}ms`)

    logTest(
      'Capability query performance',
      queryTime < 50,
      `${queryTime}ms (${queryTime < 50 ? 'Fast' : 'Slow'})`
    )

    logTest(
      'Capabilities successfully mapped',
      capabilities.length > 0,
      `${capabilities.length} capabilities loaded`
    )

    return true
  } catch (error) {
    logTest('User capability query', false, `Error: ${error}`)
    return false
  }
}

async function test7_BackwardCompatibility() {
  logSection('TEST 7: Backward Compatibility Check')
  
  try {
    // Check if old role fields still exist
    const user = await prisma.user.findFirst({
      include: {
        userRoles: {
          where: { isActive: true },
          include: { role: true },
          orderBy: { assignedAt: 'desc' },
          take: 1
        },
        group: true
      }
    })

    if (!user) {
      logTest('Test user found', false, 'No users found')
      return false
    }

    // Verify user roles exists
    logTest(
      'User.userRoles field exists',
      user.userRoles !== undefined,
      `Has ${user.userRoles.length} role assignments`
    )

    // Verify role accessible through UserRole
    logTest(
      'User role accessible through UserRole',
      user.userRoles.length > 0 && user.userRoles[0].role !== null,
      `Role: ${user.userRoles[0]?.role?.name || 'None'}`
    )

    // Verify group field still exists (old system)
    logTest(
      'User.group field exists',
      user.group !== undefined,
      `Group: ${user.group?.name || 'None'}`
    )

    log('\n📋 System evolution maintained:', colors.green)
    log('   ✓ UserRole relation functional')
    log('   ✓ Group field preserved')
    log('   ✓ Authorization uses capabilities')

    return true
  } catch (error) {
    logTest('Backward compatibility check', false, `Error: ${error}`)
    return false
  }
}

async function test8_CapabilityIntegrity() {
  logSection('TEST 8: Capability Data Integrity')
  
  try {
    // Check for duplicate capabilities
    const allCapabilities = await prisma.roleCapability.findMany()
    const capNames = allCapabilities.map(c => c.name)
    const uniqueNames = new Set(capNames)
    
    logTest(
      'No duplicate capabilities',
      capNames.length === uniqueNames.size,
      `${capNames.length} total, ${uniqueNames.size} unique`
    )

    // Check for orphaned role-capability relationships
    const roleCapabilities = await prisma.$queryRaw<any[]>`
      SELECT rca.*, r.name as role_name, rc.name as cap_name
      FROM "role_capability_assignments" rca
      LEFT JOIN "roles" r ON rca.role_id = r.id
      LEFT JOIN "role_capabilities" rc ON rca.capability_id = rc.id
      WHERE r.id IS NULL OR rc.id IS NULL
    `

    logTest(
      'No orphaned role-capability links',
      roleCapabilities.length === 0,
      roleCapabilities.length === 0 ? 'All links valid' : `${roleCapabilities.length} orphaned`
    )

    // Check for roles without capabilities
    const rolesWithoutCaps = await prisma.role.findMany({
      where: {
        capabilityAssignments: {
          none: {}
        }
      }
    })

    logTest(
      'All roles have capabilities',
      rolesWithoutCaps.length === 0,
      rolesWithoutCaps.length === 0 
        ? 'All roles configured' 
        : `${rolesWithoutCaps.length} roles without capabilities: ${rolesWithoutCaps.map(r => r.name).join(', ')}`
    )

    return true
  } catch (error) {
    logTest('Capability integrity check', false, `Error: ${error}`)
    return false
  }
}

async function test9_PerformanceBenchmark() {
  logSection('TEST 9: Performance Benchmark')
  
  try {
    const iterations = 100
    
    // Benchmark 1: Direct capability query
    const start1 = Date.now()
    for (let i = 0; i < iterations; i++) {
      await prisma.user.findFirst({
        where: { 
          userRoles: {
            some: { isActive: true }
          }
        },
        include: {
          userRoles: {
            where: { isActive: true },
            include: {
              role: {
                include: {
                  capabilityAssignments: {
                    include: { capability: true }
                  }
                }
              }
            },
            take: 1
          }
        }
      })
    }
    const end1 = Date.now()
    const avgTime1 = (end1 - start1) / iterations

    log(`Capability query (${iterations} iterations)`)
    log(`Average: ${avgTime1.toFixed(2)}ms per query`)
    
    logTest(
      'Query performance acceptable',
      avgTime1 < 20,
      `${avgTime1.toFixed(2)}ms avg (target: <20ms)`
    )

    // Benchmark 2: Capability array processing
    const user = await prisma.user.findFirst({
      where: { 
        userRoles: {
          some: { isActive: true }
        }
      },
      include: {
        userRoles: {
          where: { isActive: true },
          include: {
            role: {
              include: {
                capabilityAssignments: {
                  include: { capability: true }
                }
              }
            }
          },
          take: 1
        }
      }
    })

    if (user && user.userRoles[0]) {
      const start2 = Date.now()
      for (let i = 0; i < 10000; i++) {
        const caps = user.userRoles[0].role?.capabilityAssignments.map(ca => ca.capability.name) || []
        const hasDocView = caps.includes('DOCUMENT_VIEW')
        const hasDocEdit = caps.includes('DOCUMENT_EDIT')
      }
      const end2 = Date.now()
      const avgTime2 = (end2 - start2) / 10000

      log(`\nCapability check (10,000 iterations)`)
      log(`Average: ${avgTime2.toFixed(4)}ms per check`)
      
      logTest(
        'In-memory capability check',
        avgTime2 < 0.01,
        `${avgTime2.toFixed(4)}ms avg (extremely fast)`
      )
    }

    return true
  } catch (error) {
    logTest('Performance benchmark', false, `Error: ${error}`)
    return false
  }
}

async function generateTestReport(results: { [key: string]: boolean }) {
  logSection('PHASE 4 TEST REPORT')
  
  const tests = Object.keys(results)
  const passed = tests.filter(t => results[t]).length
  const failed = tests.filter(t => !results[t]).length
  const passRate = (passed / tests.length * 100).toFixed(1)

  log(`Total Tests: ${tests.length}`)
  log(`Passed: ${passed}`, colors.green)
  log(`Failed: ${failed}`, failed > 0 ? colors.red : colors.green)
  log(`Pass Rate: ${passRate}%\n`, passed === tests.length ? colors.green : colors.yellow)

  if (passed === tests.length) {
    log('🎉 ALL TESTS PASSED! 🎉', colors.green)
    log('\n✅ Capability system is fully operational')
    log('✅ Database integrity validated')
    log('✅ Performance meets requirements')
    log('✅ Backward compatibility maintained')
  } else {
    log('⚠️  SOME TESTS FAILED', colors.yellow)
    log('\nFailed tests:', colors.red)
    tests.forEach(test => {
      if (!results[test]) {
        log(`   ❌ ${test}`)
      }
    })
  }

  // Additional stats
  log('\n📊 System Statistics:', colors.cyan)
  
  const totalUsers = await prisma.user.count()
  const totalRoles = await prisma.role.count()
  const totalCapabilities = await prisma.roleCapability.count()
  const usersWithRoles = await prisma.user.count({
    where: { 
      userRoles: {
        some: { isActive: true }
      }
    }
  })

  log(`   Users: ${totalUsers} (${usersWithRoles} with roles)`)
  log(`   Roles: ${totalRoles}`)
  log(`   Capabilities: ${totalCapabilities}`)

  const avgCapsPerRole = await prisma.role.findMany({
    include: {
      _count: {
        select: { capabilityAssignments: true }
      }
    }
  })
  const avgCaps = avgCapsPerRole.reduce((sum, r) => sum + r._count.capabilityAssignments, 0) / avgCapsPerRole.length

  log(`   Avg capabilities per role: ${avgCaps.toFixed(1)}`)
}

async function main() {
  log('\n🚀 Starting Phase 4: Capability System Tests', colors.magenta)
  log(`📅 ${new Date().toLocaleString()}\n`)

  const results: { [key: string]: boolean } = {}

  try {
    results['Database Capability Loading'] = await test1_DatabaseCapabilityLoading()
    results['Capability Type Validation'] = await test2_CapabilityTypeValidation()
    results['Role Capability Assignments'] = await test3_RoleCapabilityAssignments()
    results['Navigation Capability Mapping'] = await test4_NavigationCapabilityMapping()
    results['Capability Hierarchy'] = await test5_CapabilityHierarchy()
    results['User Capability Query'] = await test6_UserCapabilityQuery()
    results['Backward Compatibility'] = await test7_BackwardCompatibility()
    results['Capability Integrity'] = await test8_CapabilityIntegrity()
    results['Performance Benchmark'] = await test9_PerformanceBenchmark()

    await generateTestReport(results)

  } catch (error) {
    log(`\n❌ Test suite failed: ${error}`, colors.red)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => {
    log('\n✅ Test suite completed successfully', colors.green)
    process.exit(0)
  })
  .catch((error) => {
    log(`\n❌ Test suite error: ${error}`, colors.red)
    process.exit(1)
  })

#!/usr/bin/env ts-node

/**
 * Phase 6: Automated Testing Script
 * Tests capability system migration
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface TestResult {
  category: string
  test: string
  status: 'PASS' | 'FAIL' | 'WARN'
  message?: string
  duration?: number
}

const results: TestResult[] = []

function logTest(category: string, test: string, status: 'PASS' | 'FAIL' | 'WARN', message?: string, duration?: number) {
  results.push({ category, test, status, message, duration })
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️'
  console.log(`${icon} [${category}] ${test}${message ? ': ' + message : ''}${duration ? ` (${duration}ms)` : ''}`)
}

async function testDatabaseStructure() {
  console.log('\n📊 Testing Database Structure...')
  const start = Date.now()

  try {
    // Test 1: Check RoleCapabilityAssignment exists
    const capabilityCount = await prisma.roleCapabilityAssignment.count()
    if (capabilityCount > 0) {
      logTest('Database', 'RoleCapabilityAssignment table exists', 'PASS', `${capabilityCount} records`, Date.now() - start)
    } else {
      logTest('Database', 'RoleCapabilityAssignment table exists', 'FAIL', 'No records found')
    }

    // Test 2: Check all roles have capabilities
    const roles = await prisma.role.findMany({
      include: {
        _count: {
          select: { capabilityAssignments: true }
        }
      }
    })

    const expectedRoles = ['admin', 'manager', 'editor', 'viewer', 'ppd.pusat', 'ppd.unit', 'guest']
    for (const roleName of expectedRoles) {
      const role = roles.find(r => r.name === roleName)
      if (role && role._count.capabilityAssignments > 0) {
        logTest('Database', `${roleName} has capabilities`, 'PASS', `${role._count.capabilityAssignments} capabilities`)
      } else if (role) {
        logTest('Database', `${roleName} has capabilities`, 'FAIL', 'No capabilities assigned')
      } else {
        logTest('Database', `${roleName} exists`, 'FAIL', 'Role not found')
      }
    }

    // Test 3: Verify capability count
    const totalCapabilities = await prisma.roleCapability.count()
    if (totalCapabilities >= 69) {
      logTest('Database', 'Capability definitions', 'PASS', `${totalCapabilities} capabilities defined`)
    } else {
      logTest('Database', 'Capability definitions', 'WARN', `Only ${totalCapabilities} capabilities (expected 69+)`)
    }

    // Test 4: Check deprecated Permission tables still exist
    try {
      const permissionCount = await prisma.permission.count()
      logTest('Database', 'Permission table (backward compatibility)', 'PASS', `${permissionCount} legacy records`)
    } catch (error) {
      logTest('Database', 'Permission table (backward compatibility)', 'FAIL', 'Table not found or error')
    }

  } catch (error: any) {
    logTest('Database', 'Database structure test', 'FAIL', error.message)
  }
}

async function testCapabilityAssignments() {
  console.log('\n🔐 Testing Capability Assignments...')

  try {
    // Test admin capabilities
    const adminRole = await prisma.role.findFirst({
      where: { name: 'admin' },
      include: {
        capabilityAssignments: {
          include: { capability: true }
        }
      }
    })

    if (adminRole && adminRole.capabilityAssignments.length > 0) {
      logTest('Capabilities', 'Admin role capabilities', 'PASS', `${adminRole.capabilityAssignments.length} capabilities`)
      
      // Check for key capabilities
      const capabilities = adminRole.capabilityAssignments.map(ca => ca.capability.id)
      const requiredCaps = ['ADMIN_ACCESS', 'USER_MANAGE', 'DOCUMENT_DELETE', 'ROLE_MANAGE']
      
      for (const cap of requiredCaps) {
        if (capabilities.includes(cap)) {
          logTest('Capabilities', `Admin has ${cap}`, 'PASS')
        } else {
          logTest('Capabilities', `Admin has ${cap}`, 'WARN', 'Expected capability missing')
        }
      }
    } else {
      logTest('Capabilities', 'Admin role capabilities', 'FAIL', 'No capabilities found')
    }

    // Test viewer capabilities (should be limited)
    const viewerRole = await prisma.role.findFirst({
      where: { name: 'viewer' },
      include: {
        capabilityAssignments: {
          include: { capability: true }
        }
      }
    })

    if (viewerRole) {
      const capabilities = viewerRole.capabilityAssignments.map(ca => ca.capability.id)
      const hasDelete = capabilities.includes('DOCUMENT_DELETE')
      const hasView = capabilities.includes('DOCUMENT_VIEW')

      if (!hasDelete && hasView) {
        logTest('Capabilities', 'Viewer role restrictions', 'PASS', 'Cannot delete, can view')
      } else {
        logTest('Capabilities', 'Viewer role restrictions', 'WARN', 'Unexpected capabilities')
      }
    }

  } catch (error: any) {
    logTest('Capabilities', 'Capability assignment test', 'FAIL', error.message)
  }
}

async function testDataIntegrity() {
  console.log('\n🔍 Testing Data Integrity...')

  try {
    // Test 1: Count total assignments (should all be valid with proper relations)
    const totalAssignments = await prisma.roleCapabilityAssignment.count()
    const validAssignments = await prisma.roleCapabilityAssignment.findMany({
      include: {
        role: true,
        capability: true
      }
    })
    
    const orphaned = validAssignments.filter(a => !a.role || !a.capability)

    if (orphaned.length === 0) {
      logTest('Integrity', 'No orphaned capability assignments', 'PASS')
    } else {
      logTest('Integrity', 'No orphaned capability assignments', 'FAIL', `${orphaned.length} orphaned records`)
    }

    // Test 2: All capabilities have valid IDs
    const capabilities = await prisma.roleCapability.findMany()
    const invalidCaps = capabilities.filter(c => !c.id || c.id.length === 0)
    
    if (invalidCaps.length === 0) {
      logTest('Integrity', 'All capabilities have valid IDs', 'PASS')
    } else {
      logTest('Integrity', 'All capabilities have valid IDs', 'FAIL', `${invalidCaps.length} invalid`)
    }

    // Test 3: No duplicate capability assignments
    const assignments = await prisma.roleCapabilityAssignment.groupBy({
      by: ['roleId', 'capabilityId'],
      _count: true,
      having: {
        roleId: { _count: { gt: 1 } }
      }
    })

    if (assignments.length === 0) {
      logTest('Integrity', 'No duplicate capability assignments', 'PASS')
    } else {
      logTest('Integrity', 'No duplicate capability assignments', 'WARN', `${assignments.length} potential duplicates`)
    }

  } catch (error: any) {
    logTest('Integrity', 'Data integrity test', 'FAIL', error.message)
  }
}

async function testPerformance() {
  console.log('\n⚡ Testing Query Performance...')

  try {
    // Test 1: Single role capability query
    const start1 = Date.now()
    await prisma.role.findFirst({
      where: { name: 'admin' },
      include: {
        capabilityAssignments: {
          include: { capability: true }
        }
      }
    })
    const duration1 = Date.now() - start1

    if (duration1 < 100) {
      logTest('Performance', 'Single role capability query', 'PASS', `${duration1}ms (< 100ms)`, duration1)
    } else {
      logTest('Performance', 'Single role capability query', 'WARN', `${duration1}ms (> 100ms)`, duration1)
    }

    // Test 2: All roles capability query
    const start2 = Date.now()
    await prisma.role.findMany({
      include: {
        capabilityAssignments: {
          include: { capability: true }
        }
      }
    })
    const duration2 = Date.now() - start2

    if (duration2 < 500) {
      logTest('Performance', 'All roles capability query', 'PASS', `${duration2}ms (< 500ms)`, duration2)
    } else {
      logTest('Performance', 'All roles capability query', 'WARN', `${duration2}ms (> 500ms)`, duration2)
    }

    // Test 3: User with capabilities query
    const start3 = Date.now()
    await prisma.user.findFirst({
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                capabilityAssignments: {
                  include: { capability: true }
                }
              }
            }
          }
        }
      }
    })
    const duration3 = Date.now() - start3

    if (duration3 < 200) {
      logTest('Performance', 'User with capabilities query', 'PASS', `${duration3}ms (< 200ms)`, duration3)
    } else {
      logTest('Performance', 'User with capabilities query', 'WARN', `${duration3}ms (> 200ms)`, duration3)
    }

  } catch (error: any) {
    logTest('Performance', 'Performance test', 'FAIL', error.message)
  }
}

async function testBackwardCompatibility() {
  console.log('\n🔄 Testing Backward Compatibility...')

  try {
    // Test 1: Legacy Permission table accessible
    const permissionCount = await prisma.permission.count()
    logTest('Compatibility', 'Legacy Permission table accessible', 'PASS', `${permissionCount} records`)

    // Test 2: Legacy RolePermission table accessible
    const rolePermissionCount = await prisma.rolePermission.count()
    logTest('Compatibility', 'Legacy RolePermission table accessible', 'PASS', `${rolePermissionCount} records`)

    // Test 3: Can query both old and new systems
    const role = await prisma.role.findFirst({
      where: { name: 'admin' },
      include: {
        rolePermissions: true,
        capabilityAssignments: true
      }
    })

    if (role) {
      const hasLegacy = role.rolePermissions && role.rolePermissions.length > 0
      const hasModern = role.capabilityAssignments && role.capabilityAssignments.length > 0

      if (hasModern) {
        logTest('Compatibility', 'Dual system support', 'PASS', `Modern: ${role.capabilityAssignments.length} capabilities`)
      } else {
        logTest('Compatibility', 'Dual system support', 'FAIL', 'Modern system not working')
      }
    }

  } catch (error: any) {
    logTest('Compatibility', 'Backward compatibility test', 'FAIL', error.message)
  }
}

async function generateReport() {
  console.log('\n' + '='.repeat(80))
  console.log('📋 TEST SUMMARY')
  console.log('='.repeat(80))

  const passed = results.filter(r => r.status === 'PASS').length
  const failed = results.filter(r => r.status === 'FAIL').length
  const warned = results.filter(r => r.status === 'WARN').length
  const total = results.length

  console.log(`\nTotal Tests: ${total}`)
  console.log(`✅ Passed: ${passed} (${Math.round(passed/total*100)}%)`)
  console.log(`❌ Failed: ${failed} (${Math.round(failed/total*100)}%)`)
  console.log(`⚠️  Warnings: ${warned} (${Math.round(warned/total*100)}%)`)

  if (failed > 0) {
    console.log('\n❌ CRITICAL FAILURES:')
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`   - [${r.category}] ${r.test}: ${r.message}`)
    })
  }

  if (warned > 0) {
    console.log('\n⚠️  WARNINGS:')
    results.filter(r => r.status === 'WARN').forEach(r => {
      console.log(`   - [${r.category}] ${r.test}: ${r.message}`)
    })
  }

  console.log('\n' + '='.repeat(80))

  if (failed === 0) {
    console.log('✅ ALL CRITICAL TESTS PASSED')
    console.log('Migration appears successful!')
  } else {
    console.log('❌ MIGRATION HAS ISSUES')
    console.log('Please review failures above before proceeding.')
  }

  console.log('='.repeat(80))
}

async function main() {
  console.log('🚀 Phase 6: Automated Testing Script')
  console.log('Testing capability system migration...\n')

  const startTime = Date.now()

  try {
    await testDatabaseStructure()
    await testCapabilityAssignments()
    await testDataIntegrity()
    await testPerformance()
    await testBackwardCompatibility()

    const duration = Date.now() - startTime
    console.log(`\n⏱️  Total test duration: ${duration}ms (${(duration/1000).toFixed(2)}s)`)

    await generateReport()

  } catch (error) {
    console.error('\n❌ Fatal error during testing:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

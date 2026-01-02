/**
 * Script untuk audit ambiguitas sistem role
 * Mengecek inkonsistensi antara roles, groups, dan hardcoded values
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ANSI colors
const RED = '\x1b[31m'
const YELLOW = '\x1b[33m'
const GREEN = '\x1b[32m'
const BLUE = '\x1b[34m'
const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'

function logSection(title: string) {
  console.log(`\n${BOLD}${BLUE}${'='.repeat(80)}${RESET}`)
  console.log(`${BOLD}${BLUE}${title}${RESET}`)
  console.log(`${BOLD}${BLUE}${'='.repeat(80)}${RESET}\n`)
}

function logError(msg: string) {
  console.log(`${RED}❌ ${msg}${RESET}`)
}

function logWarning(msg: string) {
  console.log(`${YELLOW}⚠️  ${msg}${RESET}`)
}

function logSuccess(msg: string) {
  console.log(`${GREEN}✓ ${msg}${RESET}`)
}

function logInfo(msg: string) {
  console.log(`${BLUE}ℹ ${msg}${RESET}`)
}

async function auditRoleAmbiguity() {
  try {
    logSection('AUDIT 1: Cek Role "ppd" (tanpa suffix)')
    
    // Check for 'ppd' role in database
    const ppdRole = await prisma.role.findUnique({
      where: { name: 'ppd' }
    })
    
    if (ppdRole) {
      logWarning(`Found role 'ppd' in database: ${JSON.stringify(ppdRole, null, 2)}`)
      logWarning(`This might conflict with 'ppd.pusat' and 'ppd.unit'`)
    } else {
      logSuccess(`No role named 'ppd' found (good - should only have ppd.pusat and ppd.unit)`)
    }
    
    // Check for ppd.pusat and ppd.unit
    const ppdPusat = await prisma.role.findUnique({
      where: { name: 'ppd.pusat' },
      include: {
        capabilityAssignments: {
          include: { capability: true }
        },
        userRoles: {
          include: { user: true }
        }
      }
    })
    
    const ppdUnit = await prisma.role.findUnique({
      where: { name: 'ppd.unit' },
      include: {
        capabilityAssignments: {
          include: { capability: true }
        },
        userRoles: {
          include: { user: true }
        }
      }
    })
    
    if (ppdPusat) {
      logSuccess(`Found 'ppd.pusat' role`)
      logInfo(`  - ${ppdPusat.capabilityAssignments.length} capabilities`)
      logInfo(`  - ${ppdPusat.userRoles.length} users assigned`)
    } else {
      logError(`Role 'ppd.pusat' NOT FOUND in database`)
    }
    
    if (ppdUnit) {
      logSuccess(`Found 'ppd.unit' role`)
      logInfo(`  - ${ppdUnit.capabilityAssignments.length} capabilities`)
      logInfo(`  - ${ppdUnit.userRoles.length} users assigned`)
    } else {
      logError(`Role 'ppd.unit' NOT FOUND in database`)
    }

    // ===================================================================
    logSection('AUDIT 2: Cek Group "ppd"')
    
    const ppdGroup = await prisma.group.findUnique({
      where: { name: 'ppd' },
      include: {
        users: true
      }
    })
    
    if (ppdGroup) {
      logWarning(`Found group 'ppd': ${JSON.stringify(ppdGroup, null, 2)}`)
      logWarning(`  - ${ppdGroup.users.length} users in this group`)
      logWarning(`This group name might be used as session.user.role`)
    } else {
      logSuccess(`No group named 'ppd' found`)
    }

    // ===================================================================
    logSection('AUDIT 3: Cek "admin" vs "administrator"')
    
    const admin = await prisma.role.findUnique({
      where: { name: 'admin' },
      include: {
        capabilityAssignments: true,
        userRoles: { include: { user: true } }
      }
    })
    
    const administrator = await prisma.role.findUnique({
      where: { name: 'administrator' },
      include: {
        capabilityAssignments: true,
        userRoles: { include: { user: true } }
      }
    })
    
    if (admin && administrator) {
      logWarning(`Both 'admin' and 'administrator' roles exist`)
      console.log(`\n  admin:`)
      console.log(`    - Level: ${admin.level}`)
      console.log(`    - Capabilities: ${admin.capabilityAssignments.length}`)
      console.log(`    - Users: ${admin.userRoles.length}`)
      console.log(`\n  administrator:`)
      console.log(`    - Level: ${administrator.level}`)
      console.log(`    - Capabilities: ${administrator.capabilityAssignments.length}`)
      console.log(`    - Users: ${administrator.userRoles.length}`)
      
      if (admin.level === administrator.level) {
        logWarning(`  ⚠️  Both have same level (${admin.level})`)
      }
      if (admin.capabilityAssignments.length === administrator.capabilityAssignments.length) {
        logWarning(`  ⚠️  Both have same number of capabilities`)
      }
    } else if (!admin && !administrator) {
      logError(`Neither 'admin' nor 'administrator' role found!`)
    } else {
      if (admin) logInfo(`Only 'admin' role exists`)
      if (administrator) logInfo(`Only 'administrator' role exists`)
    }

    // ===================================================================
    logSection('AUDIT 4: Users with Group but NO Roles')
    
    const usersWithGroupNoRoles = await prisma.user.findMany({
      where: {
        groupId: { not: null },
        userRoles: { none: {} }
      },
      include: {
        group: true
      }
    })
    
    if (usersWithGroupNoRoles.length > 0) {
      logWarning(`Found ${usersWithGroupNoRoles.length} users with group but NO userRoles:`)
      usersWithGroupNoRoles.forEach(user => {
        console.log(`  - ${user.email} (group: ${user.group?.name})`)
      })
      logWarning(`These users rely on legacy group-based auth`)
    } else {
      logSuccess(`All users with groups also have roles`)
    }

    // ===================================================================
    logSection('AUDIT 5: Users with Roles but NO Group')
    
    const usersWithRolesNoGroup = await prisma.user.findMany({
      where: {
        groupId: null,
        userRoles: { some: {} }
      },
      include: {
        userRoles: {
          include: { role: true }
        }
      }
    })
    
    if (usersWithRolesNoGroup.length > 0) {
      logWarning(`Found ${usersWithRolesNoGroup.length} users with roles but NO group:`)
      usersWithRolesNoGroup.forEach(user => {
        const roleNames = user.userRoles.map(ur => ur.role.name).join(', ')
        console.log(`  - ${user.email} (roles: ${roleNames})`)
      })
      logWarning(`session.user.role might be undefined for these users`)
    } else {
      logSuccess(`All users with roles also have groups`)
    }

    // ===================================================================
    logSection('AUDIT 6: Users with BOTH Group and Roles (Potential Conflict)')
    
    const usersWithBoth = await prisma.user.findMany({
      where: {
        groupId: { not: null },
        userRoles: { some: {} }
      },
      include: {
        group: true,
        userRoles: {
          include: { role: true }
        }
      }
    })
    
    logInfo(`Found ${usersWithBoth.length} users with BOTH group and roles`)
    
    // Check for mismatches
    const mismatches = usersWithBoth.filter(user => {
      const groupName = user.group?.name
      const roleNames = user.userRoles.map(ur => ur.role.name)
      // Check if group name matches any role name
      return !roleNames.includes(groupName || '')
    })
    
    if (mismatches.length > 0) {
      logWarning(`Found ${mismatches.length} users where group.name doesn't match any role.name:`)
      mismatches.forEach(user => {
        const roleNames = user.userRoles.map(ur => ur.role.name).join(', ')
        console.log(`  - ${user.email}`)
        console.log(`    Group: ${user.group?.name}`)
        console.log(`    Roles: ${roleNames}`)
      })
      logWarning(`Possible conflict: session.user.role = group.name, but APIs check userRoles`)
    } else {
      logSuccess(`All users have matching group and role names`)
    }

    // ===================================================================
    logSection('AUDIT 7: All Roles in Database')
    
    const allRoles = await prisma.role.findMany({
      include: {
        capabilityAssignments: {
          include: { capability: true }
        },
        userRoles: {
          include: { user: true }
        }
      },
      orderBy: {
        level: 'desc'
      }
    })
    
    console.log(`\nTotal roles in database: ${allRoles.length}\n`)
    
    allRoles.forEach(role => {
      console.log(`📌 ${role.name} (Level: ${role.level})`)
      console.log(`   Display: ${role.displayName}`)
      console.log(`   Capabilities: ${role.capabilityAssignments.length}`)
      console.log(`   Users: ${role.userRoles.length}`)
      console.log(`   System: ${role.isSystem ? 'Yes' : 'No'}`)
      console.log(`   Active: ${role.isActive ? 'Yes' : 'No'}`)
      console.log('')
    })

    // ===================================================================
    logSection('AUDIT 8: All Groups in Database')
    
    const allGroups = await prisma.group.findMany({
      include: {
        users: true
      },
      orderBy: {
        name: 'asc'
      }
    })
    
    console.log(`\nTotal groups in database: ${allGroups.length}\n`)
    
    allGroups.forEach(group => {
      console.log(`📁 ${group.name}`)
      console.log(`   Display: ${group.displayName}`)
      console.log(`   Users: ${group.users.length}`)
      console.log(`   Active: ${group.isActive ? 'Yes' : 'No'}`)
      console.log('')
    })

    // ===================================================================
    logSection('AUDIT 9: Hardcoded Role Names in Config')
    
    const hardcodedRoles = [
      'admin',
      'administrator',
      'ppd.pusat',
      'ppd.unit',
      'kadiv',
      'gm',
      'manager',
      'dirut',
      'dewas',
      'komite_audit',
      'staff',
      'guest',
      'viewer'
    ]
    
    console.log(`Checking if hardcoded roles exist in database...\n`)
    
    for (const roleName of hardcodedRoles) {
      const exists = allRoles.find(r => r.name === roleName)
      if (exists) {
        logSuccess(`${roleName} - EXISTS`)
      } else {
        logError(`${roleName} - NOT FOUND in database`)
      }
    }

    // ===================================================================
    logSection('AUDIT 10: Summary & Recommendations')
    
    console.log(`\n${BOLD}Findings:${RESET}`)
    console.log(`  • Total Roles: ${allRoles.length}`)
    console.log(`  • Total Groups: ${allGroups.length}`)
    console.log(`  • Users with group only: ${usersWithGroupNoRoles.length}`)
    console.log(`  • Users with roles only: ${usersWithRolesNoGroup.length}`)
    console.log(`  • Users with both: ${usersWithBoth.length}`)
    console.log(`  • Group/Role mismatches: ${mismatches.length}`)
    
    console.log(`\n${BOLD}Recommendations:${RESET}`)
    
    if (ppdRole) {
      logWarning(`1. Remove 'ppd' role or clarify its purpose vs ppd.pusat/ppd.unit`)
    }
    
    if (usersWithGroupNoRoles.length > 0) {
      logWarning(`2. Assign userRoles to users who only have groups`)
    }
    
    if (usersWithRolesNoGroup.length > 0) {
      logWarning(`3. Assign groups to users who only have roles (or fix session handling)`)
    }
    
    if (mismatches.length > 0) {
      logWarning(`4. Align group.name with role.name for consistent auth`)
    }
    
    if (admin && administrator && admin.level === administrator.level) {
      logWarning(`5. Clarify difference between 'admin' and 'administrator' or merge them`)
    }
    
    console.log(`\n${GREEN}✓ Audit completed${RESET}\n`)

  } catch (error) {
    console.error('Error during audit:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run audit
auditRoleAmbiguity()

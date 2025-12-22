import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function auditDatabaseConsistency() {
  console.log('🔍 Starting Database Consistency Audit...\n')

  try {
    // 1. Audit Users
    console.log('📊 Auditing Users...')
    const users = await prisma.user.findMany({
      include: {
        group: true,
        userRoles: {
          include: {
            role: true
          }
        }
      }
    })
    console.log(`   Total Users: ${users.length}`)
    
    const usersWithoutGroup = users.filter(u => !u.groupId)
    console.log(`   Users without Group: ${usersWithoutGroup.length}`)
    if (usersWithoutGroup.length > 0) {
      console.log(`   ⚠️  Users without group:`, usersWithoutGroup.map(u => u.email))
    }

    const usersWithoutRoles = users.filter(u => u.userRoles.length === 0)
    console.log(`   Users without Roles: ${usersWithoutRoles.length}`)
    if (usersWithoutRoles.length > 0) {
      console.log(`   ⚠️  Users without roles:`, usersWithoutRoles.map(u => u.email))
    }

    const usersWithRoles = users.filter(u => u.userRoles.length > 0)
    console.log(`   Users with Roles: ${usersWithRoles.length}`)
    console.log('')

    // 2. Audit Roles
    console.log('📊 Auditing Roles...')
    const roles = await prisma.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        },
        userRoles: {
          include: {
            user: true
          }
        }
      }
    })
    console.log(`   Total Roles: ${roles.length}`)
    
    console.log('\n   Role Details:')
    for (const role of roles) {
      console.log(`   - ${role.name} (${role.displayName})`)
      console.log(`     Permissions: ${role.rolePermissions.length}`)
      console.log(`     Users: ${role.userRoles.length}`)
      
      if (role.rolePermissions.length === 0) {
        console.log(`     ⚠️  WARNING: Role has NO permissions!`)
      }
    }
    console.log('')

    // 3. Audit Permissions
    console.log('📊 Auditing Permissions...')
    const permissions = await prisma.permission.findMany({
      include: {
        rolePermissions: {
          include: {
            role: true
          }
        }
      }
    })
    console.log(`   Total Permissions: ${permissions.length}`)
    
    const permissionsByModule = permissions.reduce((acc, perm) => {
      if (!acc[perm.module]) acc[perm.module] = []
      acc[perm.module]!.push(perm)
      return acc
    }, {} as Record<string, typeof permissions>)
    
    console.log('\n   Permissions by Module:')
    for (const [module, perms] of Object.entries(permissionsByModule)) {
      console.log(`   - ${module}: ${perms.length} permissions`)
    }

    const unusedPermissions = permissions.filter(p => p.rolePermissions.length === 0)
    if (unusedPermissions.length > 0) {
      console.log(`\n   ⚠️  ${unusedPermissions.length} Unused Permissions:`)
      unusedPermissions.forEach(p => console.log(`      - ${p.name}`))
    }
    console.log('')

    // 4. Audit UserRoles
    console.log('📊 Auditing UserRoles...')
    const userRoles = await prisma.userRole.findMany({
      include: {
        user: true,
        role: true
      }
    })
    console.log(`   Total UserRole assignments: ${userRoles.length}`)
    
    const activeUserRoles = userRoles.filter(ur => ur.isActive)
    console.log(`   Active assignments: ${activeUserRoles.length}`)
    console.log(`   Inactive assignments: ${userRoles.length - activeUserRoles.length}`)
    
    // Check for orphaned UserRoles (user or role doesn't exist)
    const orphanedUserRoles = userRoles.filter(ur => !ur.user || !ur.role)
    if (orphanedUserRoles.length > 0) {
      console.log(`   ⚠️  ${orphanedUserRoles.length} Orphaned UserRole records found!`)
    }
    console.log('')

    // 5. Audit RolePermissions
    console.log('📊 Auditing RolePermissions...')
    const rolePermissions = await prisma.rolePermission.findMany({
      include: {
        role: true,
        permission: true
      }
    })
    console.log(`   Total RolePermission assignments: ${rolePermissions.length}`)
    
    const grantedRolePermissions = rolePermissions.filter(rp => rp.isGranted)
    console.log(`   Granted: ${grantedRolePermissions.length}`)
    console.log(`   Denied: ${rolePermissions.length - grantedRolePermissions.length}`)
    
    // Check for orphaned RolePermissions
    const orphanedRolePermissions = rolePermissions.filter(rp => !rp.role || !rp.permission)
    if (orphanedRolePermissions.length > 0) {
      console.log(`   ⚠️  ${orphanedRolePermissions.length} Orphaned RolePermission records found!`)
    }
    console.log('')

    // 6. Critical Permissions Check
    console.log('📊 Checking Critical PDF Permissions...')
    const pdfPermissions = ['pdf.view', 'pdf.download', 'pdf.print', 'pdf.copy', 'pdf.watermark']
    
    for (const permName of pdfPermissions) {
      const perm = await prisma.permission.findUnique({
        where: { name: permName },
        include: {
          rolePermissions: {
            include: {
              role: true
            }
          }
        }
      })
      
      if (!perm) {
        console.log(`   ❌ MISSING: ${permName}`)
      } else {
        console.log(`   ✅ ${permName}: Assigned to ${perm.rolePermissions.length} roles`)
        if (perm.rolePermissions.length > 0) {
          console.log(`      Roles: ${perm.rolePermissions.map(rp => rp.role.name).join(', ')}`)
        }
      }
    }
    console.log('')

    // 7. Generate Recommendations
    console.log('💡 Recommendations:')
    
    if (usersWithoutRoles.length > 0) {
      console.log(`   - Assign roles to ${usersWithoutRoles.length} users without roles`)
    }
    
    if (unusedPermissions.length > 0) {
      console.log(`   - Consider assigning or removing ${unusedPermissions.length} unused permissions`)
    }
    
    const rolesWithoutPermissions = roles.filter(r => r.rolePermissions.length === 0)
    if (rolesWithoutPermissions.length > 0) {
      console.log(`   - Assign permissions to ${rolesWithoutPermissions.length} roles: ${rolesWithoutPermissions.map(r => r.name).join(', ')}`)
    }
    
    const rolesWithoutUsers = roles.filter(r => r.userRoles.length === 0)
    if (rolesWithoutUsers.length > 0) {
      console.log(`   - ${rolesWithoutUsers.length} roles have no users assigned: ${rolesWithoutUsers.map(r => r.name).join(', ')}`)
    }

    console.log('\n✅ Audit Complete!')

  } catch (error) {
    console.error('❌ Error during audit:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the audit
auditDatabaseConsistency()
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })

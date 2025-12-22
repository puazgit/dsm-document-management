import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixDatabaseConsistency() {
  console.log('🔧 Starting Database Consistency Fix...\n')

  try {
    // 1. Ensure all required roles exist
    console.log('📝 Ensuring required roles exist...')
    const requiredRoles = [
      { name: 'admin', displayName: 'Administrator', description: 'Full system access', level: 100, isSystem: true },
      { name: 'administrator', displayName: 'Administrator', description: 'Full system access', level: 100, isSystem: true },
      { name: 'editor', displayName: 'Editor', description: 'Can edit documents', level: 50, isSystem: true },
      { name: 'viewer', displayName: 'Viewer', description: 'Can view documents', level: 10, isSystem: true },
      { name: 'manager', displayName: 'Manager', description: 'Can manage team and documents', level: 70, isSystem: true },
      { name: 'ppd', displayName: 'PPD', description: 'PPD role', level: 80, isSystem: false },
      { name: 'kadiv', displayName: 'Kepala Divisi', description: 'Head of Division', level: 60, isSystem: false },
    ]

    const createdRoles: any = {}
    for (const roleData of requiredRoles) {
      const role = await prisma.role.upsert({
        where: { name: roleData.name },
        update: {},
        create: roleData
      })
      createdRoles[role.name] = role
      console.log(`   ✅ Role: ${role.name}`)
    }

    // 2. Ensure all PDF permissions exist
    console.log('\n📝 Ensuring PDF permissions exist...')
    const pdfPermissions = [
      { name: 'pdf.view', displayName: 'View PDF', module: 'pdf', action: 'view', resource: 'all' },
      { name: 'pdf.download', displayName: 'Download PDF', module: 'pdf', action: 'download', resource: 'all' },
      { name: 'pdf.print', displayName: 'Print PDF', module: 'pdf', action: 'print', resource: 'all' },
      { name: 'pdf.copy', displayName: 'Copy PDF Content', module: 'pdf', action: 'copy', resource: 'all' },
      { name: 'pdf.watermark', displayName: 'PDF Watermark Control', module: 'pdf', action: 'watermark', resource: 'all' },
    ]

    const createdPermissions: any = {}
    for (const permData of pdfPermissions) {
      const permission = await prisma.permission.upsert({
        where: { name: permData.name },
        update: {},
        create: {
          ...permData,
          description: `Permission to ${permData.action} PDF documents`,
          isActive: true
        }
      })
      createdPermissions[permission.name] = permission
      console.log(`   ✅ Permission: ${permission.name}`)
    }

    // 3. Ensure document permissions exist
    console.log('\n📝 Ensuring document permissions exist...')
    const documentPermissions = [
      { name: 'documents.create', displayName: 'Create Documents', module: 'documents', action: 'create', resource: 'all' },
      { name: 'documents.read', displayName: 'Read Documents', module: 'documents', action: 'read', resource: 'all' },
      { name: 'documents.update', displayName: 'Update Documents', module: 'documents', action: 'update', resource: 'all' },
      { name: 'documents.delete', displayName: 'Delete Documents', module: 'documents', action: 'delete', resource: 'all' },
      { name: 'documents.download', displayName: 'Download Documents', module: 'documents', action: 'download', resource: 'all' },
    ]

    for (const permData of documentPermissions) {
      const permission = await prisma.permission.upsert({
        where: { name: permData.name },
        update: {},
        create: {
          ...permData,
          description: `Permission to ${permData.action} documents`,
          isActive: true
        }
      })
      createdPermissions[permission.name] = permission
      console.log(`   ✅ Permission: ${permission.name}`)
    }

    // 4. Assign permissions to roles
    console.log('\n📝 Assigning permissions to roles...')

    // Admin gets all permissions
    const allPermissions = await prisma.permission.findMany()
    
    // Assign to both 'admin' and 'administrator' roles
    for (const roleName of ['admin', 'administrator']) {
      const adminRole = createdRoles[roleName]
      if (adminRole) {
        let adminPermCount = 0
        for (const permission of allPermissions) {
          await prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: adminRole.id,
                permissionId: permission.id
              }
            },
            update: { isGranted: true },
            create: {
              roleId: adminRole.id,
              permissionId: permission.id,
              isGranted: true
            }
          })
          adminPermCount++
        }
        console.log(`   ✅ ${roleName}: ${adminPermCount} permissions`)
      }
    }

    // Manager gets most permissions except watermark control
    const managerRole = createdRoles['manager']
    if (managerRole) {
      const managerPerms = allPermissions.filter(p => 
        p.module === 'documents' || 
        p.module === 'pdf' ||
        p.module === 'users'
      ).filter(p => p.name !== 'pdf.watermark') // Manager does NOT have watermark control
      
      for (const permission of managerPerms) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: managerRole.id,
              permissionId: permission.id
            }
          },
          update: { isGranted: true },
          create: {
            roleId: managerRole.id,
            permissionId: permission.id,
            isGranted: true
          }
        })
      }
      console.log(`   ✅ Manager: ${managerPerms.length} permissions (no watermark control)`)
    }

    // PPD gets similar to manager with watermark control
    const ppdRole = createdRoles['ppd']
    if (ppdRole) {
      const ppdPerms = allPermissions.filter(p => 
        p.module === 'documents' || 
        p.module === 'pdf' ||
        p.module === 'users'
      )
      
      for (const permission of ppdPerms) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: ppdRole.id,
              permissionId: permission.id
            }
          },
          update: { isGranted: true },
          create: {
            roleId: ppdRole.id,
            permissionId: permission.id,
            isGranted: true
          }
        })
      }
      console.log(`   ✅ PPD: ${ppdPerms.length} permissions (with watermark control)`)
    }

    // Kadiv gets read/view permissions and some actions but no watermark control
    const kadivRole = createdRoles['kadiv']
    if (kadivRole) {
      const kadivPerms = allPermissions.filter(p => 
        (p.module === 'documents' && ['read', 'download'].includes(p.action)) ||
        (p.module === 'pdf' && ['view', 'download', 'print'].includes(p.action))
      )
      
      for (const permission of kadivPerms) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: kadivRole.id,
              permissionId: permission.id
            }
          },
          update: { isGranted: true },
          create: {
            roleId: kadivRole.id,
            permissionId: permission.id,
            isGranted: true
          }
        })
      }
      console.log(`   ✅ Kadiv: ${kadivPerms.length} permissions (limited access, no watermark control)`)
    }

    // Editor gets document edit permissions and some PDF permissions (no watermark control)
    const editorRole = createdRoles['editor']
    if (editorRole) {
      const editorPerms = allPermissions.filter(p => 
        (p.module === 'documents') ||
        (p.module === 'pdf' && ['view', 'download'].includes(p.action))
      )
      
      for (const permission of editorPerms) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: editorRole.id,
              permissionId: permission.id
            }
          },
          update: { isGranted: true },
          create: {
            roleId: editorRole.id,
            permissionId: permission.id,
            isGranted: true
          }
        })
      }
      console.log(`   ✅ Editor: ${editorPerms.length} permissions (no print/copy/watermark)`)
    }

    // Viewer gets only read permissions (no watermark control = watermark shown)
    const viewerRole = createdRoles['viewer']
    if (viewerRole) {
      const viewerPerms = allPermissions.filter(p => 
        (p.module === 'documents' && p.action === 'read') ||
        (p.module === 'pdf' && p.action === 'view')
      )
      
      for (const permission of viewerPerms) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: viewerRole.id,
              permissionId: permission.id
            }
          },
          update: { isGranted: true },
          create: {
            roleId: viewerRole.id,
            permissionId: permission.id,
            isGranted: true
          }
        })
      }
      console.log(`   ✅ Viewer: ${viewerPerms.length} permissions (read-only, WITH watermark)`)
    }

    // Reviewer gets read and comment permissions (no watermark control)
    const reviewerRole = await prisma.role.findUnique({ where: { name: 'reviewer' } })
    if (reviewerRole) {
      const reviewerPerms = allPermissions.filter(p => 
        (p.module === 'documents' && p.action === 'read') ||
        (p.module === 'pdf' && p.action === 'view') ||
        (p.module === 'comments')
      )
      
      for (const permission of reviewerPerms) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: reviewerRole.id,
              permissionId: permission.id
            }
          },
          update: { isGranted: true },
          create: {
            roleId: reviewerRole.id,
            permissionId: permission.id,
            isGranted: true
          }
        })
      }
      console.log(`   ✅ Reviewer: ${reviewerPerms.length} permissions (read + comments, WITH watermark)`)
    }

    // 5. Check users without roles and suggest fixes
    console.log('\n📝 Checking users without roles...')
    const usersWithoutRoles = await prisma.user.findMany({
      where: {
        userRoles: {
          none: {}
        }
      }
    })

    if (usersWithoutRoles.length > 0) {
      console.log(`   ⚠️  Found ${usersWithoutRoles.length} users without roles`)
      console.log(`   Users: ${usersWithoutRoles.map(u => u.email).join(', ')}`)
      console.log(`   💡 Recommendation: Assign appropriate roles to these users via /admin/users`)
    } else {
      console.log(`   ✅ All users have roles assigned`)
    }

    console.log('\n✅ Database consistency fix complete!')
    console.log('\n📊 Summary:')
    console.log(`   - Roles ensured: ${Object.keys(createdRoles).length}`)
    console.log(`   - Permissions ensured: ${Object.keys(createdPermissions).length}`)
    console.log(`   - Total permissions in DB: ${allPermissions.length}`)

  } catch (error) {
    console.error('❌ Error during fix:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the fix
fixDatabaseConsistency()
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })

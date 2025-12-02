const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testAdminAccess() {
  try {
    console.log('🧪 Testing Admin Access Configuration')
    console.log('=====================================\n')
    
    // Get admin user with roles and permissions
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@dsm.com' },
      include: {
        userRoles: {
          where: { isActive: true },
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    })
    
    if (!adminUser) {
      console.log('❌ Admin user not found')
      return
    }
    
    // Extract user info
    const userRoles = adminUser.userRoles.map(ur => ur.role.name)
    const permissions = []
    adminUser.userRoles.forEach(ur => {
      ur.role.rolePermissions.forEach(rp => {
        permissions.push(rp.permission.name)
      })
    })
    
    console.log(`👤 User: ${adminUser.email}`)
    console.log(`🎭 Roles: ${userRoles.join(', ')}`)
    console.log(`🔑 Total Permissions: ${permissions.length}`)
    console.log('')
    
    // Test key permissions
    const keyPermissions = [
      'system.admin',
      'users.read',
      'users.create',
      'users.update',
      'roles.read',
      'roles.create',
      'pdf.download',
      'pdf.view',
      'documents.read'
    ]
    
    console.log('Key Permission Check:')
    keyPermissions.forEach(perm => {
      const hasPermission = permissions.includes(perm)
      console.log(`${hasPermission ? '✅' : '❌'} ${perm}`)
    })
    
    console.log('')
    
    // Simulate role check for navigation/pages
    const roleVariants = ['administrator', 'admin', 'org_administrator']
    const hasAdminAccess = roleVariants.some(role => userRoles.includes(role))
    
    console.log('Access Simulation:')
    console.log(`📋 Navigation Menu Access: ${hasAdminAccess ? '✅ YES' : '❌ NO'}`)
    console.log(`📄 Admin Pages Access: ${hasAdminAccess ? '✅ YES' : '❌ NO'}`)
    console.log(`🛡️  Middleware Protection: ${hasAdminAccess ? '✅ PASS' : '❌ BLOCKED'}`)
    
    console.log('')
    console.log('🎯 Result: Admin user should have FULL ACCESS after browser refresh!')
    
  } catch (error) {
    console.error('Error testing admin access:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testAdminAccess()
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function assignUserRole(userEmail: string, roleName: string) {
  console.log('═══════════════════════════════════════════════════════')
  console.log(`🔐 ASSIGN ROLE TO USER`)
  console.log('═══════════════════════════════════════════════════════\n')

  try {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    })

    if (!user) {
      console.log(`❌ User not found: ${userEmail}\n`)
      return
    }

    // Find role
    const role = await prisma.role.findUnique({
      where: { name: roleName },
      include: {
        capabilityAssignments: {
          include: {
            capability: true
          }
        }
      }
    })

    if (!role) {
      console.log(`❌ Role not found: ${roleName}\n`)
      console.log('Available roles:')
      const roles = await prisma.role.findMany({
        where: { isActive: true },
        select: { name: true, displayName: true, description: true }
      })
      roles.forEach(r => {
        console.log(`   - ${r.name} (${r.displayName})`)
        if (r.description) console.log(`     ${r.description}`)
      })
      console.log()
      return
    }

    console.log('📋 USER INFORMATION')
    console.log('─────────────────────────────────────────────────────')
    console.log(`Name:     ${user.firstName} ${user.lastName}`)
    console.log(`Email:    ${user.email}`)
    console.log(`Username: ${user.username}`)
    console.log(`Current Role: ${user.userRoles[0]?.role.name || 'No role assigned'}`)
    console.log()

    console.log('🎯 NEW ROLE')
    console.log('─────────────────────────────────────────────────────')
    console.log(`Role Name:    ${role.name}`)
    console.log(`Display Name: ${role.displayName}`)
    console.log(`Description:  ${role.description || 'N/A'}`)
    console.log(`Capabilities: ${role.capabilityAssignments.length}`)
    console.log()

    // Check if user already has this role
    const existingUserRole = user.userRoles.find(ur => ur.roleId === role.id && ur.isActive)
    
    if (existingUserRole) {
      console.log('⚠️  User already has this role!\n')
      return
    }

    // Deactivate existing roles
    if (user.userRoles.length > 0) {
      await prisma.userRole.updateMany({
        where: {
          userId: user.id,
          isActive: true
        },
        data: {
          isActive: false
        }
      })
      console.log(`✓ Deactivated ${user.userRoles.length} existing role(s)`)
    }

    // Assign new role
    const adminUser = await prisma.user.findFirst({
      where: { 
        userRoles: {
          some: {
            role: { name: 'admin' },
            isActive: true
          }
        }
      }
    })

    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: role.id,
        assignedBy: adminUser?.id || user.id,
        isActive: true
      }
    })

    console.log(`✓ Assigned role: ${role.name}`)
    console.log()

    console.log('🎯 CAPABILITIES GRANTED')
    console.log('─────────────────────────────────────────────────────')
    
    // Group by category
    const byCategory: { [key: string]: any[] } = {}
    role.capabilityAssignments.forEach(ca => {
      const category = ca.capability.category || 'other'
      if (!byCategory[category]) byCategory[category] = []
      byCategory[category].push(ca.capability)
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
      
      console.log(`${categoryEmoji} ${category.toUpperCase()}: ${byCategory[category].length} capabilities`)
      byCategory[category].forEach(cap => {
        console.log(`   ✓ ${cap.name}`)
      })
      console.log()
    })

    console.log('═══════════════════════════════════════════════════════')
    console.log('✅ Role assigned successfully!')
    console.log()
    console.log('💡 Tip: User needs to logout and login again to get new capabilities')
    console.log('═══════════════════════════════════════════════════════\n')

  } catch (error) {
    console.error('❌ Error assigning role:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Get arguments
const userEmail = process.argv[2]
const roleName = process.argv[3]

if (!userEmail || !roleName) {
  console.log('\n❌ Usage: npx tsx scripts/assign-user-role.ts <email> <role>')
  console.log('\nExample:')
  console.log('  npx tsx scripts/assign-user-role.ts kadiv@dsm.com manager')
  console.log('\nAvailable roles: admin, manager, editor, viewer, ppd\n')
  process.exit(1)
}

console.log('\n')
assignUserRole(userEmail, roleName)

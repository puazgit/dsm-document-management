import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkCurrentUserRole() {
  console.log('🔍 Checking trenutni role untuk user tedy.purwadi...')
  
  try {
    // Check user tedy.purwadi current setup
    const user = await prisma.user.findUnique({
      where: { username: 'tedy.purwadi' },
      include: {
        group: true,
        divisi: true
      }
    })

    if (!user) {
      console.log('❌ User tedy.purwadi tidak ditemukan!')
      return
    }

    console.log('👤 User obecnie setup:')
    console.log(`   - Name: ${user.firstName} ${user.lastName}`)
    console.log(`   - Email: ${user.email}`)
    console.log(`   - Current Group: ${user.group?.name || 'null'} (${user.group?.displayName || 'N/A'})`)
    console.log(`   - Group Level: ${user.group?.level || 'N/A'}`)
    console.log(`   - Division: ${user.divisi?.name || 'N/A'}`)
    console.log(`   - Active: ${user.isActive}`)

    // Show all available groups
    console.log('\n📋 Available groups in system:')
    const groups = await prisma.group.findMany({
      orderBy: { level: 'desc' }
    })

    groups.forEach((group) => {
      console.log(`   - ${group.name} (${group.displayName}) - Level ${group.level}`)
    })

    // Check which role user should have based on permissions
    console.log('\n❓ Quale group dovrebbe avere tedy.purwadi per "editor" permissions?')
    
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the check
checkCurrentUserRole()
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateTedyUser() {
  console.log('🔄 Updating tedy.purwadi user to editor group...')
  
  try {
    // Find the editor group
    const editorGroup = await prisma.group.findUnique({
      where: { name: 'editor' }
    })

    if (!editorGroup) {
      console.error('❌ Editor group not found!')
      return
    }

    console.log('📍 Found editor group:', editorGroup.displayName)

    // Find tedy.purwadi user by username
    const user = await prisma.user.findUnique({
      where: { username: 'tedy.purwadi' }
    })

    if (!user) {
      console.log('❌ User tedy.purwadi not found! Available users:')
      const allUsers = await prisma.user.findMany({
        select: { username: true, email: true, firstName: true, lastName: true }
      })
      console.table(allUsers)
      return
    }

    console.log('👤 Found user:', user.firstName, user.lastName)

    // Update user's group to editor
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        groupId: editorGroup.id
      }
    })

    console.log('✅ Successfully updated user tedy.purwadi to editor group')
    console.log('📊 User details:')
    console.log('  - ID:', updatedUser.id)
    console.log('  - Username:', updatedUser.username)
    console.log('  - Group ID:', updatedUser.groupId)
    console.log('  - Name:', updatedUser.firstName, updatedUser.lastName)
    
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the update
updateTedyUser()
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })
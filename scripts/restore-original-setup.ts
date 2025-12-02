import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function restoreOriginalSetup() {
  console.log('🔄 Mengembalikan setup ke kondisi semula...')
  
  try {
    // Remove the editor group we created
    console.log('🗑️ Removing editor group...')
    const editorGroup = await prisma.group.findUnique({
      where: { name: 'editor' }
    })

    if (editorGroup) {
      // First, move any users from editor group to a more appropriate group
      const usersInEditorGroup = await prisma.user.findMany({
        where: { groupId: editorGroup.id }
      })

      console.log(`👥 Found ${usersInEditorGroup.length} users in editor group`)

      // Move tedy.purwadi to manager group (which should have editor-like permissions)
      const managerGroup = await prisma.group.findUnique({
        where: { name: 'manager' }
      })

      if (managerGroup && usersInEditorGroup.length > 0) {
        for (const user of usersInEditorGroup) {
          await prisma.user.update({
            where: { id: user.id },
            data: { groupId: managerGroup.id }
          })
          console.log(`✅ Moved ${user.username} to manager group`)
        }
      }

      // Delete the editor group
      await prisma.group.delete({
        where: { id: editorGroup.id }
      })
      console.log('✅ Removed editor group')
    }

    // Update documents to remove editor from accessGroups and ensure they have proper access
    console.log('📄 Updating document access groups...')
    const documents = await prisma.document.findMany()

    for (const doc of documents) {
      const currentAccessGroups = doc.accessGroups || []
      // Remove 'editor' and ensure 'manager' is included for documents
      const updatedAccessGroups = currentAccessGroups
        .filter(group => group !== 'editor')
        .concat(currentAccessGroups.includes('manager') ? [] : ['manager'])

      await prisma.document.update({
        where: { id: doc.id },
        data: { accessGroups: updatedAccessGroups }
      })
      console.log(`✅ Updated "${doc.title}" access groups`)
    }

    // Show final user status
    const user = await prisma.user.findUnique({
      where: { username: 'tedy.purwadi' },
      include: { group: true }
    })

    if (user) {
      console.log('\n👤 Final user tedy.purwadi setup:')
      console.log(`   - Group: ${user.group?.name} (${user.group?.displayName})`)
      console.log(`   - Level: ${user.group?.level}`)
    }

    console.log('✅ Setup restored successfully!')
    
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the restoration
restoreOriginalSetup()
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })
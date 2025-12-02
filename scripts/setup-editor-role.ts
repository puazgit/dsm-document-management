import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createEditorGroup() {
  console.log('🔄 Creating editor group...')
  
  try {
    // Check if editor group already exists
    const existingGroup = await prisma.group.findUnique({
      where: { name: 'editor' }
    })

    if (existingGroup) {
      console.log('✅ Editor group already exists')
      return existingGroup
    }

    // Create editor group
    const editorGroup = await prisma.group.create({
      data: {
        name: 'editor',
        displayName: 'Editor',
        description: 'Document editor with content management access',
        level: 55,
        isActive: true
      }
    })

    console.log('✅ Created editor group:', editorGroup)

    // Update all documents to include editor in accessGroups if they have "read all" permissions
    console.log('🔄 Updating document access groups...')
    
    const documentsToUpdate = await prisma.document.findMany()
    
    for (const doc of documentsToUpdate) {
      const currentAccessGroups = doc.accessGroups || []
      if (!currentAccessGroups.includes('editor')) {
        const updatedAccessGroups = [...currentAccessGroups, 'editor']
        
        await prisma.document.update({
          where: { id: doc.id },
          data: {
            accessGroups: updatedAccessGroups
          }
        })
        
        console.log(`✅ Updated document "${doc.title}" to include editor access`)
      }
    }

    console.log('🎉 All done!')
    return editorGroup
    
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the setup
createEditorGroup()
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })
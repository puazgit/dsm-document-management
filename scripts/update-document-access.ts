import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateDocumentAccess() {
  console.log('🔄 Updating document access groups to include editor role...')
  
  try {
    // Get all documents that don't have 'editor' in accessGroups
    const documents = await prisma.document.findMany({
      where: {
        NOT: {
          accessGroups: {
            has: 'editor'
          }
        }
      }
    })

    console.log(`📄 Found ${documents.length} documents to update`)

    // Update each document to include 'editor' in accessGroups
    let updatedCount = 0
    for (const doc of documents) {
      const currentAccessGroups = doc.accessGroups || []
      const updatedAccessGroups = [...currentAccessGroups, 'editor']
      
      await prisma.document.update({
        where: { id: doc.id },
        data: {
          accessGroups: updatedAccessGroups
        }
      })
      
      updatedCount++
      console.log(`✅ Updated document "${doc.title}" (${updatedCount}/${documents.length})`)
    }

    console.log(`🎉 Successfully updated ${updatedCount} documents to include editor access`)
    
  } catch (error) {
    console.error('❌ Error updating document access:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the update
updateDocumentAccess()
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })
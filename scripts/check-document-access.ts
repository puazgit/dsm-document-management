import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkDocumentAccess() {
  console.log('🔍 Checking document access configuration...')
  
  try {
    // Get all documents and their access groups
    const documents = await prisma.document.findMany({
      select: {
        id: true,
        title: true,
        accessGroups: true,
        isPublic: true,
        status: true
      }
    })

    console.log(`📄 Found ${documents.length} documents`)
    
    documents.forEach((doc, index) => {
      console.log(`\n${index + 1}. "${doc.title}"`)
      console.log(`   - Status: ${doc.status}`)
      console.log(`   - Public: ${doc.isPublic}`)
      console.log(`   - Access Groups: ${doc.accessGroups.join(', ')}`)
      console.log(`   - Has 'editor' access: ${doc.accessGroups.includes('editor') ? '✅ Yes' : '❌ No'}`)
    })

    // Check if any documents need editor access added
    const docsWithoutEditor = documents.filter(doc => !doc.accessGroups.includes('editor'))
    
    if (docsWithoutEditor.length > 0) {
      console.log(`\n🔧 ${docsWithoutEditor.length} documents need editor access added`)
      
      for (const doc of docsWithoutEditor) {
        const updatedAccessGroups = [...doc.accessGroups, 'editor']
        
        await prisma.document.update({
          where: { id: doc.id },
          data: { accessGroups: updatedAccessGroups }
        })
        
        console.log(`✅ Added editor access to "${doc.title}"`)
      }
    } else {
      console.log('\n✅ All documents already have editor access')
    }

    // Show user tedy.purwadi info
    console.log('\n👤 User tedy.purwadi info:')
    const user = await prisma.user.findUnique({
      where: { username: 'tedy.purwadi' },
      include: {
        group: true,
        divisi: true
      }
    })

    if (user) {
      console.log(`   - Name: ${user.firstName} ${user.lastName}`)
      console.log(`   - Email: ${user.email}`)
      console.log(`   - Group: ${user.group?.name} (${user.group?.displayName})`)
      console.log(`   - Division: ${user.divisi?.name}`)
      console.log(`   - Active: ${user.isActive}`)
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the check
checkDocumentAccess()
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })
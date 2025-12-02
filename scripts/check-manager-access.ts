import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkManagerAccess() {
  console.log('🔍 Checking manager access to documents...')
  
  try {
    // Check user tedy.purwadi as manager
    const user = await prisma.user.findUnique({
      where: { username: 'tedy.purwadi' },
      include: { group: true }
    })

    console.log(`👤 User: ${user?.firstName} ${user?.lastName}`)
    console.log(`   - Role: ${user?.group?.name}`)
    console.log(`   - Permissions dalam config: documents.create, documents.read, documents.update`)

    // Check all documents and their access groups
    console.log('\n📄 Documents and their access groups:')
    const documents = await prisma.document.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        isPublic: true,
        accessGroups: true,
        createdById: true
      }
    })

    documents.forEach((doc, index) => {
      const hasManagerAccess = doc.accessGroups.includes('manager')
      const isPublic = doc.isPublic
      const isOwner = doc.createdById === user?.id
      
      console.log(`\n${index + 1}. "${doc.title}"`)
      console.log(`   - Status: ${doc.status}`)
      console.log(`   - Public: ${isPublic ? '✅' : '❌'}`)
      console.log(`   - Owner: ${isOwner ? '✅' : '❌'}`)
      console.log(`   - Access Groups: [${doc.accessGroups.join(', ')}]`)
      console.log(`   - Manager Access: ${hasManagerAccess ? '✅' : '❌'}`)
      console.log(`   - Would tedy.purwadi see this? ${isPublic || isOwner || hasManagerAccess ? '✅ YES' : '❌ NO'}`)
    })

    // Check which documents need manager access
    const docsWithoutManagerAccess = documents.filter(doc => 
      !doc.isPublic && 
      doc.createdById !== user?.id && 
      !doc.accessGroups.includes('manager')
    )

    if (docsWithoutManagerAccess.length > 0) {
      console.log(`\n🔧 ${docsWithoutManagerAccess.length} documents perlu ditambahkan manager access:`)
      docsWithoutManagerAccess.forEach(doc => {
        console.log(`   - "${doc.title}"`)
      })
    } else {
      console.log('\n✅ Semua dokumen sudah accessible oleh manager')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the check
checkManagerAccess()
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })
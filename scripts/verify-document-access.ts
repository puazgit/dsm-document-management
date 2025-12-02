import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyDocumentAccess() {
  console.log('🔍 Verifying document access for all users...')
  
  try {
    // Get sample users from different groups
    const users = await prisma.user.findMany({
      include: {
        group: true,
        divisi: true
      },
      take: 10 // Get first 10 users
    })

    console.log(`\n👥 Testing document access for ${users.length} users:\n`)

    // Get all documents
    const documents = await prisma.document.findMany({
      select: {
        id: true,
        title: true,
        accessGroups: true,
        isPublic: true,
        createdById: true
      }
    })

    users.forEach((user) => {
      const userRole = user.group?.name || 'no-group'
      console.log(`👤 ${user.firstName} ${user.lastName} (${user.username})`)
      console.log(`   Group/Role: ${userRole} (${user.group?.displayName || 'N/A'})`)
      
      let accessibleDocs = 0
      documents.forEach((doc) => {
        const hasAccess = 
          doc.isPublic ||
          doc.createdById === user.id ||
          doc.accessGroups.includes(user.groupId || '') ||
          doc.accessGroups.includes(userRole) ||
          ['administrator', 'admin', 'ADMIN'].includes(userRole)

        if (hasAccess) {
          accessibleDocs++
        }
      })

      console.log(`   Can access: ${accessibleDocs}/${documents.length} documents ${accessibleDocs === documents.length ? '✅' : '❌'}`)
      
      if (accessibleDocs < documents.length) {
        console.log(`   ⚠️ Missing access to ${documents.length - accessibleDocs} documents`)
      }
      console.log()
    })

    // Summary
    console.log('📊 Summary:')
    console.log(`   Total Documents: ${documents.length}`)
    console.log(`   Total Users Tested: ${users.length}`)
    
    const allUsersHaveFullAccess = users.every(user => {
      const userRole = user.group?.name || 'no-group'
      return documents.every(doc => 
        doc.isPublic ||
        doc.createdById === user.id ||
        doc.accessGroups.includes(user.groupId || '') ||
        doc.accessGroups.includes(userRole) ||
        ['administrator', 'admin', 'ADMIN'].includes(userRole)
      )
    })

    console.log(`   All users can access all docs: ${allUsersHaveFullAccess ? '✅ YES' : '❌ NO'}`)
    
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the verification
verifyDocumentAccess()
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })
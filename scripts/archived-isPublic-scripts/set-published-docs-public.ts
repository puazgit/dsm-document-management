import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function setPublishedDocsPublic() {
  console.log('🔧 Setting all PUBLISHED documents to public')
  console.log('=' .repeat(80))
  
  try {
    // Get all published documents that are not public
    const publishedDocs = await prisma.document.findMany({
      where: {
        status: 'PUBLISHED',
        isPublic: false
      },
      select: {
        id: true,
        title: true,
        status: true,
        isPublic: true,
        accessGroups: true,
        createdBy: {
          select: {
            email: true
          }
        }
      }
    })
    
    console.log(`\n📊 Found ${publishedDocs.length} published document(s) that are not public yet\n`)
    
    if (publishedDocs.length === 0) {
      console.log('✅ All published documents are already public!')
      return
    }
    
    // Show documents that will be updated
    console.log('📄 Documents that will be made public:')
    console.log('-'.repeat(80))
    publishedDocs.forEach((doc, index) => {
      console.log(`\n   ${index + 1}. "${doc.title}"`)
      console.log(`      Status: ${doc.status}`)
      console.log(`      Current isPublic: ${doc.isPublic}`)
      console.log(`      Current accessGroups: [${doc.accessGroups.join(', ')}]`)
      console.log(`      Owner: ${doc.createdBy.email}`)
    })
    
    // Ask for confirmation (in production, you might want to add a prompt)
    console.log('\n\n⚠️  CONFIRMATION:')
    console.log('-'.repeat(80))
    console.log(`   This will update ${publishedDocs.length} document(s) to isPublic = true`)
    console.log(`   Published documents should be accessible by all authenticated users`)
    console.log(`   Proceeding with update...\n`)
    
    // Update all published documents to be public
    const result = await prisma.document.updateMany({
      where: {
        status: 'PUBLISHED',
        isPublic: false
      },
      data: {
        isPublic: true
      }
    })
    
    console.log('✅ SUCCESS!')
    console.log('-'.repeat(80))
    console.log(`   Updated ${result.count} document(s)`)
    console.log(`   All PUBLISHED documents are now public (isPublic = true)`)
    
    // Verify the update
    console.log('\n\n🔍 Verifying update...')
    console.log('-'.repeat(80))
    
    const verifyPublished = await prisma.document.findMany({
      where: {
        status: 'PUBLISHED'
      },
      select: {
        id: true,
        title: true,
        status: true,
        isPublic: true
      }
    })
    
    const allPublic = verifyPublished.every(doc => doc.isPublic)
    
    console.log(`\n   Total PUBLISHED documents: ${verifyPublished.length}`)
    console.log(`   All public: ${allPublic ? '✅ YES' : '❌ NO'}`)
    
    if (!allPublic) {
      console.log('\n   ⚠️  Some published documents are still not public:')
      verifyPublished.filter(doc => !doc.isPublic).forEach(doc => {
        console.log(`      - "${doc.title}"`)
      })
    } else {
      console.log('\n   ✅ All published documents are now public!')
    }
    
    // Show updated documents
    console.log('\n\n📄 Updated Documents:')
    console.log('-'.repeat(80))
    verifyPublished.forEach((doc, index) => {
      console.log(`   ${index + 1}. "${doc.title}"`)
      console.log(`      Status: ${doc.status}`)
      console.log(`      Public: ${doc.isPublic ? '✅ Yes' : '❌ No'}`)
    })
    
    console.log('\n\n✅ RESULT:')
    console.log('=' .repeat(80))
    console.log('   All PUBLISHED documents are now accessible by all authenticated users')
    console.log('   Users like finance@dsm.com can now view published documents')
    console.log('   No need to configure accessGroups for published documents')
    
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

setPublishedDocsPublic()
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })

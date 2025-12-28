#!/usr/bin/env tsx

/**
 * Script to reindex existing documents for full-text search
 * This script will trigger the PostgreSQL generated column to update
 * by touching the records (updating updated_at)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function reindexDocuments() {
  console.log('🔍 Starting document reindex for full-text search...\n')

  try {
    // Get total document count
    const totalDocs = await prisma.document.count()
    console.log(`📊 Total documents to reindex: ${totalDocs}\n`)

    if (totalDocs === 0) {
      console.log('✅ No documents to reindex')
      return
    }

    // Reindex in batches to avoid memory issues
    const batchSize = 100
    let processedCount = 0

    for (let skip = 0; skip < totalDocs; skip += batchSize) {
      const documents = await prisma.document.findMany({
        select: {
          id: true,
          title: true,
          fileName: true,
          mimeType: true,
        },
        skip,
        take: batchSize,
      })

      console.log(`📝 Processing batch ${Math.floor(skip / batchSize) + 1} (${documents.length} documents)...`)

      // Update each document to trigger the generated column
      for (const doc of documents) {
        await prisma.document.update({
          where: { id: doc.id },
          data: {
            // Touch the record to trigger search_vector regeneration
            updatedAt: new Date(),
            // Set extraction status for PDFs
            extractionStatus: doc.mimeType === 'application/pdf' ? 'pending' : 'not_applicable',
          },
        })

        processedCount++
        if (processedCount % 10 === 0) {
          process.stdout.write(`\r   Processed: ${processedCount}/${totalDocs} documents`)
        }
      }

      console.log(`\r   ✅ Batch completed: ${processedCount}/${totalDocs} documents`)
    }

    console.log(`\n✅ Successfully reindexed ${processedCount} documents!`)

    // Show statistics
    const stats = await prisma.$queryRaw<Array<{ status: string; count: bigint }>>`
      SELECT extraction_status as status, COUNT(*) as count
      FROM documents
      GROUP BY extraction_status
      ORDER BY count DESC
    `

    console.log('\n📊 Extraction status summary:')
    stats.forEach(stat => {
      console.log(`   ${stat.status}: ${stat.count}`)
    })

    // Test the full-text search
    console.log('\n🧪 Testing full-text search...')
    const searchTest = await prisma.$queryRaw<Array<any>>`
      SELECT 
        id, 
        title, 
        ts_rank_cd(search_vector, websearch_to_tsquery('indonesian', 'dokumen')) as rank
      FROM documents
      WHERE search_vector @@ websearch_to_tsquery('indonesian', 'dokumen')
      ORDER BY rank DESC
      LIMIT 5
    `

    if (searchTest.length > 0) {
      console.log('   ✅ Full-text search is working!')
      console.log(`   Found ${searchTest.length} matching documents for test query "dokumen"`)
    } else {
      console.log('   ⚠️  No results found for test query (this may be normal if no documents contain "dokumen")')
    }

  } catch (error) {
    console.error('\n❌ Error during reindexing:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
reindexDocuments()
  .then(() => {
    console.log('\n✅ Reindex completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Reindex failed:', error)
    process.exit(1)
  })

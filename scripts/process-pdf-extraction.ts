#!/usr/bin/env tsx

/**
 * CLI tool to process PDF extraction for documents
 * Usage:
 *   npx tsx scripts/process-pdf-extraction.ts              # Process all pending PDFs
 *   npx tsx scripts/process-pdf-extraction.ts --retry      # Retry failed extractions
 *   npx tsx scripts/process-pdf-extraction.ts --all        # Process all PDFs (including completed)
 *   npx tsx scripts/process-pdf-extraction.ts --id <docId> # Process specific document
 */

import { PrismaClient } from '@prisma/client'
import { processPdfExtraction, processBatchPdfExtraction } from '@/lib/jobs/pdf-extraction-job'

const prisma = new PrismaClient()

async function main() {
  const args = process.argv.slice(2)
  const hasRetryFlag = args.includes('--retry')
  const hasAllFlag = args.includes('--all')
  const idIndex = args.indexOf('--id')
  const documentId = idIndex >= 0 ? args[idIndex + 1] : null

  console.log('🔧 PDF Extraction CLI Tool\n')

  try {
    // Process specific document
    if (documentId) {
      console.log(`Processing document: ${documentId}\n`)
      const result = await processPdfExtraction(documentId)

      if (result.success) {
        console.log('\n✅ Extraction successful!')
        console.log(`   Text length: ${result.extractedTextLength} characters`)
        console.log(`   Pages: ${result.pages}`)
        console.log(`   Duration: ${result.duration}ms`)
      } else {
        console.log('\n❌ Extraction failed!')
        console.log(`   Error: ${result.error}`)
      }

      return
    }

    // Retry failed extractions
    if (hasRetryFlag) {
      console.log('Retrying failed extractions...\n')

      const failedDocs = await prisma.document.findMany({
        where: {
          extractionStatus: 'failed',
          mimeType: 'application/pdf',
        },
        select: { id: true, title: true, fileName: true },
      })

      if (failedDocs.length === 0) {
        console.log('✅ No failed extractions to retry')
        return
      }

      console.log(`Found ${failedDocs.length} failed extractions\n`)

      const results = await processBatchPdfExtraction(
        failedDocs.map((d) => d.id),
        {
          concurrency: 3,
          onProgress: (completed, total) => {
            process.stdout.write(`\rProgress: ${completed}/${total} documents processed`)
          },
        }
      )

      console.log('\n\n📊 Results:')
      const successCount = results.filter((r) => r.success).length
      const failedCount = results.filter((r) => !r.success).length
      console.log(`   ✅ Success: ${successCount}`)
      console.log(`   ❌ Failed: ${failedCount}`)

      return
    }

    // Process all PDFs (including completed)
    if (hasAllFlag) {
      console.log('Processing ALL PDF documents...\n')

      const allPdfs = await prisma.document.findMany({
        where: {
          mimeType: 'application/pdf',
        },
        select: { id: true, title: true, fileName: true },
      })

      if (allPdfs.length === 0) {
        console.log('✅ No PDF documents found')
        return
      }

      console.log(`Found ${allPdfs.length} PDF documents\n`)

      const results = await processBatchPdfExtraction(
        allPdfs.map((d) => d.id),
        {
          concurrency: 3,
          onProgress: (completed, total) => {
            process.stdout.write(`\rProgress: ${completed}/${total} documents processed`)
          },
        }
      )

      console.log('\n\n📊 Results:')
      const successCount = results.filter((r) => r.success).length
      const failedCount = results.filter((r) => !r.success).length
      console.log(`   ✅ Success: ${successCount}`)
      console.log(`   ❌ Failed: ${failedCount}`)

      return
    }

    // Default: Process pending extractions
    console.log('Processing pending PDF extractions...\n')

    const pendingDocs = await prisma.document.findMany({
      where: {
        extractionStatus: 'pending',
        mimeType: 'application/pdf',
      },
      select: { id: true, title: true, fileName: true },
      orderBy: { createdAt: 'asc' },
    })

    if (pendingDocs.length === 0) {
      console.log('✅ No pending extractions')

      // Show stats
      const stats = await prisma.document.groupBy({
        by: ['extractionStatus'],
        where: { mimeType: 'application/pdf' },
        _count: true,
      })

      console.log('\n📊 Current status:')
      stats.forEach((s) => {
        console.log(`   ${s.extractionStatus}: ${s._count}`)
      })

      return
    }

    console.log(`Found ${pendingDocs.length} pending extractions\n`)

    const results = await processBatchPdfExtraction(
      pendingDocs.map((d) => d.id),
      {
        concurrency: 3,
        onProgress: (completed, total) => {
          process.stdout.write(`\rProgress: ${completed}/${total} documents processed`)
        },
      }
    )

    console.log('\n\n📊 Results:')
    const successCount = results.filter((r) => r.success).length
    const failedCount = results.filter((r) => !r.success).length
    console.log(`   ✅ Success: ${successCount}`)
    console.log(`   ❌ Failed: ${failedCount}`)

    // Show failed documents details
    if (failedCount > 0) {
      console.log('\n❌ Failed documents:')
      results
        .filter((r) => !r.success)
        .forEach((r) => {
          console.log(`   - ${r.documentId}: ${r.error}`)
        })
    }
  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => {
    console.log('\n✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  })

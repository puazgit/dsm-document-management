/**
 * PDF Extraction Background Job Service
 * Handles asynchronous PDF text extraction for uploaded documents
 */

import { prisma } from '@/lib/prisma'
import {
  extractPdfContent,
  isPdfFile,
  isExtractionSuccessful,
} from '@/lib/pdf-extractor'

export interface ExtractionJobResult {
  documentId: string
  success: boolean
  extractedTextLength?: number
  pages?: number
  error?: string
  duration?: number
}

/**
 * Process PDF extraction for a single document
 * Updates the document record with extracted text
 */
export async function processPdfExtraction(
  documentId: string
): Promise<ExtractionJobResult> {
  const startTime = Date.now()
  
  try {
    console.log(`[PDF Extraction] Starting extraction for document ${documentId}`)

    // Get document from database
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        title: true,
        fileName: true,
        filePath: true,
        mimeType: true,
        extractionStatus: true,
        metadata: true,
      },
    })

    if (!document) {
      throw new Error(`Document ${documentId} not found`)
    }

    // Check if it's a PDF
    if (!isPdfFile(document.mimeType ?? undefined, document.fileName)) {
      console.log(`[PDF Extraction] Document ${documentId} is not a PDF, skipping`)
      
      await prisma.document.update({
        where: { id: documentId },
        data: { extractionStatus: 'not_applicable' },
      })

      return {
        documentId,
        success: true,
        duration: Date.now() - startTime,
      }
    }

    // Update status to processing
    await prisma.document.update({
      where: { id: documentId },
      data: { extractionStatus: 'processing' },
    })

    // Extract text from PDF
    console.log(`[PDF Extraction] Extracting text from ${document.filePath}`)
    const result = await extractPdfContent(document.filePath)

    // Validate extraction
    if (!isExtractionSuccessful(result.text)) {
      console.warn(
        `[PDF Extraction] Warning: Extracted text is empty or too short for document ${documentId}`
      )
    }

    // Update document with extracted text
    await prisma.document.update({
      where: { id: documentId },
      data: {
        extractedText: result.text,
        extractedAt: new Date(),
        extractionStatus: 'completed',
        // Optionally update metadata with PDF metadata
        metadata: {
          ...(typeof document.metadata === 'object' ? document.metadata : {}),
          pdfMetadata: result.metadata,
          pdfPages: result.pages,
        },
      },
    })

    const duration = Date.now() - startTime

    console.log(
      `[PDF Extraction] ✅ Completed for document ${documentId} (${result.pages} pages, ${result.text.length} chars) in ${duration}ms`
    )

    return {
      documentId,
      success: true,
      extractedTextLength: result.text.length,
      pages: result.pages,
      duration,
    }
  } catch (error: any) {
    const duration = Date.now() - startTime
    
    console.error(
      `[PDF Extraction] ❌ Failed for document ${documentId}:`,
      error
    )

    // Update document with failed status
    try {
      await prisma.document.update({
        where: { id: documentId },
        data: {
          extractionStatus: 'failed',
          metadata: {
            extractionError: error.message || 'Unknown error',
            extractionFailedAt: new Date().toISOString(),
          },
        },
      })
    } catch (updateError) {
      console.error(
        `[PDF Extraction] Failed to update document ${documentId} status:`,
        updateError
      )
    }

    return {
      documentId,
      success: false,
      error: error.message || 'Unknown error',
      duration,
    }
  }
}

/**
 * Process multiple PDF extractions in batch
 * Useful for bulk reprocessing or initial migration
 */
export async function processBatchPdfExtraction(
  documentIds: string[],
  options?: {
    concurrency?: number
    onProgress?: (completed: number, total: number) => void
  }
): Promise<ExtractionJobResult[]> {
  const concurrency = options?.concurrency || 3
  const results: ExtractionJobResult[] = []
  const total = documentIds.length

  console.log(
    `[PDF Extraction] Starting batch extraction for ${total} documents (concurrency: ${concurrency})`
  )

  // Process in batches with limited concurrency
  for (let i = 0; i < documentIds.length; i += concurrency) {
    const batch = documentIds.slice(i, i + concurrency)
    const batchResults = await Promise.all(
      batch.map((id) => processPdfExtraction(id))
    )
    
    results.push(...batchResults)

    if (options?.onProgress) {
      options.onProgress(results.length, total)
    }
  }

  const successCount = results.filter((r) => r.success).length
  const failedCount = results.filter((r) => !r.success).length

  console.log(
    `[PDF Extraction] ✅ Batch completed: ${successCount} succeeded, ${failedCount} failed`
  )

  return results
}

/**
 * Get all pending PDF extractions
 * Returns documents that need text extraction
 */
export async function getPendingExtractions(limit = 100) {
  return prisma.document.findMany({
    where: {
      extractionStatus: 'pending',
      mimeType: 'application/pdf',
    },
    select: {
      id: true,
      title: true,
      fileName: true,
      filePath: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'asc', // Process oldest first
    },
    take: limit,
  })
}

/**
 * Retry failed extractions
 * Useful for documents that failed due to temporary issues
 */
export async function retryFailedExtractions(limit = 50) {
  const failedDocs = await prisma.document.findMany({
    where: {
      extractionStatus: 'failed',
      mimeType: 'application/pdf',
    },
    select: {
      id: true,
    },
    take: limit,
  })

  if (failedDocs.length === 0) {
    console.log('[PDF Extraction] No failed extractions to retry')
    return []
  }

  console.log(`[PDF Extraction] Retrying ${failedDocs.length} failed extractions`)

  // Reset status to pending
  await prisma.document.updateMany({
    where: {
      id: { in: failedDocs.map((d) => d.id) },
    },
    data: {
      extractionStatus: 'pending',
    },
  })

  // Process the batch
  return processBatchPdfExtraction(failedDocs.map((d) => d.id))
}

/**
 * Get extraction statistics
 */
export async function getExtractionStats() {
  const stats = await prisma.document.groupBy({
    by: ['extractionStatus'],
    where: {
      mimeType: 'application/pdf',
    },
    _count: true,
  })

  return {
    stats: stats.map((s) => ({
      status: s.extractionStatus,
      count: s._count,
    })),
    total: stats.reduce((sum, s) => sum + s._count, 0),
  }
}

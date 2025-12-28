import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/next-auth'
import { prisma } from '@/lib/prisma'
import {
  processPdfExtraction,
  processBatchPdfExtraction,
  getPendingExtractions,
  getExtractionStats,
  retryFailedExtractions,
} from '@/lib/jobs/pdf-extraction-job'

// GET /api/documents/extraction/stats - Get extraction statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action')

    if (action === 'stats') {
      const stats = await getExtractionStats()
      return NextResponse.json(stats)
    }

    if (action === 'pending') {
      const limit = parseInt(searchParams.get('limit') || '100')
      const pending = await getPendingExtractions(limit)
      return NextResponse.json({
        pending,
        count: pending.length,
      })
    }

    // Default: return general info
    const stats = await getExtractionStats()
    return NextResponse.json({
      stats,
      message: 'PDF extraction service is running',
    })
  } catch (error) {
    console.error('Error in extraction stats API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/documents/extraction - Trigger extraction
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { documentId, documentIds, action } = body

    // Single document extraction
    if (documentId) {
      const result = await processPdfExtraction(documentId)
      return NextResponse.json(result)
    }

    // Batch extraction
    if (documentIds && Array.isArray(documentIds)) {
      const results = await processBatchPdfExtraction(documentIds, {
        concurrency: 3,
      })

      const successCount = results.filter((r) => r.success).length
      const failedCount = results.filter((r) => !r.success).length

      return NextResponse.json({
        results,
        summary: {
          total: results.length,
          success: successCount,
          failed: failedCount,
        },
      })
    }

    // Retry failed extractions
    if (action === 'retry-failed') {
      const limit = parseInt(body.limit || '50')
      const results = await retryFailedExtractions(limit)

      return NextResponse.json({
        results,
        message: `Retried ${results.length} failed extractions`,
      })
    }

    // Process all pending extractions
    if (action === 'process-pending') {
      const limit = parseInt(body.limit || '100')
      const pending = await getPendingExtractions(limit)

      if (pending.length === 0) {
        return NextResponse.json({
          message: 'No pending extractions',
          results: [],
        })
      }

      const results = await processBatchPdfExtraction(
        pending.map((d) => d.id),
        { concurrency: 3 }
      )

      return NextResponse.json({
        results,
        message: `Processed ${results.length} pending extractions`,
      })
    }

    return NextResponse.json(
      { error: 'Missing documentId, documentIds, or action parameter' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error in extraction API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

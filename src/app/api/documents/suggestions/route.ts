import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/next-auth'
import { prisma } from '@/lib/prisma'
import { requireCapability } from '@/lib/rbac-helpers'
import { UnifiedAccessControl } from '@/lib/unified-access-control'

/**
 * GET /api/documents/suggestions - Get autocomplete suggestions
 * Uses the PostgreSQL get_search_suggestions function created in migration
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireCapability(request, 'DOCUMENT_VIEW')
    if (!auth.authorized) {
      return auth.error;
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '10')

    if (q.length < 2) {
      return NextResponse.json({
        suggestions: [],
        message: 'Query too short (minimum 2 characters)',
      })
    }

    // For multi-word queries, use the last word for word-level completion
    // e.g. "Prosedur Post Impl" -> use "impl" for word suggestions
    const words = q.trim().split(/\s+/);
    const lastWord = words[words.length - 1] ?? '';
    const queryForWordSuggestions = lastWord.toLowerCase();
    const isMultiWord = words.length > 1;

    // Get suggestions using the PostgreSQL function
    // Try-catch in case the function doesn't exist yet
    let suggestions: Array<{ suggestion: string; frequency: number }> = []
    
    // Only use word suggestions for single-word queries or last word of multi-word
    if (queryForWordSuggestions.length >= 2) {
      try {
        suggestions = await prisma.$queryRaw<
          Array<{ suggestion: string; frequency: number }>
        >`
          SELECT * FROM get_search_suggestions(${queryForWordSuggestions}::text, ${limit}::int)
        `
        // For multi-word queries, skip word suggestions (they are less useful)
        if (isMultiWord) {
          suggestions = []
        }
      } catch (error) {
        // If function doesn't exist, return empty suggestions
        console.log('get_search_suggestions function not available:', error)
        suggestions = []
      }
    }

    // Also get recent searches from documents that match (full title search)
    const whereClause: any = {
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ],
    }

    // Add access control for non-admin users
    // Check if user has admin access via capability (already checked DOCUMENT_VIEW above)
    const hasAdminAccess = await UnifiedAccessControl.hasCapability(auth.userId!, 'ADMIN_ACCESS');
    if (!hasAdminAccess) {
      whereClause.AND = [
        {
          OR: [
            { createdById: auth.userId },
            { status: 'PUBLISHED' },
            { accessGroups: { isEmpty: true } },
          ],
        },
      ]
    }

    const recentDocuments = await prisma.document.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        status: true,
        documentType: {
          select: {
            name: true,
            icon: true,
            color: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // PUBLISHED first (alphabetically P comes after others)
        { updatedAt: 'desc' },
      ],
      take: 8,
    })

    console.log('[SUGGESTIONS API] Raw DB results:', suggestions);
    console.log('[SUGGESTIONS API] Sample frequency type:', typeof suggestions[0]?.frequency);

    // Convert BigInt to Number for JSON serialization
    const mappedSuggestions = suggestions.map((s) => {
      const freq = s.frequency;
      let frequencyNum = 0;
      
      if (typeof freq === 'bigint') {
        frequencyNum = Number(freq);
      } else if (typeof freq === 'number') {
        frequencyNum = freq;
      }
      
      console.log(`[SUGGESTIONS API] Mapping: "${s.suggestion}" freq=${freq} (${typeof freq}) -> ${frequencyNum}`);
      
      return {
        text: s.suggestion || '',
        frequency: frequencyNum,
      };
    });

    return NextResponse.json({
      suggestions: mappedSuggestions,
      recentDocuments: recentDocuments.map((doc) => ({
        id: doc.id,
        title: doc.title,
        documentType: doc.documentType,
      })),
    })
  } catch (error) {
    console.error('Error getting search suggestions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

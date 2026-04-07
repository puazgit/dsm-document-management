/**
 * ALTERNATIVE 2: Client-Side/Application-Level Relevance Scoring
 * No database changes needed - scoring happens in Node.js application
 */

/**
 * Calculate relevance score for a document against a search query
 * This mimics Google's ranking algorithm with multiple factors
 */
export function calculateRelevanceScore(document: any, query: string): number {
  const lowerQuery = query.toLowerCase();
  const lowerTitle = (document.title || '').toLowerCase();
  const lowerDesc = (document.description || '').toLowerCase();
  const tags = document.tags || [];
  
  let score = 0;
  
  // 1. TITLE MATCHING (Most important - like Google)
  if (lowerTitle === lowerQuery) {
    score += 100; // Exact match
  } else if (lowerTitle.startsWith(lowerQuery)) {
    score += 80; // Starts with query
  } else if (lowerTitle.includes(lowerQuery)) {
    score += 50; // Contains query
    // Bonus for early position in title
    const position = lowerTitle.indexOf(lowerQuery);
    const positionBonus = Math.max(0, 20 - (position / lowerTitle.length) * 20);
    score += positionBonus;
  }
  
  // 2. DESCRIPTION MATCHING
  if (lowerDesc.includes(lowerQuery)) {
    score += 30;
    // Multiple occurrences bonus
    const occurrences = (lowerDesc.match(new RegExp(lowerQuery, 'g')) || []).length;
    score += Math.min(occurrences * 5, 20); // Max +20 for multiple occurrences
  }
  
  // 3. TAGS MATCHING
  const matchingTags = tags.filter((tag: string) => 
    tag.toLowerCase().includes(lowerQuery)
  ).length;
  score += matchingTags * 15;
  
  // 4. WORD-LEVEL MATCHING (partial words)
  const queryWords = lowerQuery.split(/\s+/);
  const titleWords = lowerTitle.split(/\s+/);
  const matchingWords = queryWords.filter(qw => 
    titleWords.some((tw: string) => tw.includes(qw) || qw.includes(tw))
  ).length;
  score += (matchingWords / queryWords.length) * 25;
  
  // 5. POPULARITY BOOST (logarithmic - like Google PageRank)
  const viewCount = document.view_count || 0;
  const downloadCount = document.download_count || 0;
  const commentCount = document._count?.comments || 0;
  
  // Logarithmic scale to prevent outliers from dominating
  const popularityBoost = Math.log10(1 + viewCount + (downloadCount * 2) + (commentCount * 1.5));
  score += popularityBoost * 10;
  
  // 6. STATUS BOOST (authoritative content ranks higher)
  const statusBoostMap: Record<string, number> = {
    'PUBLISHED': 1.5,
    'APPROVED': 1.3,
    'REVIEWED': 1.1,
    'DRAFT': 0.8,
    'ARCHIVED': 0.5,
  };
  const statusMultiplier = statusBoostMap[document.status] ?? 1.0;
  
  score *= statusMultiplier;
  
  // 7. RECENCY BOOST (newer documents get slight boost)
  const daysSinceCreated = (Date.now() - new Date(document.created_at).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceCreated < 7) {
    score *= 1.1; // 10% boost for documents < 1 week old
  } else if (daysSinceCreated < 30) {
    score *= 1.05; // 5% boost for documents < 1 month old
  }
  
  // 8. FILE TYPE RELEVANCE (some types may be preferred)
  const fileTypeBoostMap: Record<string, number> = {
    'pdf': 1.1,
    'docx': 1.0,
    'xlsx': 0.95,
    'pptx': 0.95,
  };
  const fileTypeBoost = fileTypeBoostMap[document.file_type?.toLowerCase()] ?? 1.0;
  
  score *= fileTypeBoost;
  
  return Math.round(score * 100) / 100; // Round to 2 decimals
}

/**
 * Generate text highlights (like Google's bold keywords in snippets)
 */
export function generateHighlight(text: string, query: string, maxLength: number = 200): string {
  if (!text || !query) return text;
  
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  
  // Find first occurrence
  const index = lowerText.indexOf(lowerQuery);
  
  if (index === -1) {
    // No match - return beginning of text
    return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '');
  }
  
  // Extract snippet around the match
  const snippetStart = Math.max(0, index - 50);
  const snippetEnd = Math.min(text.length, index + query.length + 150);
  let snippet = text.substring(snippetStart, snippetEnd);
  
  if (snippetStart > 0) snippet = '...' + snippet;
  if (snippetEnd < text.length) snippet = snippet + '...';
  
  // Highlight the query (case-insensitive)
  const regex = new RegExp(`(${query})`, 'gi');
  snippet = snippet.replace(regex, '<strong class="font-semibold text-foreground">$1</strong>');
  
  return snippet;
}

/**
 * Rank and sort search results
 */
export function rankSearchResults(documents: any[], query: string): any[] {
  // Calculate score for each document
  const scoredDocuments = documents.map(doc => ({
    ...doc,
    relevance_score: calculateRelevanceScore(doc, query),
    title_highlight: generateHighlight(doc.title, query, 100),
    description_highlight: doc.description ? generateHighlight(doc.description, query, 200) : null,
  }));
  
  // Sort by relevance score (descending)
  scoredDocuments.sort((a, b) => b.relevance_score - a.relevance_score);
  
  return scoredDocuments;
}

/**
 * USAGE EXAMPLE in API route:
 * 
 * // In src/app/api/documents/search/route.ts
 * import { rankSearchResults } from '@/lib/search-ranking';
 * 
 * // After getting documents from Prisma fallback search:
 * const documents = await prisma.document.findMany({
 *   where: {
 *     OR: [
 *       { title: { contains: query, mode: 'insensitive' } },
 *       { description: { contains: query, mode: 'insensitive' } },
 *     ],
 *   },
 *   include: {
 *     documentType: true,
 *     createdBy: true,
 *     _count: { select: { comments: true } },
 *   },
 * });
 * 
 * // Apply client-side ranking
 * const rankedDocuments = rankSearchResults(documents, query);
 * 
 * return NextResponse.json({
 *   documents: rankedDocuments,
 *   total: rankedDocuments.length,
 * });
 */

export default {
  calculateRelevanceScore,
  generateHighlight,
  rankSearchResults,
};

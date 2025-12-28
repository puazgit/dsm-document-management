/**
 * Test Script untuk Enhanced Search API
 * Tests full-text search, autocomplete, and analytics
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 Testing Enhanced Search API\n');

  // Test 1: Direct database query with FTS
  console.log('Test 1: Full-Text Search Query');
  console.log('=' .repeat(50));
  
  const searchQuery = 'dokumen';
  
  const results = await prisma.$queryRaw<any[]>`
    SELECT 
      d.id,
      d.title,
      d.status,
      d.file_type,
      ts_rank_cd(d.search_vector, websearch_to_tsquery('indonesian', ${searchQuery}), 32) as rank,
      ts_headline(
        'indonesian',
        COALESCE(d.extracted_text, d.title || ' ' || COALESCE(d.description, '')),
        websearch_to_tsquery('indonesian', ${searchQuery}),
        'MaxWords=50, MinWords=25, ShortWord=3, MaxFragments=3'
      ) as highlight
    FROM documents d
    WHERE d.search_vector @@ websearch_to_tsquery('indonesian', ${searchQuery})
    ORDER BY rank DESC
    LIMIT 5
  `;

  console.log(`Found ${results.length} documents matching "${searchQuery}":\n`);
  results.forEach((doc, idx) => {
    console.log(`${idx + 1}. ${doc.title}`);
    console.log(`   Status: ${doc.status}`);
    console.log(`   Rank: ${doc.rank}`);
    console.log(`   Highlight: ${doc.highlight.substring(0, 200)}...`);
    console.log('');
  });

  // Test 2: Search suggestions
  console.log('\nTest 2: Autocomplete Suggestions');
  console.log('='.repeat(50));
  
  const suggestions = await prisma.$queryRaw<any[]>`
    SELECT * FROM get_search_suggestions(${searchQuery}, 5)
  `;
  
  console.log(`Suggestions for "${searchQuery}":`);
  suggestions.forEach((s, idx) => {
    console.log(`${idx + 1}. ${s.suggestion} (frequency: ${s.frequency})`);
  });

  // Test 3: Search with filters
  console.log('\n\nTest 3: Search with Status Filter');
  console.log('='.repeat(50));
  
  const filteredResults = await prisma.$queryRaw<any[]>`
    SELECT 
      d.id,
      d.title,
      d.status
    FROM documents d
    WHERE d.search_vector @@ websearch_to_tsquery('indonesian', ${searchQuery})
      AND d.status = 'PUBLISHED'
    ORDER BY ts_rank_cd(d.search_vector, websearch_to_tsquery('indonesian', ${searchQuery}), 32) DESC
    LIMIT 5
  `;

  console.log(`Found ${filteredResults.length} PUBLISHED documents:\n`);
  filteredResults.forEach((doc, idx) => {
    console.log(`${idx + 1}. ${doc.title} (${doc.status})`);
  });

  // Test 4: Facets/Aggregations
  console.log('\n\nTest 4: Facets (Aggregations)');
  console.log('='.repeat(50));
  
  const facets = await prisma.$queryRaw<any[]>`
    SELECT 
      d.status,
      COUNT(*) as count
    FROM documents d
    WHERE d.search_vector @@ websearch_to_tsquery('indonesian', ${searchQuery})
    GROUP BY d.status
  `;

  console.log('Documents by status:');
  facets.forEach(f => {
    console.log(`  ${f.status}: ${f.count}`);
  });

  const fileTypeFacets = await prisma.$queryRaw<any[]>`
    SELECT 
      d.file_type,
      COUNT(*) as count
    FROM documents d
    WHERE d.search_vector @@ websearch_to_tsquery('indonesian', ${searchQuery})
    GROUP BY d.file_type
  `;

  console.log('\nDocuments by file type:');
  fileTypeFacets.forEach(f => {
    console.log(`  ${f.file_type}: ${f.count}`);
  });

  // Test 5: Search ranking with popularity boost
  console.log('\n\nTest 5: Ranking with Popularity Boost');
  console.log('='.repeat(50));
  
  const rankedResults = await prisma.$queryRaw<any[]>`
    SELECT 
      d.id,
      d.title,
      d.view_count,
      d.download_count,
      ts_rank_cd(d.search_vector, websearch_to_tsquery('indonesian', ${searchQuery}), 32) as base_rank,
      ts_rank_cd(d.search_vector, websearch_to_tsquery('indonesian', ${searchQuery}), 32) * 
        (1 + log(1 + d.view_count + d.download_count * 2)) as boosted_rank
    FROM documents d
    WHERE d.search_vector @@ websearch_to_tsquery('indonesian', ${searchQuery})
    ORDER BY boosted_rank DESC
    LIMIT 5
  `;

  console.log('Documents ranked by relevance + popularity:\n');
  rankedResults.forEach((doc, idx) => {
    console.log(`${idx + 1}. ${doc.title}`);
    console.log(`   Views: ${doc.view_count}, Downloads: ${doc.download_count}`);
    console.log(`   Base Rank: ${doc.base_rank}`);
    console.log(`   Boosted Rank: ${doc.boosted_rank}`);
    console.log('');
  });

  // Test 6: Indonesian language features
  console.log('\nTest 6: Indonesian Language Stemming');
  console.log('='.repeat(50));
  
  const indonesianTests = ['dokumentasi', 'mendokumentasikan', 'terdokumentasi'];
  
  for (const term of indonesianTests) {
    const count = await prisma.$queryRaw<{count: bigint}[]>`
      SELECT COUNT(*) as count
      FROM documents d
      WHERE d.search_vector @@ websearch_to_tsquery('indonesian', ${term})
    `;
    
    console.log(`"${term}" matches: ${count[0].count} documents`);
  }

  console.log('\n✅ All tests completed!\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

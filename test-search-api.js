/**
 * Test script untuk search API
 * 
 * Usage: node test-search-api.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSearchQuery() {
  console.log('=== Testing Search API Query Logic ===\n');
  
  try {
    // Test 1: Search for "bcms"
    console.log('Test 1: Search for "bcms"');
    const query1 = `
      SELECT 
        d.id,
        d.title,
        d.status,
        d.is_public,
        ts_rank_cd(d.search_vector, websearch_to_tsquery('indonesian', $1)) as search_rank
      FROM documents d
      WHERE d.search_vector @@ websearch_to_tsquery('indonesian', $1)
      ORDER BY ts_rank_cd(d.search_vector, websearch_to_tsquery('indonesian', $1)) DESC
      LIMIT 5
    `;
    
    const result1 = await prisma.$queryRaw`
      SELECT 
        d.id,
        d.title,
        d.status,
        d.is_public
      FROM documents d
      WHERE d.search_vector @@ websearch_to_tsquery('indonesian', 'bcms')
      LIMIT 5
    `;
    
    console.log(`Found ${result1.length} documents:`);
    result1.forEach((doc, i) => {
      console.log(`  ${i + 1}. ${doc.title} (Status: ${doc.status}, Public: ${doc.is_public})`);
    });
    
    console.log('\n---\n');
    
    // Test 2: Search for "draft"
    console.log('Test 2: Search for "draft"');
    const result2 = await prisma.$queryRaw`
      SELECT 
        d.id,
        d.title,
        d.status,
        d.is_public
      FROM documents d
      WHERE d.search_vector @@ websearch_to_tsquery('indonesian', 'draft')
      LIMIT 5
    `;
    
    console.log(`Found ${result2.length} documents:`);
    result2.forEach((doc, i) => {
      console.log(`  ${i + 1}. ${doc.title} (Status: ${doc.status}, Public: ${doc.is_public})`);
    });
    
    console.log('\n---\n');
    
    // Test 3: Count total documents with search_vector
    console.log('Test 3: Count total documents with search_vector populated');
    const result3 = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN search_vector IS NOT NULL THEN 1 END) as with_vector
      FROM documents
    `;
    
    console.log(`Total documents: ${result3[0].total}`);
    console.log(`Documents with search_vector: ${result3[0].with_vector}`);
    
    console.log('\n✅ Search API query logic working correctly!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testSearchQuery();

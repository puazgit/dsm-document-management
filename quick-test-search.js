const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('Testing simplified search query...\n');
    
    const searchQuery = 'draft';
    
    const searchQuerySQL = `
      SELECT 
        d.id,
        d.title,
        d.status,
        d.is_public
      FROM documents d
      WHERE d.search_vector @@ websearch_to_tsquery('indonesian', $1)
      ORDER BY 
        ts_rank_cd(d.search_vector, websearch_to_tsquery('indonesian', $1), 32) DESC
      LIMIT $2
      OFFSET $3
    `;
    
    console.log('Executing query with params:', [searchQuery, 20, 0]);
    
    const documents = await prisma.$queryRawUnsafe(searchQuerySQL, searchQuery, 20, 0);
    
    console.log('\n✅ Query successful!');
    console.log('Found', documents.length, 'documents:');
    documents.forEach((doc, i) => {
      console.log(`  ${i + 1}. ${doc.title} (Status: ${doc.status}, Public: ${doc.is_public})`);
    });
    
    // Now test the full query from API
    console.log('\n\nTesting FULL query from API route...\n');
    
    const fullQuery = `
      SELECT 
        d.id,
        d.title,
        d.description,
        d.file_name,
        d.file_path,
        d.file_size,
        d.file_type,
        d.mime_type,
        d.version,
        d.status,
        d.is_public,
        d.tags,
        d.metadata,
        d.document_type_id,
        d.created_by_id,
        d.updated_by_id,
        d.approved_by_id,
        d.created_at,
        d.updated_at,
        d.approved_at,
        d.view_count,
        d.download_count,
        d.access_groups,
        ts_rank_cd(d.search_vector, websearch_to_tsquery('indonesian', $1)) as search_rank,
        ts_headline('indonesian', COALESCE(d.title, ''), websearch_to_tsquery('indonesian', $1), 
          'MaxWords=10, MinWords=5, ShortWord=2, HighlightAll=false, MaxFragments=1') as title_highlight,
        ts_headline('indonesian', COALESCE(d.description, ''), websearch_to_tsquery('indonesian', $1), 
          'MaxWords=20, MinWords=10, ShortWord=2, HighlightAll=false, MaxFragments=2') as description_highlight
      FROM documents d
      WHERE d.search_vector @@ websearch_to_tsquery('indonesian', $1)
      ORDER BY 
        ts_rank_cd(d.search_vector, websearch_to_tsquery('indonesian', $1), 32) * 
        (1 + log(1 + d.view_count + d.download_count * 2)) * 
        (CASE 
          WHEN d.status = 'PUBLISHED' THEN 1.5
          WHEN d.status = 'APPROVED' THEN 1.3
          WHEN d.status = 'PENDING_APPROVAL' THEN 1.1
          ELSE 1.0
        END) DESC,
        d.updated_at DESC
      LIMIT $2
      OFFSET $3
    `;
    
    const fullDocs = await prisma.$queryRawUnsafe(fullQuery, searchQuery, 20, 0);
    
    console.log('✅ Full query successful!');
    console.log('Found', fullDocs.length, 'documents with all fields');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Code:', error.code);
    if (error.meta) {
      console.error('Meta:', error.meta);
    }
  } finally {
    await prisma.$disconnect();
  }
})();

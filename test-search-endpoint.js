/**
 * Test search endpoint dengan simulate authenticated request
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Simulate handleFullTextSearch function
async function testSearchEndpoint() {
  console.log('=== Testing Search Endpoint Logic ===\n');
  
  try {
    // Simulate session dari user admin
    const session = {
      user: {
        id: 'cmjcoiqmx000008jpaxoxwzev', // admin user
        email: 'admin@dsm.com',
        role: 'admin',
        groupId: 'cmjcoiq9d002n8a8iwfw6gmey'
      }
    };
    
    const q = 'draft';
    const page = 1;
    const limit = 20;
    
    console.log('Testing search with:');
    console.log('  Query:', q);
    console.log('  User:', session.user.email);
    console.log('  Role:', session.user.role);
    console.log('');
    
    // Build access control condition
    const conditions = [];
    const params_sql = [];
    let paramIndex = 1;
    
    const userRole = (session.user.role || '').toLowerCase();
    if (userRole !== 'admin' && userRole !== 'administrator') {
      console.log('⚠️  Non-admin user - adding access control');
      conditions.push(`(
        d.created_by_id = $${paramIndex++} OR 
        d.is_public = true OR 
        $${paramIndex++} = ANY(d.access_groups) OR
        d.status = 'PUBLISHED'
      )`);
      params_sql.push(session.user.id, session.user.groupId || '');
    } else {
      console.log('✅ Admin user - no access control needed');
    }
    
    // Add full-text search condition
    const searchQuery = q.trim();
    const searchParamIndex = paramIndex++;
    conditions.push(`d.search_vector @@ websearch_to_tsquery('indonesian', $${searchParamIndex})`);
    params_sql.push(searchQuery);
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Calculate offset
    const offset = (page - 1) * limit;
    const limitIndex = paramIndex++;
    const offsetIndex = paramIndex++;
    params_sql.push(limit, offset);
    
    console.log('SQL WHERE clause:', whereClause);
    console.log('SQL params:', params_sql);
    console.log('');
    
    // Build query
    const searchQuerySQL = `
      SELECT 
        d.id,
        d.title,
        d.description,
        d.file_name,
        d.file_path,
        d.file_size,
        d.file_type,
        d.mime_type,
        d.document_number,
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
        ts_rank_cd(d.search_vector, websearch_to_tsquery('indonesian', $${searchParamIndex})) as search_rank,
        ts_headline('indonesian', COALESCE(d.title, ''), websearch_to_tsquery('indonesian', $${searchParamIndex}), 
          'MaxWords=10, MinWords=5, ShortWord=2, HighlightAll=false, MaxFragments=1') as title_highlight,
        ts_headline('indonesian', COALESCE(d.description, ''), websearch_to_tsquery('indonesian', $${searchParamIndex}), 
          'MaxWords=20, MinWords=10, ShortWord=2, HighlightAll=false, MaxFragments=2') as description_highlight
      FROM documents d
      ${whereClause}
      ORDER BY 
        ts_rank_cd(d.search_vector, websearch_to_tsquery('indonesian', $${searchParamIndex}), 32) * 
        (1 + log(1 + d.view_count + d.download_count * 2)) * 
        (CASE 
          WHEN d.status = 'PUBLISHED' THEN 1.5
          WHEN d.status = 'APPROVED' THEN 1.3
          WHEN d.status = 'PENDING_APPROVAL' THEN 1.1
          ELSE 1.0
        END) DESC,
        d.updated_at DESC
      LIMIT $${limitIndex}
      OFFSET $${offsetIndex}
    `;
    
    console.log('Executing search query...');
    const documents = await prisma.$queryRawUnsafe(searchQuerySQL, ...params_sql);
    
    console.log('');
    console.log('✅ Query executed successfully!');
    console.log('Found', documents.length, 'documents:');
    documents.forEach((doc, i) => {
      console.log(`  ${i + 1}. ${doc.title}`);
      console.log(`     Status: ${doc.status}, Public: ${doc.is_public}`);
      console.log(`     Rank: ${doc.search_rank}`);
    });
    
    if (documents.length === 0) {
      console.log('');
      console.log('⚠️  No documents found. Possible reasons:');
      console.log('  1. Document tidak memenuhi access control');
      console.log('  2. search_vector belum di-populate');
      console.log('  3. Query tidak match dengan dokumen yang ada');
    }
    
  } catch (error) {
    console.error('');
    console.error('❌ ERROR:', error.message);
    console.error('Code:', error.code);
    console.error('');
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSearchEndpoint();

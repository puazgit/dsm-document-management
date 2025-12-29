const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simulateAPIResponse() {
  try {
    console.log('Simulating API response for: /api/documents/search?q=dokumen&page=1&limit=20\n');
    
    const searchQuery = 'dokumen';
    const page = 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    
    // Simulate admin user (no access control)
    const searchParamIndex = 1;
    
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
    
    const countSQL = `
      SELECT COUNT(*) as total
      FROM documents d
      WHERE d.search_vector @@ websearch_to_tsquery('indonesian', $1)
    `;
    
    const [documents, countResult] = await Promise.all([
      prisma.$queryRawUnsafe(searchQuerySQL, searchQuery, limit, offset),
      prisma.$queryRawUnsafe(countSQL, searchQuery)
    ]);
    
    const total = parseInt(countResult[0]?.total || '0');
    const totalPages = Math.ceil(total / limit);
    
    // Fetch related data
    const documentTypeIds = [...new Set(documents.map(d => d.document_type_id))];
    const creatorIds = [...new Set(documents.map(d => d.created_by_id))];
    
    const [documentTypes, creators] = await Promise.all([
      prisma.documentType.findMany({
        where: { id: { in: documentTypeIds } },
        select: { id: true, name: true, slug: true, icon: true, color: true }
      }),
      prisma.user.findMany({
        where: { id: { in: creatorIds } },
        select: { id: true, firstName: true, lastName: true, email: true }
      })
    ]);
    
    // Enrich documents
    const enrichedDocuments = documents.map(doc => ({
      ...doc,
      documentType: documentTypes.find(dt => dt.id === doc.document_type_id),
      createdBy: creators.find(u => u.id === doc.created_by_id),
      highlights: {
        title: doc.title_highlight,
        description: doc.description_highlight
      }
    }));
    
    // Build response
    const response = {
      documents: enrichedDocuments,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      facets: {
        documentTypes: [],
        statuses: [],
        fileTypes: []
      },
      searchQuery: {
        q: searchQuery
      }
    };
    
    console.log('API Response Structure:');
    console.log('======================\n');
    console.log(JSON.stringify({
      documents: `Array(${enrichedDocuments.length})`,
      pagination: response.pagination,
      facets: '{ documentTypes, statuses, fileTypes }',
      searchQuery: response.searchQuery
    }, null, 2));
    
    console.log('\nDocuments Found:');
    enrichedDocuments.forEach((doc, i) => {
      console.log(`\n${i + 1}. ${doc.title}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Status: ${doc.status}`);
      console.log(`   Public: ${doc.is_public}`);
      console.log(`   Type: ${doc.documentType?.name || 'N/A'}`);
      console.log(`   Creator: ${doc.createdBy?.firstName} ${doc.createdBy?.lastName}`);
      console.log(`   Search Rank: ${doc.search_rank}`);
      console.log(`   File: ${doc.file_name}`);
    });
    
    console.log('\n✅ Total:', total, 'documents found');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code) console.error('Code:', error.code);
  } finally {
    await prisma.$disconnect();
  }
}

simulateAPIResponse();

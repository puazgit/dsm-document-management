import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/next-auth';
import { prisma } from '../../../../lib/prisma';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

// Validation schema for advanced search
const SearchSchema = z.object({
  q: z.string().optional(),
  documentTypeId: z.string().optional(),
  status: z.enum(['DRAFT', 'PENDING_REVIEW', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED', 'REJECTED', 'ARCHIVED', 'EXPIRED']).optional(),
  createdById: z.string().optional(),
  tags: z.string().optional(), // comma-separated tags
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  fileType: z.string().optional(),
  minSize: z.string().transform(Number).optional(),
  maxSize: z.string().transform(Number).optional(),
  isPublic: z.string().transform(Boolean).optional(),
  hasComments: z.string().transform(Boolean).optional(),
  searchIn: z.enum(['all', 'title', 'content', 'metadata']).default('all'), // Where to search
  sortBy: z.enum(['relevance', 'createdAt', 'updatedAt', 'title', 'downloadCount', 'viewCount', 'fileSize']).default('relevance'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('20'),
});

/**
 * Handle full-text search using PostgreSQL FTS
 */
async function handleFullTextSearch(params: any) {
  const {
    q,
    documentTypeId,
    status,
    createdById,
    tags,
    dateFrom,
    dateTo,
    fileType,
    minSize,
    maxSize,
    isPublic,
    hasComments,
    searchIn,
    sortBy,
    sortOrder,
    page,
    limit,
    session,
  } = params;

  // Build SQL WHERE conditions for filters
  const conditions: string[] = [];
  const params_sql: any[] = [];
  let paramIndex = 1;

  // Access control
  if (session.user.role !== 'ADMIN') {
    conditions.push(`(
      d.created_by_id = $${paramIndex++} OR 
      d.is_public = true OR 
      $${paramIndex++} = ANY(d.access_groups) OR
      d.status = 'PUBLISHED'
    )`);
    params_sql.push(session.user.id, session.user.groupId || '');
  }

  // Document type filter
  if (documentTypeId) {
    conditions.push(`d.document_type_id = $${paramIndex++}`);
    params_sql.push(documentTypeId);
  }

  // Status filter
  if (status) {
    conditions.push(`d.status = $${paramIndex++}::"DocumentStatus"`);
    params_sql.push(status);
  }

  // Creator filter
  if (createdById) {
    conditions.push(`d.created_by_id = $${paramIndex++}`);
    params_sql.push(createdById);
  }

  // Tags filter
  if (tags) {
    const tagList = tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0);
    if (tagList.length > 0) {
      conditions.push(`d.tags @> $${paramIndex++}::text[]`);
      params_sql.push(tagList);
    }
  }

  // Date range filter
  if (dateFrom) {
    conditions.push(`d.created_at >= $${paramIndex++}::timestamp`);
    params_sql.push(new Date(dateFrom));
  }
  if (dateTo) {
    conditions.push(`d.created_at <= $${paramIndex++}::timestamp`);
    params_sql.push(new Date(dateTo));
  }

  // File type filter
  if (fileType) {
    conditions.push(`d.file_type ILIKE $${paramIndex++}`);
    params_sql.push(`%${fileType}%`);
  }

  // File size filter
  if (minSize) {
    conditions.push(`d.file_size >= $${paramIndex++}`);
    params_sql.push(minSize);
  }
  if (maxSize) {
    conditions.push(`d.file_size <= $${paramIndex++}`);
    params_sql.push(maxSize);
  }

  // Public/private filter
  if (isPublic !== undefined) {
    conditions.push(`d.is_public = $${paramIndex++}`);
    params_sql.push(isPublic);
  }

  // Has comments filter
  if (hasComments) {
    conditions.push(`EXISTS (SELECT 1 FROM comments c WHERE c.document_id = d.id)`);
  }

  // Add full-text search condition
  const searchQuery = q.trim();
  conditions.push(`d.search_vector @@ websearch_to_tsquery('indonesian', $${paramIndex++})`);
  params_sql.push(searchQuery);

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Calculate offset
  const offset = (page - 1) * limit;

  // Determine ORDER BY clause
  let orderByClause = '';
  if (sortBy === 'relevance') {
    // Use the ranking function we created in migration
    orderByClause = `ORDER BY 
      ts_rank_cd(d.search_vector, websearch_to_tsquery('indonesian', $${paramIndex++}), 32) * 
      (1 + log(1 + d.view_count + d.download_count * 2)) * 
      (CASE 
        WHEN d.status = 'PUBLISHED' THEN 1.5
        WHEN d.status = 'APPROVED' THEN 1.3
        WHEN d.status = 'REVIEWED' THEN 1.1
        ELSE 1.0
      END) DESC,
      d.updated_at DESC`;
    params_sql.push(searchQuery);
  } else {
    const sortColumn = sortBy === 'createdAt' ? 'd.created_at' :
                      sortBy === 'updatedAt' ? 'd.updated_at' :
                      sortBy === 'title' ? 'd.title' :
                      sortBy === 'downloadCount' ? 'd.download_count' :
                      sortBy === 'viewCount' ? 'd.view_count' :
                      sortBy === 'fileSize' ? 'd.file_size' : 'd.updated_at';
    orderByClause = `ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}`;
  }

  // Build main query with ranking
  const searchQuerySQL = `
    SELECT 
      d.*,
      ts_rank_cd(d.search_vector, websearch_to_tsquery('indonesian', $${paramIndex++})) as search_rank,
      ts_headline('indonesian', COALESCE(d.title, ''), websearch_to_tsquery('indonesian', $${paramIndex++}), 
        'MaxWords=10, MinWords=5, ShortWord=2, HighlightAll=false, MaxFragments=1') as title_highlight,
      ts_headline('indonesian', COALESCE(d.description, ''), websearch_to_tsquery('indonesian', $${paramIndex++}), 
        'MaxWords=20, MinWords=10, ShortWord=2, HighlightAll=false, MaxFragments=2') as description_highlight
    FROM documents d
    ${whereClause}
    ${orderByClause}
    LIMIT $${paramIndex++}
    OFFSET $${paramIndex++}
  `;
  params_sql.push(searchQuery, searchQuery, searchQuery, limit, offset);

  // Count query
  const countQuerySQL = `
    SELECT COUNT(*) as total
    FROM documents d
    ${whereClause}
  `;

  // Execute queries
  const [documents, countResult]: any = await Promise.all([
    prisma.$queryRawUnsafe(searchQuerySQL, ...params_sql),
    prisma.$queryRawUnsafe(countQuerySQL, ...params_sql.slice(0, params_sql.length - 2)), // Remove limit/offset params
  ]);

  const total = parseInt(countResult[0]?.total || '0');

  // Fetch related data for documents
  const documentIds = documents.map((d: any) => d.id);
  
  const [documentTypes, creators, updaters, approvers, comments] = await Promise.all([
    prisma.documentType.findMany({
      where: { id: { in: documents.map((d: any) => d.document_type_id) } },
      select: { id: true, name: true, slug: true, icon: true, color: true },
    }),
    prisma.user.findMany({
      where: { id: { in: documents.map((d: any) => d.created_by_id) } },
      select: { id: true, firstName: true, lastName: true, email: true },
    }),
    prisma.user.findMany({
      where: { id: { in: documents.map((d: any) => d.updated_by_id).filter(Boolean) } },
      select: { id: true, firstName: true, lastName: true, email: true },
    }),
    prisma.user.findMany({
      where: { id: { in: documents.map((d: any) => d.approved_by_id).filter(Boolean) } },
      select: { id: true, firstName: true, lastName: true, email: true },
    }),
    prisma.comment.groupBy({
      by: ['documentId'],
      where: { documentId: { in: documentIds } },
      _count: true,
    }),
  ]);

  // Enrich documents with relations
  const enrichedDocuments = documents.map((doc: any) => ({
    ...doc,
    documentType: documentTypes.find((dt: any) => dt.id === doc.document_type_id),
    createdBy: creators.find((u: any) => u.id === doc.created_by_id),
    updatedBy: updaters.find((u: any) => u.id === doc.updated_by_id),
    approvedBy: approvers.find((u: any) => u.id === doc.approved_by_id),
    _count: {
      comments: comments.find((c: any) => c.documentId === doc.id)?._count || 0,
    },
    // Add highlights
    highlights: {
      title: doc.title_highlight,
      description: doc.description_highlight,
    },
  }));

  // Calculate pagination
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  // Get facets for filters
  const facets = await getFacets(whereClause, params_sql.slice(0, params_sql.length - 2), documentTypeId, status, fileType);

  return NextResponse.json({
    documents: enrichedDocuments,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage,
      hasPrevPage,
    },
    facets,
    searchQuery: {
      q,
      documentTypeId,
      status,
      createdById,
      tags,
      dateFrom,
      dateTo,
      fileType,
      minSize,
      maxSize,
      isPublic,
      hasComments,
      searchIn,
      sortBy,
      sortOrder,
    },
    searchMeta: {
      usedFullTextSearch: true,
      resultsFound: total > 0,
    },
  });
}

/**
 * Get search facets for filtering UI
 */
async function getFacets(baseWhere: string, baseParams: any[], currentDocTypeId?: string, currentStatus?: string, currentFileType?: string) {
  // Document types facet (exclude current filter)
  const docTypeWhere = baseWhere.replace(/AND d\.document_type_id = \$\d+/, '');
  const docTypeFacets = await prisma.$queryRawUnsafe<any[]>(`
    SELECT d.document_type_id, COUNT(*)::int as count
    FROM documents d
    ${docTypeWhere}
    GROUP BY d.document_type_id
    ORDER BY count DESC
    LIMIT 20
  `, ...baseParams.filter((_, i) => {
    // Filter out documentTypeId param
    return true; // Simplified - in production, properly filter params
  }));

  const documentTypes = await prisma.documentType.findMany({
    where: { id: { in: docTypeFacets.map((f: any) => f.document_type_id) } },
    select: { id: true, name: true, icon: true, color: true },
  });

  // Status facet
  const statusWhere = baseWhere.replace(/AND d\.status = \$\d+::"DocumentStatus"/, '');
  const statusFacets = await prisma.$queryRawUnsafe<any[]>(`
    SELECT d.status, COUNT(*)::int as count
    FROM documents d
    ${statusWhere}
    GROUP BY d.status
    ORDER BY count DESC
  `, ...baseParams);

  // File type facet
  const fileTypeWhere = baseWhere.replace(/AND d\.file_type ILIKE \$\d+/, '');
  const fileTypeFacets = await prisma.$queryRawUnsafe<any[]>(`
    SELECT d.file_type, COUNT(*)::int as count
    FROM documents d
    ${fileTypeWhere}
    GROUP BY d.file_type
    ORDER BY count DESC
    LIMIT 10
  `, ...baseParams);

  return {
    documentTypes: docTypeFacets.map((f: any) => ({
      documentTypeId: f.document_type_id,
      _count: { id: f.count },
      documentType: documentTypes.find((dt: any) => dt.id === f.document_type_id),
    })),
    statuses: statusFacets.map((f: any) => ({
      status: f.status,
      _count: { id: f.count },
    })),
    fileTypes: fileTypeFacets.map((f: any) => ({
      fileType: f.file_type,
      _count: { id: f.count },
    })),
  };
}

// GET /api/documents/search - Advanced document search
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());
    
    const {
      q,
      documentTypeId,
      status,
      createdById,
      tags,
      dateFrom,
      dateTo,
      fileType,
      minSize,
      maxSize,
      isPublic,
      hasComments,
      searchIn,
      sortBy,
      sortOrder,
      page,
      limit,
    } = SearchSchema.parse(query);

    // If using full-text search, use PostgreSQL FTS
    if (q && q.trim().length > 0) {
      return await handleFullTextSearch({
        q: q.trim(),
        documentTypeId,
        status,
        createdById,
        tags,
        dateFrom,
        dateTo,
        fileType,
        minSize,
        maxSize,
        isPublic,
        hasComments,
        searchIn,
        sortBy,
        sortOrder,
        page,
        limit,
        session,
      });
    }

    // Build where clause for regular (non-FTS) search
    const where: any = {};

    // Access control - users can only see documents they have access to
    if (session.user.role !== 'ADMIN') {
      where.OR = [
        { createdById: session.user.id }, // Documents they created
        { isPublic: true }, // Public documents
        { accessGroups: { has: session.user.groupId || '' } }, // Documents accessible to their group
        { accessGroups: { has: session.user.role || '' } }, // Documents accessible to their role
        { status: 'PUBLISHED' }, // All published documents are visible to everyone
      ];
    }

    // Filter by document type
    if (documentTypeId) {
      where.documentTypeId = documentTypeId;
    }

    // Filter by status
    if (status) {
      where.status = status;
    }

    // Filter by creator
    if (createdById) {
      where.createdById = createdById;
    }

    // Filter by tags
    if (tags) {
      const tagList = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      if (tagList.length > 0) {
        where.tags = { hasEvery: tagList };
      }
    }

    // Filter by date range
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    // Filter by file type
    if (fileType) {
      where.fileType = { contains: fileType, mode: 'insensitive' };
    }

    // Filter by file size
    if (minSize || maxSize) {
      where.fileSize = {};
      if (minSize) {
        where.fileSize.gte = minSize;
      }
      if (maxSize) {
        where.fileSize.lte = maxSize;
      }
    }

    // Filter by public/private
    if (isPublic !== undefined) {
      where.isPublic = isPublic;
    }

    // Filter by documents with comments
    if (hasComments) {
      where.comments = { some: {} };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Determine order by clause
    let orderBy: any = {};
    
    if (sortBy === 'relevance' && q) {
      // For relevance, we'll order by a combination of factors
      // This is a simplified relevance - in production you might want to use full-text search
      orderBy = [
        { updatedAt: 'desc' },
        { viewCount: 'desc' },
        { downloadCount: 'desc' },
      ];
    } else {
      orderBy = { [sortBy]: sortOrder };
    }

    // Execute search query
    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          documentType: {
            select: {
              id: true,
              name: true,
              slug: true,
              icon: true,
              color: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          updatedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          approvedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: {
            select: {
              comments: true,
              versions: true,
            },
          },
        },
      }),
      prisma.document.count({ where }),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Calculate search facets for filtering UI
    const facets = await Promise.all([
      // Document types facet
      prisma.document.groupBy({
        by: ['documentTypeId'],
        where: { ...where, documentTypeId: undefined }, // Remove document type filter for facet count
        _count: { id: true },
      }).then(async (results: any) => {
        const typeIds = results.map((r: any) => r.documentTypeId);
        const types = await prisma.documentType.findMany({
          where: { id: { in: typeIds } },
          select: { id: true, name: true, icon: true, color: true },
        });
        return results.map((r: any) => ({
          ...r,
          documentType: types.find((t: any) => t.id === r.documentTypeId),
        }));
      }),

      // Status facet
      prisma.document.groupBy({
        by: ['status'],
        where: { ...where, status: undefined }, // Remove status filter for facet count
        _count: { id: true },
      }),

      // File type facet
      prisma.document.groupBy({
        by: ['fileType'],
        where: { ...where, fileType: undefined }, // Remove file type filter for facet count
        _count: { id: true },
      }),
    ]);

    return NextResponse.json({
      documents,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
      facets: {
        documentTypes: facets[0],
        statuses: facets[1],
        fileTypes: facets[2],
      },
      searchQuery: {
        q,
        documentTypeId,
        status,
        createdById,
        tags,
        dateFrom,
        dateTo,
        fileType,
        minSize,
        maxSize,
        isPublic,
        hasComments,
        sortBy,
        sortOrder,
      },
    });
  } catch (error) {
    console.error('Error searching documents:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid search parameters', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
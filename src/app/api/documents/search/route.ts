import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/next-auth';
import { prisma } from '../../../../lib/prisma';
import { requireCapability } from '@/lib/rbac-helpers';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { serializeForResponse } from '../../../../lib/bigint-utils';

// Validation schema for advanced search
const SearchSchema = z.object({
  q: z.string().optional(),
  documentTypeId: z.string().optional(),
  status: z.enum(['DRAFT', 'IN_REVIEW', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED', 'REJECTED', 'ARCHIVED', 'EXPIRED']).optional(),
  createdById: z.string().optional(),
  tags: z.string().optional(), // comma-separated tags
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  fileType: z.string().optional(),
  minSize: z.string().transform(Number).optional(),
  maxSize: z.string().transform(Number).optional(),
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
async function handleFullTextSearch(params: any, bypassAccessControl = false) {
  console.log('[FTS] Starting full-text search with params:', JSON.stringify(params, null, 2));

  try {
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
      hasComments,
      searchIn,
      sortBy,
      sortOrder,
      page,
      limit,
      session: passedSession,
    } = params;
    // Ensure we have a session object (defensive) if access control is required
    const session = !bypassAccessControl ? (passedSession || await getServerSession(authOptions)) : undefined;
    if (!bypassAccessControl) console.log('[FTS] User (maybe):', session?.user?.email, 'Role:', session?.user?.role);

    // Guard: if query is empty after trimming, return empty result to avoid SQL errors
    const trimmedQuery = (q || '').toString().trim();
    if (!trimmedQuery) {
      return NextResponse.json({
        documents: [],
        pagination: { page: page || 1, limit: limit || 20, total: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false },
        facets: { documentTypes: [], statuses: [], fileTypes: [] },
        searchQuery: {},
        searchMeta: { usedFullTextSearch: true, resultsFound: false }
      });
    }

  // Build SQL WHERE conditions for filters
  const conditions: string[] = [];
  const params_sql: any[] = [];
  let paramIndex = 1;

  // Access control (skip when bypassing in dev)
  if (!bypassAccessControl) {
    const userRole = (session.user.role || '').toLowerCase();
    console.log('[FTS] User role:', userRole, 'Type:', typeof userRole);
    console.log('[FTS] Session user:', JSON.stringify(session.user));
    
    if (userRole !== 'admin' && userRole !== 'administrator') {
      conditions.push(`(
      d.created_by_id = $${paramIndex++} OR 
      d.access_groups = '{}' OR 
      $${paramIndex++} = ANY(d.access_groups) OR
      d.status = 'PUBLISHED'
    )`);
      params_sql.push(session.user.id, session.user.groupId || '');
    }
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

  // Has comments filter
  if (hasComments) {
    conditions.push(`EXISTS (SELECT 1 FROM comments c WHERE c.document_id = d.id)`);
  }

  // Add full-text search condition
  const searchQuery = trimmedQuery;
  const searchParamIndex = paramIndex++;
  conditions.push(`d.search_vector @@ websearch_to_tsquery('indonesian', $${searchParamIndex})`);
  params_sql.push(searchQuery);
  
  console.log('[SEARCH API] Search query:', searchQuery, 'Param index:', searchParamIndex);
  console.log('[SEARCH API] Conditions:', conditions);
  console.log('[SEARCH API] Params so far:', params_sql);

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Calculate offset
  const offset = (page - 1) * limit;
  const limitIndex = paramIndex++;
  const offsetIndex = paramIndex++;
  params_sql.push(limit, offset);

  // Determine ORDER BY clause - reuse searchParamIndex for same query
  let orderByClause = '';
  
  if (sortBy === 'relevance') {
    // Use the ranking function we created in migration
    // Reuse searchParamIndex since it's the same search query
    orderByClause = `ORDER BY 
      ts_rank_cd(d.search_vector, websearch_to_tsquery('indonesian', $${searchParamIndex}), 32) * 
      (1 + log(1 + d.view_count + d.download_count * 2)) * 
      (CASE 
        WHEN d.status = 'PUBLISHED' THEN 1.5
        WHEN d.status = 'APPROVED' THEN 1.3
        WHEN d.status = 'PENDING_APPROVAL' THEN 1.1
        ELSE 1.0
      END) DESC,
      d.updated_at DESC`;
  } else {
    const sortColumn = sortBy === 'createdAt' ? 'd.created_at' :
                      sortBy === 'updatedAt' ? 'd.updated_at' :
                      sortBy === 'title' ? 'd.title' :
                      sortBy === 'downloadCount' ? 'd.download_count' :
                      sortBy === 'viewCount' ? 'd.view_count' :
                      sortBy === 'fileSize' ? 'd.file_size' : 'd.updated_at';
    orderByClause = `ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}`;
  }

  // Build main query with ranking - reuse searchParamIndex for all search query references
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
    ${orderByClause}
    LIMIT $${limitIndex}
    OFFSET $${offsetIndex}
  `;

  // Count query
  const countQuerySQL = `
    SELECT COUNT(*) as total
    FROM documents d
    ${whereClause}
  `;

  // Execute queries
  console.log('[SEARCH API] Executing SQL with params:', params_sql);
  console.log('[SEARCH API] Search query SQL:', searchQuerySQL.substring(0, 500));
  
  let documents: any, countResult: any;
  try {
    [documents, countResult] = await Promise.all([
      prisma.$queryRawUnsafe(searchQuerySQL, ...params_sql),
      prisma.$queryRawUnsafe(countQuerySQL, ...params_sql.slice(0, -2)), // Remove limit & offset params for count query
    ]);
  } catch (sqlError: any) {
    console.error('[SEARCH API] SQL Error:', sqlError.message);
    console.error('[SEARCH API] SQL Code:', sqlError.code);
    // If the search_vector column or FTS setup is missing, fallback to a safe Prisma-based search
    if (sqlError?.code === '42703' || sqlError?.meta?.code === '42703') {
      console.warn('[SEARCH API] FTS column missing or invalid. Falling back to Prisma search.');

      // Build a safe Prisma where clause similar to non-FTS route
      const where: any = {};

      // Access control
      if (!bypassAccessControl) {
        const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, groupId: true } });
        where.OR = [
          { createdById: session.user.id },
          { accessGroups: { has: user?.groupId || '' } },
          { accessGroups: { isEmpty: true } },
          { status: 'PUBLISHED' },
        ];
      }

      if (documentTypeId) where.documentTypeId = documentTypeId;
      if (status) where.status = status;
      if (createdById) where.createdById = createdById;
      if (tags) {
        const tagList = tags.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0);
        if (tagList.length > 0) where.tags = { hasEvery: tagList };
      }
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = new Date(dateFrom);
        if (dateTo) where.createdAt.lte = new Date(dateTo);
      }
      if (fileType) where.fileType = { contains: fileType, mode: 'insensitive' };
      if (minSize || maxSize) {
        where.fileSize = {};
        if (minSize) where.fileSize.gte = minSize;
        if (maxSize) where.fileSize.lte = maxSize;
      }
      if (hasComments) where.comments = { some: {} };

      // Simple text matching fallback
      const text = trimmedQuery;
      if (text) {
        const titleCond = { title: { contains: text, mode: 'insensitive' } };
        const descCond = { description: { contains: text, mode: 'insensitive' } };

        if (searchIn === 'title') {
          // If access-control OR is present, combine with AND so both access and text must match
          if (where.OR) {
            const accessOr = where.OR;
            delete where.OR;
            where.AND = [{ OR: accessOr }, titleCond];
          } else {
            where.title = { contains: text, mode: 'insensitive' };
          }
        } else if (searchIn === 'content') {
          if (where.OR) {
            const accessOr = where.OR;
            delete where.OR;
            where.AND = [{ OR: accessOr }, descCond];
          } else {
            where.description = { contains: text, mode: 'insensitive' };
          }
        } else if (searchIn === 'metadata') {
          if (where.OR) {
            const accessOr = where.OR;
            delete where.OR;
            where.AND = [{ OR: accessOr }, { metadata: { contains: text, mode: 'insensitive' } }];
          } else {
            where.metadata = { contains: text, mode: 'insensitive' };
          }
        } else {
          const textOr = [titleCond, descCond];
          if (where.OR) {
            // Combine access-control OR with text OR so both must apply
            const accessOr = where.OR;
            delete where.OR;
            where.AND = [{ OR: accessOr }, { OR: textOr }];
          } else {
            where.OR = textOr;
          }
        }
      }

      // Pagination
      const offset = (page - 1) * limit;

      const orderBy = (sortBy === 'relevance' && q) ? [ { updatedAt: 'desc' }, { viewCount: 'desc' } ] : { [sortBy]: sortOrder };

      const [prismaDocs, prismaCount] = await Promise.all([
        prisma.document.findMany({ where, skip: offset, take: limit, orderBy, include: {
          documentType: { select: { id: true, name: true, slug: true, icon: true, color: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          updatedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          approvedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          _count: { select: { comments: true } },
        } }),
        prisma.document.count({ where }),
      ]);

      const total = prismaCount;

      // Temporary debug: compute and log which fields matched the search text for Prisma fallback
      if (process.env.NODE_ENV !== 'production') {
        try {
          const textLower = (trimmedQuery || '').toLowerCase();
          const reasonsLog: any[] = [];
          prismaDocs.forEach((d: any) => {
            const reasons: string[] = [];
            if (d.title && String(d.title).toLowerCase().includes(textLower)) reasons.push('title');
            if (d.description && String(d.description).toLowerCase().includes(textLower)) reasons.push('description');
            try {
              if (d.metadata && JSON.stringify(d.metadata).toLowerCase().includes(textLower)) reasons.push('metadata');
            } catch {}
            if (Array.isArray(d.tags) && d.tags.some((t: any) => String(t).toLowerCase().includes(textLower))) reasons.push('tags');
            if (d.extractedText && String(d.extractedText).toLowerCase().includes(textLower)) reasons.push('extractedText');
            reasonsLog.push({ id: d.id, title: d.title, reasons });
          });
          console.log('[SEARCH API][FALLBACK MATCH REASONS]', reasonsLog);
        } catch (e) {
          console.warn('[SEARCH API] Failed to compute fallback match reasons', e);
        }
      }

      return NextResponse.json(serializeForResponse({
        documents: prismaDocs,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
        facets: await getFacets('', [], documentTypeId, status, fileType),
        searchQuery: { q, documentTypeId, status, createdById, tags, dateFrom, dateTo, fileType, minSize, maxSize, hasComments, searchIn, sortBy, sortOrder },
        searchMeta: { usedFullTextSearch: false, resultsFound: total > 0 }
      }));
    }
    throw sqlError;
  }

  const total = parseInt(countResult[0]?.total || '0');
  console.log('[SEARCH API] Found', total, 'total documents,', documents.length, 'in current page');

  // Fetch related data for documents
  const documentIds = documents.map((d: any) => d.id);
  
  console.log('[SEARCH API] Fetching related data for', documentIds.length, 'documents');
  
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

  // Temporary debug: log which fields produced matches (FTS highlights)
  if (process.env.NODE_ENV !== 'production') {
    try {
      enrichedDocuments.forEach((doc: any) => {
        const reasons: string[] = [];
        if (doc.highlights?.title && String(doc.highlights.title).trim() !== '') reasons.push('title');
        if (doc.highlights?.description && String(doc.highlights.description).trim() !== '') reasons.push('description');
        console.log('[SEARCH API][FTS MATCH REASONS]', { id: doc.id, title: doc.title, reasons });
      });
    } catch (e) {
      console.warn('[SEARCH API] Failed to compute FTS match reasons', e);
    }
  }

  // Calculate pagination
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  // Get facets for filters
  const facets = await getFacets(whereClause, params_sql.slice(0, params_sql.length - 2), documentTypeId, status, fileType);

  console.log('[FTS] Returning response with', enrichedDocuments.length, 'documents');

  return NextResponse.json(serializeForResponse({
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
      hasComments,
      searchIn,
      sortBy,
      sortOrder,
    },
    searchMeta: {
      usedFullTextSearch: true,
      resultsFound: total > 0,
    },
  }));
  } catch (error: any) {
    console.error('[FTS] Error in handleFullTextSearch:', error);
    console.error('[FTS] Error code:', error?.code);
    console.error('[FTS] Error message:', error?.message);
    if (error?.meta) {
      console.error('[FTS] Error meta:', error.meta);
    }
    // In development (bypass) return detailed error for debugging
    if (bypassAccessControl) {
      return NextResponse.json({ error: 'Full text search failed', message: error?.message, stack: error?.stack, code: error?.code, meta: error?.meta }, { status: 500 });
    }
    // Return a safe 500 response in production
    return NextResponse.json({ error: 'Full text search failed' }, { status: 500 });
  }
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
    const bypassAuth = process.env.NODE_ENV !== 'production';
    let auth;
    if (!bypassAuth) {
      auth = await requireCapability(request, 'DOCUMENT_VIEW');
      if (!auth.authorized) return auth.error;
    } else {
      // Development: bypass auth and access control
      auth = { authorized: true } as any;
    }

    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());
    
    console.log('[SEARCH API] Received query:', query);
    
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
      hasComments,
      searchIn,
      sortBy,
      sortOrder,
      page,
      limit,
    } = SearchSchema.parse(query);

    console.log('[SEARCH API] Parsed q:', q, 'Length:', q?.length, 'Trimmed length:', q?.trim().length);

    // If using full-text search, use PostgreSQL FTS
    if (q && q.trim().length > 0) {
      const session = !bypassAuth ? await getServerSession(authOptions) : undefined;
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
        hasComments,
        searchIn,
        sortBy,
        sortOrder,
        page,
        limit,
        session,
      }, bypassAuth);
    }

    // Build where clause for regular (non-FTS) search
    const where: any = {};

    // Get user for access control (skip in dev bypass)
    if (!bypassAuth) {
      const user = await prisma.user.findUnique({
        where: { id: auth.userId! },
        select: { id: true, groupId: true }
      });

      // Access control - apply to all non-admin users
      where.OR = [
        { createdById: auth.userId }, // Documents they created
        { accessGroups: { has: user?.groupId || '' } }, // Documents accessible to their group
        { accessGroups: { isEmpty: true } }, // Documents without group restrictions
        { status: 'PUBLISHED' }, // All published documents visible based on capabilities
      ];
    } else {
      // Development bypass - no access control restrictions
      // leave `where` empty to allow all documents
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
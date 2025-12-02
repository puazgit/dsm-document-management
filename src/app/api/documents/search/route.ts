import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/next-auth';
import { prisma } from '../../../../lib/prisma';
import { z } from 'zod';

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
  sortBy: z.enum(['relevance', 'createdAt', 'updatedAt', 'title', 'downloadCount', 'viewCount', 'fileSize']).default('relevance'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('20'),
});

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
      sortBy,
      sortOrder,
      page,
      limit,
    } = SearchSchema.parse(query);

    // Build where clause
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

    // Text search functionality
    if (q) {
      const searchTerms = q.split(' ').filter(term => term.length > 0);
      const searchConditions = searchTerms.map(term => ({
        OR: [
          { title: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
          { fileName: { contains: term, mode: 'insensitive' } },
          { tags: { has: term } },
        ],
      }));
      
      if (searchConditions.length > 0) {
        where.AND = (where.AND || []).concat(searchConditions);
      }
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
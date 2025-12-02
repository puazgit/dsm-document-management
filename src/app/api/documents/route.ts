import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/next-auth';
import { prisma } from '../../../lib/prisma';
import { z } from 'zod';
import { serializeForResponse } from '../../../lib/bigint-utils';
import { trackDocumentCreated } from '../../../lib/document-history';

// Validation schemas
const DocumentCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title too long'),
  description: z.string().optional(),
  documentTypeId: z.string().cuid('Invalid document type ID'),
  isPublic: z.boolean().default(false),
  accessGroups: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.any()).optional(),
  expiresAt: z.string().datetime().optional(),
});

const DocumentQuerySchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('10'),
  search: z.string().optional(),
  documentTypeId: z.string().optional(),
  status: z.enum(['DRAFT', 'PENDING_REVIEW', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED', 'REJECTED', 'ARCHIVED', 'EXPIRED']).optional(),
  isPublic: z.string().transform(Boolean).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'downloadCount', 'viewCount']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// GET /api/documents - List documents with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());
    
    const {
      page,
      limit,
      search,
      documentTypeId,
      status,
      isPublic,
      sortBy,
      sortOrder
    } = DocumentQuerySchema.parse(query);

    // Build where clause
    const where: any = {};

    // Search functionality
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { fileName: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
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

    // Access control - users can only see documents they have access to
    // Always apply access control unless user is administrator
    const userRole = session.user.role || '';
    const isAdmin = ['admin', 'org_administrator'].includes(userRole);
    
    if (!isAdmin) {
      const role = session.user.role || '';
      let accessConditions = [];

      // Define access rules based on role hierarchy
      switch (role) {
        case 'editor':
          // Editors can see all documents except admin-only
          accessConditions = [
            { createdById: session.user.id },
            { isPublic: true },
            { status: { in: ['DRAFT', 'PENDING_REVIEW', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED'] } },
            { accessGroups: { has: session.user.groupId || '' } },
            { accessGroups: { has: session.user.role || '' } }
          ];
          break;

        case 'org_dirut':
        case 'org_administrator':
          // High-level executives can see most documents
          accessConditions = [
            { createdById: session.user.id },
            { isPublic: true },
            { status: { in: ['PENDING_APPROVAL', 'APPROVED', 'PUBLISHED'] } },
            { accessGroups: { has: session.user.groupId || '' } },
            { accessGroups: { has: session.user.role || '' } }
          ];
          break;

        case 'org_dewas':
        case 'org_ppd':
          // PPD and oversight roles can see approved and published documents
          accessConditions = [
            { createdById: session.user.id },
            { isPublic: true },
            { status: { in: ['APPROVED', 'PUBLISHED'] } },
            { accessGroups: { has: session.user.groupId || '' } },
            { accessGroups: { has: session.user.role || '' } }
          ];
          break;

        case 'org_komite_audit':
        case 'org_kadiv':
        case 'org_gm':
        case 'org_finance':
          // Management levels can see approved and published documents
          accessConditions = [
            { createdById: session.user.id },
            { isPublic: true },
            { status: { in: ['APPROVED', 'PUBLISHED'] } },
            { accessGroups: { has: session.user.groupId || '' } },
            { accessGroups: { has: session.user.role || '' } }
          ];
          break;

        case 'org_hrd':
        case 'org_manager':
          // Managers can see their own drafts + published documents
          accessConditions = [
            { createdById: session.user.id },
            { isPublic: true },
            { status: 'PUBLISHED' },
            { 
              AND: [
                { createdById: session.user.id },
                { status: { in: ['DRAFT', 'PENDING_REVIEW'] } }
              ]
            },
            { accessGroups: { has: session.user.groupId || '' } },
            { accessGroups: { has: session.user.role || '' } }
          ];
          break;

        case 'org_supervisor':
          // Supervisors only see published documents (as already implemented)
          where.status = 'PUBLISHED';
          return; // Early return to skip the general OR logic
          
        case 'org_sekretaris':
          // Secretaries can see published and documents accessible to them
          accessConditions = [
            { createdById: session.user.id },
            { isPublic: true },
            { status: 'PUBLISHED' },
            { accessGroups: { has: session.user.groupId || '' } },
            { accessGroups: { has: session.user.role || '' } }
          ];
          break;

        case 'org_staff':
          // Staff can only see published documents and their own
          accessConditions = [
            { createdById: session.user.id },
            { status: 'PUBLISHED' },
            { isPublic: true }
          ];
          break;

        case 'org_guest':
        case 'viewer':
          // Guests and viewers only see published public documents
          accessConditions = [
            { 
              AND: [
                { status: 'PUBLISHED' },
                { isPublic: true }
              ]
            }
          ];
          break;

        default:
          // Default fallback for unknown roles
          accessConditions = [
            { createdById: session.user.id },
            { 
              AND: [
                { status: 'PUBLISHED' },
                { isPublic: true }
              ]
            }
          ];
          break;
      }

      // Apply access conditions
      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: accessConditions }
        ];
        delete where.OR;
      } else {
        where.OR = accessConditions;
      }
    }

    // Filter by public/private (after access control)
    if (isPublic !== undefined) {
      if (where.AND) {
        where.AND.push({ isPublic });
      } else {
        where.isPublic = isPublic;
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query
    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
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
    const totalNumber = Number(total);
    const totalPages = Math.ceil(totalNumber / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json(serializeForResponse({
      documents,
      pagination: {
        page,
        limit,
        total: totalNumber,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    }));
  } catch (error) {
    console.error('Error fetching documents:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid query parameters', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/documents - Create new document (metadata only, file upload handled separately)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = DocumentCreateSchema.parse(body);

    // Verify document type exists and user has access
    const documentType = await prisma.documentType.findUnique({
      where: { id: data.documentTypeId },
    });

    if (!documentType || !documentType.isActive) {
      return NextResponse.json({ error: 'Invalid or inactive document type' }, { status: 400 });
    }

    // Create document
    const document = await prisma.document.create({
      data: {
        ...data,
        fileName: '', // Will be updated when file is uploaded
        filePath: '', // Will be updated when file is uploaded
        createdById: session.user.id,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
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
        _count: {
          select: {
            comments: true,
            versions: true,
          },
        },
      },
    });

    // Log document creation activity
    await prisma.documentActivity.create({
      data: {
        documentId: document.id,
        userId: session.user.id,
        action: 'CREATE',
        description: `Document "${document.title}" was created`,
      },
    });

    // Track document history
    try {
      await trackDocumentCreated(document.id, session.user.id, {
        title: document.title,
        description: document.description,
        documentType: document.documentType.name,
        status: document.status,
      });
    } catch (historyError) {
      console.error('Error tracking document creation history:', historyError);
      // Continue execution even if history tracking fails
    }

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('Error creating document:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid document data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
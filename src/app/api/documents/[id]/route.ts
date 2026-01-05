import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '../../../../lib/next-auth';
import { prisma } from '../../../../lib/prisma';
import { requireCapability } from '@/lib/rbac-helpers';
import { z } from 'zod';
import { serializeForResponse } from '../../../../lib/bigint-utils';

// Validation schema for document updates
const DocumentUpdateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title too long').optional(),
  description: z.string().optional(),
  documentTypeId: z.string().cuid('Invalid document type ID').optional(),
  status: z.enum(['DRAFT', 'IN_REVIEW', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED', 'REJECTED', 'ARCHIVED', 'EXPIRED']).optional(),
  accessGroups: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
});

// GET /api/documents/[id] - Get single document
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireCapability(request, 'DOCUMENT_VIEW');

    const { id } = params;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        documentType: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            color: true,
            description: true,
            requiredApproval: true,
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
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 5, // Show last 5 versions
          include: {
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        comments: {
          orderBy: { createdAt: 'desc' },
          take: 10, // Show last 10 comments
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            replies: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 10, // Show last 10 activities
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            comments: true,
            versions: true,
            activities: true,
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Access check done via capability system
    // Additional document-level access could be checked here if needed

    // Increment view count
    await prisma.document.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    // Log view activity only for published documents
    if (document.status === 'PUBLISHED') {
      // Check for duplicate view logs within the last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recentView = await prisma.documentActivity.findFirst({
        where: {
          documentId: id,
          userId: auth.userId!,
          action: 'VIEW',
          createdAt: {
            gte: fiveMinutesAgo,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (recentView) {
        console.log(`⏭️  [GET /documents/${id}] Skipping duplicate view log - already viewed recently at: ${recentView.createdAt.toISOString()}`);
      } else {
        await prisma.documentActivity.create({
          data: {
            documentId: id,
            userId: auth.userId!,
            action: 'VIEW',
            description: `Document "${document.title}" was viewed`,
            metadata: {
              source: 'document_details_api',
              timestamp: new Date().toISOString(),
            },
          },
        });
      }
    }

    return NextResponse.json(serializeForResponse(document));
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/documents/[id] - Update document
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireCapability(request, 'DOCUMENT_EDIT');

    const { id } = params;
    const body = await request.json();
    const data = DocumentUpdateSchema.parse(body);

    // Check if document exists and user has permission to edit
    const existingDocument = await prisma.document.findUnique({
      where: { id },
      include: {
        documentType: true,
      },
    });

    if (!existingDocument) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Permission check done via capability system

    // Validate document type if being changed
    if (data.documentTypeId && data.documentTypeId !== existingDocument.documentTypeId) {
      const documentType = await prisma.documentType.findUnique({
        where: { id: data.documentTypeId },
      });

      if (!documentType || !documentType.isActive) {
        return NextResponse.json({ error: 'Invalid or inactive document type' }, { status: 400 });
      }
    }

    // Track what fields are being changed for activity log
    const changes: string[] = [];
    if (data.title && data.title !== existingDocument.title) {
      changes.push(`title from "${existingDocument.title}" to "${data.title}"`);
    }
    if (data.status && data.status !== existingDocument.status) {
      changes.push(`status from "${existingDocument.status}" to "${data.status}"`);
    }

    // Update document
    const updatedDocument = await prisma.document.update({
      where: { id },
      data: {
        ...data,
        updatedById: auth.userId,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
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
        updatedBy: {
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

    // Log update activity
    await prisma.documentActivity.create({
      data: {
        documentId: id,
        userId: auth.userId!,
        action: 'UPDATE',
        description: changes.length > 0 
          ? `Document "${updatedDocument.title}" was updated: ${changes.join(', ')}`
          : `Document "${updatedDocument.title}" was updated`,
      },
    });

    return NextResponse.json(serializeForResponse(updatedDocument));
  } catch (error) {
    console.error('Error updating document:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid document data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/documents/[id] - Delete document (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireCapability(request, 'DOCUMENT_DELETE');

    const { id } = params;

    // Check if document exists and user has permission to delete
    const existingDocument = await prisma.document.findUnique({
      where: { id },
    });

    if (!existingDocument) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Permission check done via capability system

    // Soft delete by setting status to ARCHIVED
    const deletedDocument = await prisma.document.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        updatedById: auth.userId,
      },
    });

    // Log deletion activity
    await prisma.documentActivity.create({
      data: {
        documentId: id,
        userId: auth.userId!,
        action: 'DELETE',
        description: `Document "${deletedDocument.title}" was archived/deleted`,
      },
    });

    return NextResponse.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
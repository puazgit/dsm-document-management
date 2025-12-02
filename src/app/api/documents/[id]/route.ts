import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/next-auth';
import { prisma } from '../../../../lib/prisma';
import { z } from 'zod';
import { serializeForResponse } from '../../../../lib/bigint-utils';

// Validation schema for document updates
const DocumentUpdateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title too long').optional(),
  description: z.string().optional(),
  documentTypeId: z.string().cuid('Invalid document type ID').optional(),
  status: z.enum(['DRAFT', 'PENDING_REVIEW', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED', 'REJECTED', 'ARCHIVED', 'EXPIRED']).optional(),
  isPublic: z.boolean().optional(),
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
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // Check access permissions
    const hasAccess = 
      document.isPublic ||
      document.createdById === session.user.id ||
      document.accessGroups.includes(session.user.groupId || '') ||
      document.accessGroups.includes(session.user.role || '') ||
      ['administrator', 'ADMIN', 'admin'].includes(session.user.role);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Increment view count
    await prisma.document.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    // Log view activity
    await prisma.documentActivity.create({
      data: {
        documentId: id,
        userId: session.user.id,
        action: 'VIEW',
        description: `Document "${document.title}" was viewed`,
      },
    });

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
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // Check edit permissions
    const userRole = session.user.role?.toLowerCase();
    const userPermissions = session.user.permissions || [];
    const canEdit = 
      existingDocument.createdById === session.user.id ||
      userPermissions.includes('documents.update') ||
      userPermissions.includes('documents.update.own') ||
      ['admin', 'administrator', 'editor', 'manager', 'org_administrator', 'ppd'].includes(userRole);

    if (!canEdit) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

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
    if (data.isPublic !== undefined && data.isPublic !== existingDocument.isPublic) {
      changes.push(`visibility to ${data.isPublic ? 'public' : 'private'}`);
    }

    // Update document
    const updatedDocument = await prisma.document.update({
      where: { id },
      data: {
        ...data,
        updatedById: session.user.id,
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
        userId: session.user.id,
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
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Check if document exists and user has permission to delete
    const existingDocument = await prisma.document.findUnique({
      where: { id },
    });

    if (!existingDocument) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check delete permissions
    const canDelete = 
      existingDocument.createdById === session.user.id ||
      session.user.role === 'ADMIN';

    if (!canDelete) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Soft delete by setting status to ARCHIVED
    const deletedDocument = await prisma.document.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        updatedById: session.user.id,
      },
    });

    // Log deletion activity
    await prisma.documentActivity.create({
      data: {
        documentId: id,
        userId: session.user.id,
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
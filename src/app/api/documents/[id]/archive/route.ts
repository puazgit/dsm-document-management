import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/next-auth';
import { prisma } from '../../../../../lib/prisma';
import { z } from 'zod';
import { serializeForResponse } from '../../../../../lib/bigint-utils';

// Validation schema for archive
const ArchiveSchema = z.object({
  reason: z.string().optional(),
});

// POST /api/documents/[id]/archive - Archive document
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: documentId } = params;
    const body = await request.json();
    const { reason } = ArchiveSchema.parse(body);

    // Check if user has archive permissions
    const userPermissions = session.user.permissions || [];
    const userRole = session.user.role || '';
    
    const hasArchivePermission = userPermissions.includes('documents.delete') || userPermissions.includes('documents.archive');
    const isAdministrator = userRole === 'administrator';
    const isManagementRole = ['admin', 'manager'].includes(userRole);
    const isOrganizationalLeader = ['dirut', 'gm', 'kadiv', 'administrator', 'ppd'].includes(userRole);
    
    if (!hasArchivePermission && !isAdministrator && !isManagementRole && !isOrganizationalLeader) {
      return NextResponse.json({ 
        error: 'Tidak memiliki permission untuk archive dokumen' 
      }, { status: 403 });
    }

    // Get document
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        documentType: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check if document can be archived
    if (document.status === 'ARCHIVED') {
      return NextResponse.json({ 
        error: 'Document is already archived' 
      }, { status: 400 });
    }

    // Update document status to archived
    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'ARCHIVED',
        updatedById: session.user.id,
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

    // Log archive activity
    await prisma.documentActivity.create({
      data: {
        documentId,
        userId: session.user.id,
        action: 'UPDATE', // Using UPDATE as ARCHIVE is not in enum
        description: `Document "${document.title}" was archived${reason ? ` with reason: ${reason}` : ''}`,
      },
    });

    // Add comment if reason provided
    if (reason) {
      await prisma.comment.create({
        data: {
          documentId,
          userId: session.user.id,
          content: `Archived: ${reason}`,
        },
      });
    }

    // Create notification for document owner if not the same user
    if (document.createdById !== session.user.id) {
      await prisma.notification.create({
        data: {
          userId: document.createdById,
          type: 'SYSTEM_MAINTENANCE', // Using available type as DOCUMENT_ARCHIVED is not in enum
          title: 'Document Archived',
          message: `Your document "${document.title}" has been archived${reason ? ` with reason: ${reason}` : ''}`,
          data: {
            documentId,
            archiverId: session.user.id,
            reason,
          },
        },
      });
    }

    return NextResponse.json(serializeForResponse({
      message: 'Document archived successfully',
      document: updatedDocument,
    }));
  } catch (error) {
    console.error('Error archiving document:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid archive data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/documents/[id]/archive - Unarchive document
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: documentId } = params;

    // Check if user has unarchive permissions
    const userPermissions = session.user.permissions || [];
    const userRole = session.user.role || '';
    
    const hasArchivePermission = userPermissions.includes('documents.delete') || userPermissions.includes('documents.archive');
    const isAdministrator = userRole === 'administrator';
    const isManagementRole = ['admin', 'manager'].includes(userRole);
    const isOrganizationalLeader = ['dirut', 'gm', 'kadiv', 'administrator', 'ppd'].includes(userRole);
    
    if (!hasArchivePermission && !isAdministrator && !isManagementRole && !isOrganizationalLeader) {
      return NextResponse.json({ 
        error: 'Tidak memiliki permission untuk unarchive dokumen' 
      }, { status: 403 });
    }

    // Get document
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (document.status !== 'ARCHIVED') {
      return NextResponse.json({ 
        error: 'Document is not archived' 
      }, { status: 400 });
    }

    // Update document status back to active (or pending review)
    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'PENDING_REVIEW', // Or whatever the default active status should be
        updatedById: session.user.id,
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

    // Log unarchive activity
    await prisma.documentActivity.create({
      data: {
        documentId,
        userId: session.user.id,
        action: 'UPDATE', // Using UPDATE as UNARCHIVE is not in enum
        description: `Document "${document.title}" was unarchived`,
      },
    });

    return NextResponse.json(serializeForResponse({
      message: 'Document unarchived successfully',
      document: updatedDocument,
    }));
  } catch (error) {
    console.error('Error unarchiving document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
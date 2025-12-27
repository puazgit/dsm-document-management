import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/next-auth';
import { prisma } from '../../../../../lib/prisma';
import { z } from 'zod';
import { serializeForResponse } from '../../../../../lib/bigint-utils';
import { canManageDocuments, type CapabilityUser } from '@/lib/capabilities';

// Validation schema for approval
const ApprovalSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']).optional(),
  action: z.enum(['approve', 'reject']).optional(),
  comment: z.string().optional(),
});

// POST /api/documents/[id]/approve - Approve or reject document
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
    const { action, comment } = ApprovalSchema.parse(body);

    // Check if user has approval permissions
    const userPermissions = session.user.permissions || [];
    const userRole = session.user.role || '';
    
    const hasApprovalPermission = userPermissions.includes('documents.approve');
    
    // Check capability-based access
    const capUser: CapabilityUser = { id: session.user.id, email: session.user.email || '', roles: [] };
    const canManage = await canManageDocuments(capUser);
    
    const isManagementRole = ['admin', 'manager'].includes(userRole);
    const isOrganizationalLeader = ['dirut', 'gm', 'kadiv', 'administrator', 'ppd'].includes(userRole);
    
    if (!hasApprovalPermission && !canManage && !isManagementRole && !isOrganizationalLeader) {
      return NextResponse.json({ 
        error: 'Tidak memiliki permission untuk approve/reject dokumen' 
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

    // Check if document requires approval
    if (!document.documentType.requiredApproval) {
      return NextResponse.json({ error: 'Document does not require approval' }, { status: 400 });
    }

    // Check if document is in a state that can be approved/rejected
    if (!['PENDING_APPROVAL', 'PENDING_REVIEW'].includes(document.status)) {
      return NextResponse.json({ 
        error: `Document cannot be ${action}ed in current status: ${document.status}` 
      }, { status: 400 });
    }

    // Determine new status
    const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';
    const approvedAt = action === 'approve' ? new Date() : null;
    const approvedById = action === 'approve' ? session.user.id : null;

    // Update document
    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: {
        status: newStatus,
        approvedAt,
        approvedById,
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
    });

    // Log approval activity
    await prisma.documentActivity.create({
      data: {
        documentId,
        userId: session.user.id,
        action: action === 'approve' ? 'APPROVE' : 'REJECT',
        description: `Document "${document.title}" was ${action}d${comment ? ` with comment: ${comment}` : ''}`,
      },
    });

    // Add comment if provided
    if (comment) {
      await prisma.comment.create({
        data: {
          documentId,
          userId: session.user.id,
          content: `${action === 'approve' ? 'Approved' : 'Rejected'}: ${comment}`,
        },
      });
    }

    // Create notification for document owner
    await prisma.notification.create({
      data: {
        userId: document.createdById,
        type: action === 'approve' ? 'DOCUMENT_APPROVED' : 'DOCUMENT_REJECTED',
        title: `Document ${action}d`,
        message: `Your document "${document.title}" has been ${action}d${comment ? ` with comment: ${comment}` : ''}`,
        data: {
          documentId,
          approverId: session.user.id,
          action,
          comment,
        },
      },
    });

    return NextResponse.json(serializeForResponse({
      message: `Document ${action}d successfully`,
      document: updatedDocument,
    }));
  } catch (error) {
    console.error('Error processing approval:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid approval data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
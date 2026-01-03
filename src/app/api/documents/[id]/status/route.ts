import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/next-auth';
import { prisma } from '../../../../../lib/prisma';
import { requireCapability } from '@/lib/rbac-helpers';
import { z } from 'zod';
import { serializeForResponse } from '../../../../../lib/bigint-utils';
import { 
  DocumentStatus, 
  isTransitionAllowed, 
  getAllowedTransitions,
  WORKFLOW_DESCRIPTIONS 
} from '../../../../../config/document-workflow';
import { trackDocumentStatusChanged } from '../../../../../lib/document-history';
import { hasCapability, getUserCapabilities, type CapabilityUser } from '@/lib/capabilities';

// Validation schema for status change
const StatusChangeSchema = z.object({
  newStatus: z.nativeEnum(DocumentStatus),
  comment: z.string().optional(),
  reason: z.string().optional(),
  fileUpdated: z.boolean().optional(),
});

// POST /api/documents/[id]/status - Change document status
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireCapability(request, 'DOCUMENT_EDIT');
    if (!auth.authorized || !auth.userId) {
      return auth.error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: documentId } = params;
    const body = await request.json();
    const { newStatus, comment, reason, fileUpdated } = StatusChangeSchema.parse(body);

    // Get current document
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

    // Get user permissions and role
    const userRole = session.user.role || '';

    // Get user's roles and capabilities from database
    const currentUser = await prisma.user.findUnique({
      where: { id: auth.userId! },
      include: {
        userRoles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                level: true
              }
            }
          }
        }
      }
    });

    // Get user level from highest role
    const userLevel = currentUser?.userRoles.reduce((maxLevel, ur) => {
      return Math.max(maxLevel, ur.role.level || 0)
    }, 0) || 0

    // Build capability user object for getUserCapabilities
    const capUser: CapabilityUser = {
      id: auth.userId!,
      roles: currentUser?.userRoles.map(ur => ({ name: ur.role.name })) || []
    }

    // Get user capabilities from database
    const userCapabilities = await getUserCapabilities(capUser)
    
    // Map capabilities to permissions for workflow checking
    const effectivePermissions: string[] = []
    
    // If user has ADMIN_ACCESS, grant all permissions
    if (userCapabilities.includes('ADMIN_ACCESS')) {
      effectivePermissions.push('*', 'documents.create', 'documents.read', 'documents.update', 'documents.delete', 'documents.approve', 'documents.publish')
    } else {
      // Map specific capabilities to permissions
      if (userCapabilities.includes('DOCUMENT_VIEW')) effectivePermissions.push('documents.read')
      if (userCapabilities.includes('DOCUMENT_CREATE')) effectivePermissions.push('documents.create')
      if (userCapabilities.includes('DOCUMENT_EDIT')) effectivePermissions.push('documents.update')
      if (userCapabilities.includes('DOCUMENT_DELETE')) effectivePermissions.push('documents.delete')
      if (userCapabilities.includes('DOCUMENT_APPROVE')) effectivePermissions.push('documents.approve')
      if (userCapabilities.includes('DOCUMENT_PUBLISH')) effectivePermissions.push('documents.publish')
    }
    
    console.log('POST Status Change - User:', auth.userId, 'Level:', userLevel, 'Permissions:', effectivePermissions)

    console.log('POST Status Change - User:', auth.userId, 'Level:', userLevel, 'Permissions:', effectivePermissions)

    const currentStatus = document.status as DocumentStatus;
    const isAllowed = await isTransitionAllowed(currentStatus, newStatus, userRole, effectivePermissions, userLevel);

    if (!isAllowed) {
      const allowedTransitions = await getAllowedTransitions(currentStatus, userRole, effectivePermissions, userLevel);
      return NextResponse.json({ 
        error: `Status transition from ${currentStatus} to ${newStatus} is not allowed for your role`,
        allowedTransitions: allowedTransitions.map(t => ({
          to: t.to,
          description: t.description
        }))
      }, { status: 403 });
    }

    // Additional fields based on status
    const updateData: any = {
      status: newStatus,
      updatedById: auth.userId,
      updatedAt: new Date(),
    };

    // Set specific timestamps based on status
    if (newStatus === DocumentStatus.APPROVED) {
      updateData.approvedById = auth.userId;
      updateData.approvedAt = new Date();
    } else if (newStatus === DocumentStatus.PUBLISHED) {
      updateData.publishedAt = new Date();
    }

    // Update document status
    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: updateData,
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

    // Log status change activity
    const activityDescription = comment || reason ? 
      `Document "${document.title}" status changed from ${currentStatus} to ${newStatus}. ${comment || reason}` :
      `Document "${document.title}" status changed from ${currentStatus} to ${newStatus}`;

    await prisma.documentActivity.create({
      data: {
        documentId,
        userId: auth.userId!,
        action: 'UPDATE',
        description: activityDescription,
        metadata: {
          statusChange: {
            from: currentStatus,
            to: newStatus,
            comment: comment || reason,
            timestamp: new Date().toISOString()
          }
        }
      },
    });

    // Track document history
    try {
      let historyReason = comment || reason;
      if (fileUpdated) {
        historyReason = historyReason 
          ? `${historyReason} (file also updated)`
          : 'Status changed with file update';
      }
      
      await trackDocumentStatusChanged(
        documentId,
        auth.userId,
        currentStatus,
        newStatus,
        historyReason
      );
    } catch (historyError) {
      console.error('Error tracking document status change history:', historyError);
      // Continue execution even if history tracking fails
    }

    // Add comment if provided
    if (comment || reason) {
      const commentContent = fileUpdated
        ? `Status changed to ${newStatus} with file update: ${comment || reason}`
        : `Status changed to ${newStatus}: ${comment || reason}`;
        
      await prisma.comment.create({
        data: {
          documentId,
          userId: auth.userId!,
          content: commentContent,
        },
      });
    }

    // Create notifications based on status change
    const notifications: any[] = [];

    // Notify document owner if not the same user
    if (document.createdById !== auth.userId) {
      let notificationType: 'DOCUMENT_APPROVED' | 'DOCUMENT_REJECTED' | 'DOCUMENT_PUBLISHED' | 'SYSTEM_MAINTENANCE' = 'SYSTEM_MAINTENANCE'; // Default
      let title = 'Document Status Changed';
      let message = `Your document "${document.title}" status has been changed to ${newStatus}`;

      if (newStatus === DocumentStatus.APPROVED) {
        notificationType = 'DOCUMENT_APPROVED';
        title = 'Document Approved';
        message = `Your document "${document.title}" has been approved`;
      } else if (newStatus === DocumentStatus.REJECTED) {
        notificationType = 'DOCUMENT_REJECTED'; 
        title = 'Document Rejected';
        message = `Your document "${document.title}" has been rejected`;
      } else if (newStatus === DocumentStatus.PUBLISHED) {
        notificationType = 'DOCUMENT_PUBLISHED';
        title = 'Document Published';
        message = `Your document "${document.title}" has been published`;
      }

      notifications.push({
        userId: document.createdById,
        type: notificationType,
        title,
        message: comment || reason ? `${message}. ${comment || reason}` : message,
        data: {
          documentId,
          statusChange: {
            from: currentStatus,
            to: newStatus
          },
          changedBy: session.user.id,
          comment: comment || reason,
        },
      });
    }

    // Create notifications
    if (notifications.length > 0) {
      await prisma.notification.createMany({
        data: notifications
      });
    }

    return NextResponse.json(serializeForResponse({
      message: `Document status successfully changed to ${newStatus}`,
      document: updatedDocument,
      statusChange: {
        from: currentStatus,
        to: newStatus,
        description: WORKFLOW_DESCRIPTIONS[newStatus]
      }
    }));
  } catch (error) {
    console.error('Error changing document status:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid status change data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/documents/[id]/status - Get document status and allowed transitions
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: documentId } = params;

    // Get document
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        title: true,
        status: true,
        createdById: true,
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Get user's role level from database
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        userRoles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                displayName: true,
                level: true
              }
            }
          }
        }
      }
    });
    
    const highestRole = currentUser?.userRoles?.[0]?.role;
    const userRole = highestRole?.name || session.user.role || '';
    const userLevel = highestRole?.level || 0;
    
    // Get user capabilities from database
    const capUser: CapabilityUser = { 
      id: session.user.id, 
      email: session.user.email || '', 
      roles: currentUser?.userRoles.map(ur => ({
        id: ur.role.id,
        name: ur.role.name
      })) || []
    };
    
    const userCapabilities = await getUserCapabilities(capUser);
    
    // Map capabilities to permissions for workflow checking
    const effectivePermissions: string[] = [];
    
    // Check specific capabilities and add corresponding permissions
    if (userCapabilities.includes('ADMIN_ACCESS')) {
      effectivePermissions.push('*', 'documents.create', 'documents.read', 'documents.update', 'documents.delete', 'documents.approve', 'documents.publish');
    } else {
      if (userCapabilities.includes('DOCUMENT_CREATE')) effectivePermissions.push('documents.create');
      if (userCapabilities.includes('DOCUMENT_VIEW')) effectivePermissions.push('documents.read');
      if (userCapabilities.includes('DOCUMENT_EDIT')) effectivePermissions.push('documents.update');
      if (userCapabilities.includes('DOCUMENT_DELETE')) effectivePermissions.push('documents.delete');
      if (userCapabilities.includes('DOCUMENT_APPROVE')) effectivePermissions.push('documents.approve');
      if (userCapabilities.includes('DOCUMENT_PUBLISH')) effectivePermissions.push('documents.publish');
      
      // Full access capabilities grant all permissions
      if (userCapabilities.includes('DOCUMENT_FULL_ACCESS') || userCapabilities.includes('DOCUMENT_MANAGE')) {
        effectivePermissions.push('documents.create', 'documents.read', 'documents.update', 'documents.delete', 'documents.approve', 'documents.publish');
      }
    }

    const currentStatus = document.status as DocumentStatus;
    const allowedTransitions = await getAllowedTransitions(currentStatus, userRole, effectivePermissions, userLevel);

    // Check if user can modify (document creator or has admin/edit capability)
    const canModify = document.createdById === session.user.id || 
                      userCapabilities.includes('ADMIN_ACCESS') ||
                      userCapabilities.includes('DOCUMENT_EDIT');

    return NextResponse.json(serializeForResponse({
      document: {
        id: document.id,
        title: document.title,
        currentStatus,
        statusDescription: WORKFLOW_DESCRIPTIONS[currentStatus]
      },
      allowedTransitions: allowedTransitions.map(t => ({
        to: t.to,
        description: t.description,
        allowedBy: t.allowedBy
      })),
      userInfo: {
        role: userRole,
        roleName: highestRole?.name,
        roleDisplayName: highestRole?.displayName,
        permissions: effectivePermissions,
        canModify
      }
    }));
  } catch (error) {
    console.error('Error getting document status info:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
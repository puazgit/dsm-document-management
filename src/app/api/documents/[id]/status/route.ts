import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/next-auth';
import { prisma } from '../../../../../lib/prisma';
import { z } from 'zod';
import { serializeForResponse } from '../../../../../lib/bigint-utils';
import { hasCapability, type CapabilityUser } from '@/lib/capabilities';
import { 
  DocumentStatus, 
  isTransitionAllowed, 
  getAllowedTransitions,
  WORKFLOW_DESCRIPTIONS 
} from '../../../../../config/document-workflow';
import { trackDocumentStatusChanged } from '../../../../../lib/document-history';

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

    // Check if transition is allowed
    const userPermissions = session.user.permissions || [];
    const userRole = session.user.role || '';
    
    // Get user's role level from database
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        userRoles: {
          include: {
            role: {
              select: {
                id: true,
                level: true,
                name: true
              }
            }
          }
        }
      }
    });
    
    // Get highest role level
    const userLevel = currentUser?.userRoles.reduce((maxLevel, userRole) => {
      return Math.max(maxLevel, userRole.role.level);
    }, 0) || 0;
    
    // Check capability-based admin access
    const capUser: CapabilityUser = { 
      id: session.user.id, 
      email: session.user.email || '', 
      roles: currentUser?.userRoles.map(ur => ({
        id: ur.role.id,
        name: ur.role.name,
        level: ur.role.level
      })) || []
    };
    const hasAdminCapability = await hasCapability(capUser, 'ADMIN_ACCESS');
    
    const effectivePermissions = hasAdminCapability ? 
      ['*', 'documents.create', 'documents.read', 'documents.update', 'documents.delete', 'documents.approve'] : 
      userPermissions;

    const currentStatus = document.status as DocumentStatus;
    const isAllowed = await isTransitionAllowed(currentStatus, newStatus, userRole, effectivePermissions, userLevel);

    if (!isAllowed) {
      const allowedTransitions = await getAllowedTransitions(currentStatus, userRole, effectivePermissions, userLevel);
      return NextResponse.json({ 
        error: `Status transition from ${currentStatus} to ${newStatus} is not allowed for your role (level ${userLevel})`,
        allowedTransitions: allowedTransitions.map(t => ({
          to: t.to,
          description: t.description,
          minLevel: t.minLevel
        }))
      }, { status: 403 });
    }

    // Additional fields based on status
    const updateData: any = {
      status: newStatus,
      updatedById: session.user.id,
      updatedAt: new Date(),
    };

    // Set specific timestamps based on status
    if (newStatus === DocumentStatus.APPROVED) {
      updateData.approvedById = session.user.id;
      updateData.approvedAt = new Date();
    } else if (newStatus === DocumentStatus.PUBLISHED) {
      updateData.publishedAt = new Date();
      updateData.isPublic = true; // Auto-set to public when published
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
        userId: session.user.id,
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
        session.user.id,
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
          userId: session.user.id,
          content: commentContent,
        },
      });
    }

    // Create notifications based on status change
    const notifications: any[] = [];

    // Notify document owner if not the same user
    if (document.createdById !== session.user.id) {
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

    // Get user permissions and role
    const userPermissions = session.user.permissions || [];
    const userRole = session.user.role || '';
    
    // Get user's role level from database
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        userRoles: {
          include: {
            role: {
              select: {
                id: true,
                level: true,
                name: true,
                displayName: true
              }
            }
          }
        }
      }
    });
    
    // Get highest role level
    const userLevel = currentUser?.userRoles.reduce((maxLevel, userRole) => {
      return Math.max(maxLevel, userRole.role.level);
    }, 0) || 0;
    
    const highestRole = currentUser?.userRoles.find(ur => ur.role.level === userLevel)?.role;
    
    // Check capability-based admin access for GET endpoint
    const capUserGet: CapabilityUser = { 
      id: session.user.id, 
      email: session.user.email || '', 
      roles: currentUser?.userRoles.map(ur => ({
        id: ur.role.id,
        name: ur.role.name,
        level: ur.role.level
      })) || []
    };
    const hasAdminCapabilityGet = await hasCapability(capUserGet, 'ADMIN_ACCESS');
    
    const effectivePermissions = hasAdminCapabilityGet ? 
      ['*', 'documents.create', 'documents.read', 'documents.update', 'documents.delete', 'documents.approve'] : 
      userPermissions;

    const currentStatus = document.status as DocumentStatus;
    const allowedTransitions = await getAllowedTransitions(currentStatus, userRole, effectivePermissions, userLevel);

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
        minLevel: t.minLevel,
        allowedBy: t.allowedBy
      })),
      userInfo: {
        role: userRole,
        level: userLevel,
        roleName: highestRole?.name,
        roleDisplayName: highestRole?.displayName,
        permissions: userPermissions,
        canModify: document.createdById === session.user.id || userLevel >= 70 // Manager+ or document creator
      }
    }));
  } catch (error) {
    console.error('Error getting document status info:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
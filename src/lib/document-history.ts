import { prisma } from './prisma';

export type DocumentHistoryAction = 
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'deleted'
  | 'restored'
  | 'published'
  | 'approved'
  | 'rejected'
  | 'archived'
  | 'file_uploaded'
  | 'file_replaced';

export interface DocumentHistoryData {
  documentId: string;
  action: DocumentHistoryAction;
  fieldChanged?: string;
  oldValue?: any;
  newValue?: any;
  statusFrom?: string;
  statusTo?: string;
  changedById: string;
  changeReason?: string;
  metadata?: any;
}

/**
 * Add a history entry for document changes
 */
export async function addDocumentHistory(data: DocumentHistoryData) {
  try {
    return await prisma.documentHistory.create({
      data: {
        documentId: data.documentId,
        action: data.action,
        fieldChanged: data.fieldChanged,
        oldValue: data.oldValue ? JSON.stringify(data.oldValue) : null,
        newValue: data.newValue ? JSON.stringify(data.newValue) : null,
        statusFrom: data.statusFrom as any,
        statusTo: data.statusTo as any,
        changedById: data.changedById,
        changeReason: data.changeReason,
        metadata: data.metadata || {},
      },
    });
  } catch (error) {
    console.error('Error adding document history:', error);
    throw error;
  }
}

/**
 * Add history entry when document is created
 */
export async function trackDocumentCreated(
  documentId: string, 
  userId: string, 
  documentData: any
) {
  return addDocumentHistory({
    documentId,
    action: 'created',
    newValue: documentData,
    changedById: userId,
    changeReason: 'Document created',
  });
}

/**
 * Add history entry when document is updated
 */
export async function trackDocumentUpdated(
  documentId: string,
  userId: string,
  fieldChanged: string,
  oldValue: any,
  newValue: any,
  reason?: string
) {
  return addDocumentHistory({
    documentId,
    action: 'updated',
    fieldChanged,
    oldValue,
    newValue,
    changedById: userId,
    changeReason: reason || `Updated ${fieldChanged}`,
  });
}

/**
 * Add history entry when document status changes
 */
export async function trackDocumentStatusChanged(
  documentId: string,
  userId: string,
  fromStatus: string,
  toStatus: string,
  reason?: string
) {
  let action: DocumentHistoryAction = 'status_changed';
  
  // Use more specific actions for certain status changes
  if (toStatus === 'PUBLISHED') {
    action = 'published';
  } else if (toStatus === 'APPROVED') {
    action = 'approved';
  } else if (toStatus === 'REJECTED') {
    action = 'rejected';
  } else if (toStatus === 'ARCHIVED') {
    action = 'archived';
  }

  return addDocumentHistory({
    documentId,
    action,
    fieldChanged: 'status',
    statusFrom: fromStatus,
    statusTo: toStatus,
    changedById: userId,
    changeReason: reason || `Status changed from ${fromStatus} to ${toStatus}`,
    metadata: {
      fromStatus,
      toStatus,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Add history entry when document file is uploaded/replaced
 */
export async function trackDocumentFileChanged(
  documentId: string,
  userId: string,
  action: 'file_uploaded' | 'file_replaced',
  fileData: {
    fileName: string;
    fileSize: number;
    mimeType?: string;
  },
  reason?: string
) {
  return addDocumentHistory({
    documentId,
    action,
    fieldChanged: 'file',
    newValue: fileData,
    changedById: userId,
    changeReason: reason || `File ${action.replace('_', ' ')}`,
    metadata: fileData,
  });
}

/**
 * Get formatted history timeline for display
 */
export async function getDocumentHistoryTimeline(documentId: string) {
  const history = await prisma.documentHistory.findMany({
    where: { documentId },
    include: {
      changedBy: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return history.map(entry => {
    const changedByName = entry.changedBy.firstName && entry.changedBy.lastName 
      ? `${entry.changedBy.firstName} ${entry.changedBy.lastName}`
      : entry.changedBy.email;

    return {
      id: entry.id,
      action: entry.action,
      message: generateHistoryMessage(entry),
      changedBy: {
        id: entry.changedBy.id,
        name: changedByName,
        email: entry.changedBy.email,
      },
      timestamp: entry.createdAt,
      details: {
        fieldChanged: entry.fieldChanged,
        oldValue: entry.oldValue ? JSON.parse(entry.oldValue) : null,
        newValue: entry.newValue ? JSON.parse(entry.newValue) : null,
        statusFrom: entry.statusFrom,
        statusTo: entry.statusTo,
        reason: entry.changeReason,
        metadata: entry.metadata,
      },
    };
  });
}

/**
 * Generate human-readable message for history entry
 */
function generateHistoryMessage(entry: any): string {
  const action = entry.action;
  const field = entry.fieldChanged;
  
  switch (action) {
    case 'created':
      return 'Document created';
    case 'published':
      return 'Document published';
    case 'approved':
      return 'Document approved';
    case 'rejected':
      return 'Document rejected';
    case 'archived':
      return 'Document archived';
    case 'file_uploaded':
      return 'File uploaded';
    case 'file_replaced':
      return 'File replaced';
    case 'status_changed':
      return `Status changed from ${entry.statusFrom} to ${entry.statusTo}`;
    case 'updated':
      if (field === 'title') return 'Title updated';
      if (field === 'description') return 'Description updated';
      if (field === 'tags') return 'Tags updated';
      if (field === 'accessGroups') return 'Access permissions updated';
      if (field === 'isPublic') return 'Visibility settings updated';
      return `${field} updated`;
    default:
      return entry.changeReason || `Document ${action}`;
  }
}
/**
 * Document Status Workflow Configuration
 * 
 * Defines the document lifecycle and status transitions based on roles and permissions
 */

export enum DocumentStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW', 
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED',
  EXPIRED = 'EXPIRED'
}

export interface StatusTransition {
  from: DocumentStatus
  to: DocumentStatus
  minLevel: number // Minimum role level required
  requiredPermissions: string[]
  description: string
  allowedBy: string[]
}

/**
 * Document Status Workflow Rules
 * Uses level-based access control instead of hardcoded role names
 * Role Levels: admin=100, manager=70, editor=50, viewer=30, guest=10
 */
export const DOCUMENT_STATUS_WORKFLOW: StatusTransition[] = [
  // 1. DRAFT -> PENDING_REVIEW (Submit for review)
  {
    from: DocumentStatus.DRAFT,
    to: DocumentStatus.PENDING_REVIEW,
    minLevel: 50, // Editor+ can submit for review
    requiredPermissions: ['documents.update'],
    description: 'Submit document for review',
    allowedBy: ['Editor', 'Manager', 'Administrator']
  },

  // 2. PENDING_REVIEW -> PENDING_APPROVAL (Review complete, send for approval)  
  {
    from: DocumentStatus.PENDING_REVIEW,
    to: DocumentStatus.PENDING_APPROVAL,
    minLevel: 70, // Manager+ can forward for approval
    requiredPermissions: ['documents.update'],
    description: 'Review completed, forward for approval',
    allowedBy: ['Manager', 'Administrator']
  },

  // 3. PENDING_REVIEW -> DRAFT (Send back for revision)
  {
    from: DocumentStatus.PENDING_REVIEW,
    to: DocumentStatus.DRAFT,
    minLevel: 70, // Manager+ can send back for revision
    requiredPermissions: ['documents.update'],
    description: 'Send back for revision',
    allowedBy: ['Manager', 'Administrator']
  },

  // 4. PENDING_APPROVAL -> APPROVED (Approve document)
  {
    from: DocumentStatus.PENDING_APPROVAL,
    to: DocumentStatus.APPROVED,
    minLevel: 70, // Manager+ can approve
    requiredPermissions: ['documents.approve'],
    description: 'Approve document',
    allowedBy: ['Manager', 'Administrator']
  },

  // 5. PENDING_APPROVAL -> REJECTED (Reject document)
  {
    from: DocumentStatus.PENDING_APPROVAL,
    to: DocumentStatus.REJECTED,
    minLevel: 70, // Manager+ can reject
    requiredPermissions: ['documents.approve'],
    description: 'Reject document',
    allowedBy: ['Manager', 'Administrator']
  },

  // 6. APPROVED -> PUBLISHED (Publish document)
  {
    from: DocumentStatus.APPROVED,
    to: DocumentStatus.PUBLISHED,
    minLevel: 100, // Only Administrator can publish
    requiredPermissions: ['documents.update'],
    description: 'Publish approved document',
    allowedBy: ['Administrator']
  },

  // 7. REJECTED -> DRAFT (Revision after rejection)
  {
    from: DocumentStatus.REJECTED,
    to: DocumentStatus.DRAFT,
    minLevel: 50, // Editor+ can revise rejected document
    requiredPermissions: ['documents.update'],
    description: 'Return to draft for revision after rejection',
    allowedBy: ['Editor', 'Manager', 'Administrator']
  },

  // 8. Any status -> ARCHIVED (Archive document)
  {
    from: DocumentStatus.DRAFT,
    to: DocumentStatus.ARCHIVED,
    minLevel: 100, // Only Administrator can archive
    requiredPermissions: ['documents.delete'],
    description: 'Archive document',
    allowedBy: ['Administrator']
  },
  {
    from: DocumentStatus.PENDING_REVIEW,
    to: DocumentStatus.ARCHIVED,
    minLevel: 100,
    requiredPermissions: ['documents.delete'],
    description: 'Archive document',
    allowedBy: ['Administrator']
  },
  {
    from: DocumentStatus.PENDING_APPROVAL,
    to: DocumentStatus.ARCHIVED,
    minLevel: 100,
    requiredPermissions: ['documents.delete'],
    description: 'Archive document',
    allowedBy: ['Administrator']
  },
  {
    from: DocumentStatus.APPROVED,
    to: DocumentStatus.ARCHIVED,
    minLevel: 100,
    requiredPermissions: ['documents.delete'],
    description: 'Archive document',
    allowedBy: ['Administrator']
  },
  {
    from: DocumentStatus.PUBLISHED,
    to: DocumentStatus.ARCHIVED,
    minLevel: 100,
    requiredPermissions: ['documents.delete'],
    description: 'Archive document',
    allowedBy: ['Administrator']
  },
  {
    from: DocumentStatus.REJECTED,
    to: DocumentStatus.ARCHIVED,
    minLevel: 100,
    requiredPermissions: ['documents.delete'],
    description: 'Archive document',
    allowedBy: ['Administrator']
  },

  // 9. PUBLISHED -> EXPIRED (System automatic or manual expiration)
  {
    from: DocumentStatus.PUBLISHED,
    to: DocumentStatus.EXPIRED,
    minLevel: 100, // Only Administrator can manually expire
    requiredPermissions: ['documents.update'],
    description: 'Mark document as expired',
    allowedBy: ['System', 'Administrator']
  },

  // 10. ARCHIVED -> Previous status (Unarchive)
  {
    from: DocumentStatus.ARCHIVED,
    to: DocumentStatus.DRAFT,
    minLevel: 100, // Only Administrator can unarchive
    requiredPermissions: ['documents.update'],
    description: 'Unarchive document to draft',
    allowedBy: ['Administrator']
  }
]

/**
 * Get allowed transitions for a document from its current status
 * Now uses level-based access control from database
 * Users with sufficient document permissions can bypass level check
 */
export function getAllowedTransitions(
  currentStatus: DocumentStatus,
  userRole: string,
  userPermissions: string[],
  userLevel?: number // Optional: pass user's role level from database
): StatusTransition[] {
  return DOCUMENT_STATUS_WORKFLOW.filter(transition => {
    if (transition.from !== currentStatus) return false
    
    // Check permission first
    const hasRequiredPermission = transition.requiredPermissions.some(permission => 
      userPermissions.includes(permission) || userPermissions.includes('*')
    )
    
    if (!hasRequiredPermission) return false
    
    // Check if user has comprehensive document permissions (bypass level check)
    const hasFullDocumentAccess = userPermissions.includes('*') || 
      (userPermissions.includes('documents.update') && 
       userPermissions.includes('documents.approve') && 
       userPermissions.includes('documents.delete') &&
       userPermissions.includes('documents.read') &&
       userPermissions.includes('documents.create'));
    
    // If user has full document access, bypass level check
    if (hasFullDocumentAccess) {
      return true
    }
    
    // If userLevel is provided, use it for level-based check
    if (userLevel !== undefined) {
      return userLevel >= transition.minLevel
    }
    
    // Fallback: admin role always has access
    if (userRole === 'administrator' || userRole === 'admin') {
      return true
    }
    
    return false
  })
}

/**
 * Check if a status transition is allowed
 * Now uses level-based access control
 * Users with sufficient document permissions can bypass level check
 */
export function isTransitionAllowed(
  from: DocumentStatus,
  to: DocumentStatus,
  userRole: string,
  userPermissions: string[],
  userLevel?: number // Optional: pass user's role level from database
): boolean {
  const transition = DOCUMENT_STATUS_WORKFLOW.find(t => t.from === from && t.to === to)
  if (!transition) return false
  
  // Check permission
  const hasRequiredPermission = transition.requiredPermissions.some(permission => 
    userPermissions.includes(permission) || userPermissions.includes('*')
  )
  
  if (!hasRequiredPermission) return false
  
  // Check if user has comprehensive document permissions (bypass level check)
  const hasFullDocumentAccess = userPermissions.includes('*') || 
    (userPermissions.includes('documents.update') && 
     userPermissions.includes('documents.approve') && 
     userPermissions.includes('documents.delete') &&
     userPermissions.includes('documents.read') &&
     userPermissions.includes('documents.create'));
  
  // If user has full document access, bypass level check
  if (hasFullDocumentAccess) {
    return true
  }
  
  // If userLevel is provided, use it for level-based check
  if (userLevel !== undefined) {
    return userLevel >= transition.minLevel
  }
  
  // Fallback: admin role always has access
  if (userRole === 'administrator' || userRole === 'admin') {
    return true
  }
  
  return false
}

/**
 * Get workflow description for UI
 */
export const WORKFLOW_DESCRIPTIONS = {
  [DocumentStatus.DRAFT]: 'Document is being created/edited. Ready for review submission.',
  [DocumentStatus.PENDING_REVIEW]: 'Document submitted for review by manager or PPD.',
  [DocumentStatus.PENDING_APPROVAL]: 'Document reviewed and awaiting approval from authorized personnel.',
  [DocumentStatus.APPROVED]: 'Document approved and ready for publication.',
  [DocumentStatus.PUBLISHED]: 'Document is published and accessible to users.',
  [DocumentStatus.REJECTED]: 'Document rejected and needs revision.',
  [DocumentStatus.ARCHIVED]: 'Document archived and no longer active.',
  [DocumentStatus.EXPIRED]: 'Published document has reached expiration date.'
}
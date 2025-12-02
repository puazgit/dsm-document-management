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
  requiredRoles: string[]
  requiredPermissions: string[]
  description: string
  allowedBy: string[]
}

/**
 * Document Status Workflow Rules
 */
export const DOCUMENT_STATUS_WORKFLOW: StatusTransition[] = [
  // 1. DRAFT -> PENDING_REVIEW (Submit for review)
  {
    from: DocumentStatus.DRAFT,
    to: DocumentStatus.PENDING_REVIEW,
    requiredRoles: ['manager', 'kadiv', 'gm', 'dirut', 'ppd', 'administrator'],
    requiredPermissions: ['documents.update'],
    description: 'Submit document for review',
    allowedBy: ['Document creator', 'Manager+']
  },

  // 2. PENDING_REVIEW -> PENDING_APPROVAL (Review complete, send for approval)  
  {
    from: DocumentStatus.PENDING_REVIEW,
    to: DocumentStatus.PENDING_APPROVAL,
    requiredRoles: ['manager', 'kadiv', 'gm', 'dirut', 'ppd', 'administrator'],
    requiredPermissions: ['documents.update'],
    description: 'Review completed, forward for approval',
    allowedBy: ['Manager+', 'PPD']
  },

  // 3. PENDING_REVIEW -> DRAFT (Send back for revision)
  {
    from: DocumentStatus.PENDING_REVIEW,
    to: DocumentStatus.DRAFT,
    requiredRoles: ['manager', 'kadiv', 'gm', 'dirut', 'ppd', 'administrator'],
    requiredPermissions: ['documents.update'],
    description: 'Send back for revision',
    allowedBy: ['Manager+', 'PPD']
  },

  // 4. PENDING_APPROVAL -> APPROVED (Approve document)
  {
    from: DocumentStatus.PENDING_APPROVAL,
    to: DocumentStatus.APPROVED,
    requiredRoles: ['kadiv', 'gm', 'dirut', 'ppd', 'administrator'],
    requiredPermissions: ['documents.approve'],
    description: 'Approve document',
    allowedBy: ['Kadiv+', 'PPD', 'Administrator']
  },

  // 5. PENDING_APPROVAL -> REJECTED (Reject document)
  {
    from: DocumentStatus.PENDING_APPROVAL,
    to: DocumentStatus.REJECTED,
    requiredRoles: ['kadiv', 'gm', 'dirut', 'ppd', 'administrator'],
    requiredPermissions: ['documents.approve'],
    description: 'Reject document',
    allowedBy: ['Kadiv+', 'PPD', 'Administrator']
  },

  // 6. APPROVED -> PUBLISHED (Publish document)
  {
    from: DocumentStatus.APPROVED,
    to: DocumentStatus.PUBLISHED,
    requiredRoles: ['ppd', 'administrator'],
    requiredPermissions: ['documents.update'],
    description: 'Publish approved document',
    allowedBy: ['PPD', 'Administrator']
  },

  // 7. REJECTED -> DRAFT (Revision after rejection)
  {
    from: DocumentStatus.REJECTED,
    to: DocumentStatus.DRAFT,
    requiredRoles: ['manager', 'kadiv', 'gm', 'dirut', 'ppd', 'administrator'],
    requiredPermissions: ['documents.update'],
    description: 'Return to draft for revision after rejection',
    allowedBy: ['Document creator', 'Manager+']
  },

  // 8. Any status -> ARCHIVED (Archive document)
  {
    from: DocumentStatus.DRAFT,
    to: DocumentStatus.ARCHIVED,
    requiredRoles: ['administrator', 'ppd'],
    requiredPermissions: ['documents.delete'],
    description: 'Archive document',
    allowedBy: ['Administrator', 'PPD']
  },
  {
    from: DocumentStatus.PENDING_REVIEW,
    to: DocumentStatus.ARCHIVED,
    requiredRoles: ['administrator', 'ppd'],
    requiredPermissions: ['documents.delete'],
    description: 'Archive document',
    allowedBy: ['Administrator', 'PPD']
  },
  {
    from: DocumentStatus.PENDING_APPROVAL,
    to: DocumentStatus.ARCHIVED,
    requiredRoles: ['administrator', 'ppd'],
    requiredPermissions: ['documents.delete'],
    description: 'Archive document',
    allowedBy: ['Administrator', 'PPD']
  },
  {
    from: DocumentStatus.APPROVED,
    to: DocumentStatus.ARCHIVED,
    requiredRoles: ['administrator', 'ppd'],
    requiredPermissions: ['documents.delete'],
    description: 'Archive document',
    allowedBy: ['Administrator', 'PPD']
  },
  {
    from: DocumentStatus.PUBLISHED,
    to: DocumentStatus.ARCHIVED,
    requiredRoles: ['administrator', 'ppd'],
    requiredPermissions: ['documents.delete'],
    description: 'Archive document',
    allowedBy: ['Administrator', 'PPD']
  },
  {
    from: DocumentStatus.REJECTED,
    to: DocumentStatus.ARCHIVED,
    requiredRoles: ['administrator', 'ppd'],
    requiredPermissions: ['documents.delete'],
    description: 'Archive document',
    allowedBy: ['Administrator', 'PPD']
  },

  // 9. PUBLISHED -> EXPIRED (System automatic or manual expiration)
  {
    from: DocumentStatus.PUBLISHED,
    to: DocumentStatus.EXPIRED,
    requiredRoles: ['administrator', 'ppd'],
    requiredPermissions: ['documents.update'],
    description: 'Mark document as expired',
    allowedBy: ['System', 'Administrator', 'PPD']
  },

  // 10. ARCHIVED -> Previous status (Unarchive)
  {
    from: DocumentStatus.ARCHIVED,
    to: DocumentStatus.DRAFT,
    requiredRoles: ['administrator', 'ppd'],
    requiredPermissions: ['documents.update'],
    description: 'Unarchive document to draft',
    allowedBy: ['Administrator', 'PPD']
  }
]

/**
 * Get allowed transitions for a document from its current status
 */
export function getAllowedTransitions(
  currentStatus: DocumentStatus,
  userRole: string,
  userPermissions: string[]
): StatusTransition[] {
  return DOCUMENT_STATUS_WORKFLOW.filter(transition => {
    if (transition.from !== currentStatus) return false
    
    // Normalize user role (handle org_ prefix)
    const normalizedUserRole = userRole.startsWith('org_') ? userRole.replace('org_', '') : userRole
    
    // Check role permission
    const hasRequiredRole = transition.requiredRoles.includes(normalizedUserRole) || 
                           transition.requiredRoles.includes(userRole) || 
                           userRole === 'administrator' || 
                           userRole === 'admin'
    
    // Check specific permission
    const hasRequiredPermission = transition.requiredPermissions.some(permission => 
      userPermissions.includes(permission) || userPermissions.includes('*')
    )
    
    return hasRequiredRole && hasRequiredPermission
  })
}

/**
 * Check if a status transition is allowed
 */
export function isTransitionAllowed(
  from: DocumentStatus,
  to: DocumentStatus,
  userRole: string,
  userPermissions: string[]
): boolean {
  const transition = DOCUMENT_STATUS_WORKFLOW.find(t => t.from === from && t.to === to)
  if (!transition) return false
  
  // Normalize user role (handle org_ prefix)
  const normalizedUserRole = userRole.startsWith('org_') ? userRole.replace('org_', '') : userRole
  
  const hasRequiredRole = transition.requiredRoles.includes(normalizedUserRole) || 
                         transition.requiredRoles.includes(userRole) || 
                         userRole === 'administrator' || 
                         userRole === 'admin'
  const hasRequiredPermission = transition.requiredPermissions.some(permission => 
    userPermissions.includes(permission) || userPermissions.includes('*')
  )
  
  return hasRequiredRole && hasRequiredPermission
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
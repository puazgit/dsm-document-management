/**
 * Document Status Workflow Configuration
 * 
 * Defines the document lifecycle and status transitions based on roles and permissions
 * Now queries database for workflow transitions with in-memory caching
 */

import { hasCapability, type CapabilityUser } from '@/lib/capabilities';
import { prisma } from '@/lib/prisma';

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
 * Workflow transition cache
 * Cache workflow transitions from database for 10 minutes
 */
interface WorkflowTransitionCache {
  transitions: StatusTransition[];
  timestamp: number;
}

let workflowCache: WorkflowTransitionCache | null = null;
const WORKFLOW_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Get workflow transitions from database with caching
 * Falls back to hardcoded config if database query fails
 */
async function getWorkflowTransitionsFromDB(): Promise<StatusTransition[]> {
  // Check cache first
  if (workflowCache && (Date.now() - workflowCache.timestamp) < WORKFLOW_CACHE_TTL) {
    return workflowCache.transitions;
  }

  try {
    // Query database for active workflow transitions
    const dbTransitions = await prisma.workflowTransition.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    });

    // Transform database records to StatusTransition format
    const transitions: StatusTransition[] = dbTransitions.map(t => ({
      from: t.fromStatus as DocumentStatus,
      to: t.toStatus as DocumentStatus,
      minLevel: t.minLevel,
      requiredPermissions: t.requiredPermission ? [t.requiredPermission] : [],
      description: t.description || '',
      allowedBy: t.allowedByLabel ? t.allowedByLabel.split(',').map(s => s.trim()) : []
    }));

    // Update cache
    workflowCache = {
      transitions,
      timestamp: Date.now()
    };

    return transitions;
  } catch (error) {
    console.warn('Failed to load workflow transitions from database, using fallback:', error);
    // Fallback to hardcoded config
    return DOCUMENT_STATUS_WORKFLOW;
  }
}

/**
 * Clear workflow cache
 * Call this after updating workflow transitions in the database
 */
export function clearWorkflowCache(): void {
  workflowCache = null;
}

/**
 * Get allowed transitions for a document from its current status
 * Now queries database for workflow transitions with caching
 * Users with sufficient document permissions can bypass level check
 */
export async function getAllowedTransitions(
  currentStatus: DocumentStatus,
  userRole: string,
  userPermissions: string[],
  userLevel?: number // Optional: pass user's role level from database
): Promise<StatusTransition[]> {
  // Get transitions from database (with caching)
  const allTransitions = await getWorkflowTransitionsFromDB();

  return allTransitions.filter(transition => {
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
    
    // Note: Removed hardcoded admin check - use capabilities instead
    
    return false
  })
}

/**
 * Check if a status transition is allowed
 * Now queries database for workflow transitions with caching
 * Users with sufficient document permissions can bypass level check
 */
export async function isTransitionAllowed(
  from: DocumentStatus,
  to: DocumentStatus,
  userRole: string,
  userPermissions: string[],
  userLevel?: number // Optional: pass user's role level from database
): Promise<boolean> {
  // Get transitions from database (with caching)
  const allTransitions = await getWorkflowTransitionsFromDB();
  
  const transition = allTransitions.find(t => t.from === from && t.to === to)
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
  
  // Note: Removed hardcoded admin check - use capabilities instead
  
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
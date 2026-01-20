/**
 * Document Status Workflow Configuration
 * 
 * Defines the document lifecycle and status transitions based on capabilities
 * Queries database for workflow transitions with in-memory caching
 * Now fully capability-based - no more permission mapping needed
 */

import { hasCapability, getUserCapabilities, type CapabilityUser } from '@/lib/capabilities';
import { prisma } from '@/lib/prisma';

export enum DocumentStatus {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW', 
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
  minLevel: number
  requiredCapabilities: string[] // Changed from requiredPermissions
  description: string
  allowedBy: string[]
}

/**
 * DEPRECATED: Legacy hardcoded workflow rules
 * Kept for fallback only if database query fails
 * System now uses database-driven capability-based transitions
 */
export const DOCUMENT_STATUS_WORKFLOW: StatusTransition[] = [
  // 1. DRAFT -> IN_REVIEW (Submit for review)
  {
    from: DocumentStatus.DRAFT,
    to: DocumentStatus.IN_REVIEW,
    minLevel: 50,
    requiredCapabilities: ['DOCUMENT_EDIT'],
    description: 'Submit document for review',
    allowedBy: ['Editor', 'Manager', 'Administrator']
  },

  // 2. IN_REVIEW -> PENDING_APPROVAL (Review complete, send for approval)  
  {
    from: DocumentStatus.IN_REVIEW,
    to: DocumentStatus.PENDING_APPROVAL,
    minLevel: 70,
    requiredCapabilities: ['DOCUMENT_EDIT'],
    description: 'Review completed, forward for approval',
    allowedBy: ['Manager', 'Administrator']
  },

  // 3. IN_REVIEW -> DRAFT (Send back for revision)
  {
    from: DocumentStatus.IN_REVIEW,
    to: DocumentStatus.DRAFT,
    minLevel: 70,
    requiredCapabilities: ['DOCUMENT_EDIT'],
    description: 'Send back for revision',
    allowedBy: ['Manager', 'Administrator']
  },

  // 4. PENDING_APPROVAL -> APPROVED (Approve document)
  {
    from: DocumentStatus.PENDING_APPROVAL,
    to: DocumentStatus.APPROVED,
    minLevel: 70,
    requiredCapabilities: ['DOCUMENT_APPROVE'],
    description: 'Approve document',
    allowedBy: ['Manager', 'Administrator']
  },

  // 5. PENDING_APPROVAL -> REJECTED (Reject document)
  {
    from: DocumentStatus.PENDING_APPROVAL,
    to: DocumentStatus.REJECTED,
    minLevel: 70,
    requiredCapabilities: ['DOCUMENT_APPROVE'],
    description: 'Reject document',
    allowedBy: ['Manager', 'Administrator']
  },

  // 6. APPROVED -> PUBLISHED (Publish document)
  {
    from: DocumentStatus.APPROVED,
    to: DocumentStatus.PUBLISHED,
    minLevel: 100,
    requiredCapabilities: ['DOCUMENT_PUBLISH'],
    description: 'Publish approved document',
    allowedBy: ['Administrator']
  },

  // 7. REJECTED -> DRAFT (Revision after rejection)
  {
    from: DocumentStatus.REJECTED,
    to: DocumentStatus.DRAFT,
    minLevel: 50,
    requiredCapabilities: ['DOCUMENT_EDIT'],
    description: 'Return to draft for revision after rejection',
    allowedBy: ['Editor', 'Manager', 'Administrator']
  },

  // 8. Any status -> ARCHIVED (Archive document)
  {
    from: DocumentStatus.DRAFT,
    to: DocumentStatus.ARCHIVED,
    minLevel: 100,
    requiredCapabilities: ['DOCUMENT_DELETE'],
    description: 'Archive document',
    allowedBy: ['Administrator']
  },
  {
    from: DocumentStatus.IN_REVIEW,
    to: DocumentStatus.ARCHIVED,
    minLevel: 100,
    requiredCapabilities: ['DOCUMENT_DELETE'],
    description: 'Archive document',
    allowedBy: ['Administrator']
  },
  {
    from: DocumentStatus.PENDING_APPROVAL,
    to: DocumentStatus.ARCHIVED,
    minLevel: 100,
    requiredCapabilities: ['DOCUMENT_DELETE'],
    description: 'Archive document',
    allowedBy: ['Administrator']
  },
  {
    from: DocumentStatus.APPROVED,
    to: DocumentStatus.ARCHIVED,
    minLevel: 100,
    requiredCapabilities: ['DOCUMENT_DELETE'],
    description: 'Archive document',
    allowedBy: ['Administrator']
  },
  {
    from: DocumentStatus.PUBLISHED,
    to: DocumentStatus.ARCHIVED,
    minLevel: 100,
    requiredCapabilities: ['DOCUMENT_DELETE'],
    description: 'Archive document',
    allowedBy: ['Administrator']
  },
  {
    from: DocumentStatus.REJECTED,
    to: DocumentStatus.ARCHIVED,
    minLevel: 100,
    requiredCapabilities: ['DOCUMENT_DELETE'],
    description: 'Archive document',
    allowedBy: ['Administrator']
  },

  // 9. PUBLISHED -> EXPIRED (System automatic or manual expiration)
  {
    from: DocumentStatus.PUBLISHED,
    to: DocumentStatus.EXPIRED,
    minLevel: 100,
    requiredCapabilities: ['DOCUMENT_EDIT'],
    description: 'Mark document as expired',
    allowedBy: ['System', 'Administrator']
  },

  // 10. PUBLISHED -> IN_REVIEW (Start major revision)
  {
    from: DocumentStatus.PUBLISHED,
    to: DocumentStatus.IN_REVIEW,
    minLevel: 90,
    requiredCapabilities: ['DOCUMENT_PUBLISH', 'DOCUMENT_EDIT'],
    description: 'Start document revision (new version)',
    allowedBy: ['PPD', 'Administrator']
  },

  // 11. ARCHIVED -> Previous status (Unarchive)
  {
    from: DocumentStatus.ARCHIVED,
    to: DocumentStatus.DRAFT,
    minLevel: 100,
    requiredCapabilities: ['DOCUMENT_EDIT'],
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
const WORKFLOW_CACHE_TTL = 1 * 60 * 1000; // 1 minute - faster updates for capability changes

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
    // Now using capabilities directly instead of old permissions
    const transitions: StatusTransition[] = dbTransitions.map(t => ({
      from: t.fromStatus as DocumentStatus,
      to: t.toStatus as DocumentStatus,
      minLevel: t.minLevel,
      requiredCapabilities: t.requiredPermission ? [t.requiredPermission] : [],
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
 * Now fully capability-based - checks user capabilities directly
 * 
 * @param currentStatus Current document status
 * @param userCapabilities Array of user's capability names
 * @returns Array of allowed transitions
 */
export async function getAllowedTransitions(
  currentStatus: DocumentStatus,
  userCapabilities: string[]
): Promise<StatusTransition[]> {
  // Get transitions from database (with caching)
  const allTransitions = await getWorkflowTransitionsFromDB();

  return allTransitions.filter(transition => {
    if (transition.from !== currentStatus) return false
    
    // Check if user has any of the required capabilities
    const hasRequiredCapability = transition.requiredCapabilities.some(capability => 
      userCapabilities.includes(capability) || 
      userCapabilities.includes('ADMIN_ACCESS') || 
      userCapabilities.includes('DOCUMENT_MANAGE')
    )
    
    return hasRequiredCapability
  })
}

/**
 * Check if a status transition is allowed
 * Now fully capability-based - checks user capabilities directly
 * 
 * @param from Source status
 * @param to Target status
 * @param userCapabilities Array of user's capability names
 * @returns Whether transition is allowed
 */
export async function isTransitionAllowed(
  from: DocumentStatus,
  to: DocumentStatus,
  userCapabilities: string[]
): Promise<boolean> {
  // Get transitions from database (with caching)
  const allTransitions = await getWorkflowTransitionsFromDB();
  
  const transition = allTransitions.find(t => t.from === from && t.to === to)
  if (!transition) return false
  
  // Check if user has any of the required capabilities
  const hasRequiredCapability = transition.requiredCapabilities.some(capability => 
    userCapabilities.includes(capability) || 
    userCapabilities.includes('ADMIN_ACCESS') || 
    userCapabilities.includes('DOCUMENT_MANAGE')
  )
  
  return hasRequiredCapability
}

/**
 * Get workflow description for UI
 */
export const WORKFLOW_DESCRIPTIONS = {
  [DocumentStatus.DRAFT]: 'Document is being created/edited. Ready for review submission.',
  [DocumentStatus.IN_REVIEW]: 'Document is currently being reviewed by manager or PPD.',
  [DocumentStatus.PENDING_APPROVAL]: 'Document reviewed and awaiting approval from authorized personnel.',
  [DocumentStatus.APPROVED]: 'Document approved and ready for publication.',
  [DocumentStatus.PUBLISHED]: 'Document is published and accessible to users.',
  [DocumentStatus.REJECTED]: 'Document rejected and needs revision.',
  [DocumentStatus.ARCHIVED]: 'Document archived and no longer active.',
  [DocumentStatus.EXPIRED]: 'Published document has reached expiration date.'
}
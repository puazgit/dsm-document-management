/**
 * Document Access Control Utilities
 * 
 * This module provides helper functions for managing document access based on
 * user groups, roles, and document permissions.
 */

import { PrismaClient } from '@prisma/client';
import { hasFullDocumentAccess as checkFullDocAccess, hasCapability, type CapabilityUser } from '@/lib/capabilities';

const prisma = new PrismaClient();

interface User {
  id: string;
  email: string;
  role?: string;
  groupId?: string | null;
  group?: {
    name: string;
  } | null;
}

interface Document {
  id: string;
  status: string;
  accessGroups: string[];
  createdById: string;
}

/**
 * Check if a user can access a document
 * 
 * Rules:
 * 1. Admin can access all documents
 * 2. Users with full document permissions can access all documents
 * 3. Document creator can always access their own documents
 * 4. If accessGroups is empty:
 *    - Public documents follow default role-based rules
 *    - Private documents only accessible by creator (unless higher role)
 * 5. If accessGroups is specified:
 *    - User must be in one of the specified groups
 *    - OR have appropriate role level
 */
export async function canAccessDocument(
  user: User,
  document: Document,
  userPermissions?: string[]
): Promise<boolean> {
  // Rule 1: Check capability-based access (admin or full document access)
  const capUser: CapabilityUser = { id: user.id, email: user.email, roles: [] };
  if (await checkFullDocAccess(capUser)) {
    return true;
  }

  // Rule 2: Users with full document permissions can access all documents
  if (userPermissions) {
    const hasFullDocumentAccess = userPermissions.includes('*') || 
      (userPermissions.includes('documents.update') && 
       userPermissions.includes('documents.approve') && 
       userPermissions.includes('documents.read') &&
       userPermissions.includes('documents.create'));
    
    if (hasFullDocumentAccess) {
      return true;
    }
  }

  // Rule 3: Creator can always access their own documents
  if (document.createdById === user.id) {
    return true;
  }

  // Rule 4: Check accessGroups
  if (document.accessGroups && document.accessGroups.length > 0) {
    // Document has specific group restrictions
    const userGroupName = user.group?.name;
    
    // Check if user's group is in the access list
    if (userGroupName && document.accessGroups.includes(userGroupName)) {
      // User is in allowed group, but still need to check status
      return canAccessByStatus(user, document, userPermissions);
    }
    
    // User not in allowed groups - check if high-level role can override
    // Managers+ can access approved/published documents regardless of group
    const hasManagerAccess = userPermissions?.includes('WORKFLOW_APPROVE') || 
                            userPermissions?.includes('ADMIN_ACCESS');
    if (hasManagerAccess) {
      return ['APPROVED', 'PUBLISHED'].includes(document.status);
    }
    
    // User doesn't have access
    return false;
  }

  // Rule 5: No specific accessGroups - use capability-based access
  // Documents without access restrictions can be viewed based on user capabilities and status
  return canAccessByStatus(user, document, userPermissions);
}

/**
 * Check if user can access document based on status and capabilities
 * Uses capability-based access control
 */
function canAccessByStatus(user: User, document: Document, userPermissions?: string[]): boolean {
  // Check if user has full document access
  const hasFullAccess = userPermissions?.includes('ADMIN_ACCESS') || 
                        userPermissions?.includes('DOCUMENT_FULL_ACCESS');
  
  if (hasFullAccess) {
    return true;
  }

  // Capability checks
  const canEdit = userPermissions?.includes('DOCUMENT_EDIT');
  const canCreate = userPermissions?.includes('DOCUMENT_CREATE');
  const canView = userPermissions?.includes('DOCUMENT_VIEW');
  const canApprove = userPermissions?.includes('WORKFLOW_APPROVE');

  switch (document.status) {
    case 'DRAFT':
    case 'IN_REVIEW':
      // Editors+ can see drafts and pending review
      return !!(canEdit || canCreate || canView);

    case 'PENDING_APPROVAL':
      // Approvers+ can see pending approval
      return !!(canApprove || canEdit || canView);

    case 'APPROVED':
    case 'PUBLISHED':
      // Anyone with view capability can see published documents
      return !!(canView || true); // Published docs are generally accessible

    case 'REJECTED':
      // Editors+ can see rejected documents
      return !!(canEdit || canCreate || canView);

    case 'ARCHIVED':
    case 'EXPIRED':
      // Editors+ can see archived/expired
      return !!(canEdit || canCreate || canView);

    default:
      return false;
  }
}

/**
 * Build Prisma where clause for document access control
 * 
 * This function generates the appropriate Prisma where clause to filter
 * documents based on user permissions, considering:
 * - User's role and group
 * - Document status, visibility, and access groups
 * - Role hierarchy and permissions
 */
export function buildDocumentAccessWhere(user: User, userPermissions?: string[]): any {
  const role = user.role || '';
  const userGroupName = user.group?.name;
  
  // Admin sees everything
  if (role === 'admin' || role === 'administrator' || userGroupName === 'administrator') {
    return {};
  }

  // Users with full document permissions see everything
  if (userPermissions) {
    const hasFullDocumentAccess = userPermissions.includes('*') || 
      (userPermissions.includes('documents.update') && 
       userPermissions.includes('documents.approve') && 
       userPermissions.includes('documents.read') &&
       userPermissions.includes('documents.create'));
    
    if (hasFullDocumentAccess) {
      return {};
    }
  }

  let accessConditions: any[] = [
    // User's own documents
    { createdById: user.id }
  ];

  // Add group-specific access
  if (userGroupName) {
    accessConditions.push({
      AND: [
        { accessGroups: { has: userGroupName } },
        ...getStatusConditionsForRole(role, userPermissions)
      ]
    });
  }

  // Add documents without group restrictions (accessible to all with proper capabilities)
  accessConditions.push({
    AND: [
      { accessGroups: { isEmpty: true } }, // No specific group restrictions
      ...getStatusConditionsForRole(role, userPermissions)
    ]
  });

  return { OR: accessConditions };
}

/**
 * Get status conditions based on capabilities
 * Uses capability-based access control
 */
function getStatusConditionsForRole(role: string, userPermissions?: string[]): any[] {
  // Check capabilities
  const hasFullAccess = userPermissions?.includes('ADMIN_ACCESS') || 
                        userPermissions?.includes('DOCUMENT_FULL_ACCESS');
  const canApprove = userPermissions?.includes('WORKFLOW_APPROVE');
  const canEdit = userPermissions?.includes('DOCUMENT_EDIT');
  const canCreate = userPermissions?.includes('DOCUMENT_CREATE');
  const canView = userPermissions?.includes('DOCUMENT_VIEW');

  // Admin/Full access: All statuses
  if (hasFullAccess) {
    return [
      { status: { in: ['DRAFT', 'IN_REVIEW', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED', 'REJECTED', 'ARCHIVED', 'EXPIRED'] } }
    ];
  }

  // Approvers: Can see up to pending approval and published
  if (canApprove) {
    return [
      { status: { in: ['PENDING_APPROVAL', 'APPROVED', 'PUBLISHED', 'REJECTED'] } }
    ];
  }

  // Editors/Creators: Draft through published, rejected
  if (canEdit || canCreate) {
    return [
      { status: { in: ['DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'REJECTED'] } }
    ];
  }

  // Viewers: Only approved and published
  if (canView) {
    return [
      { status: { in: ['APPROVED', 'PUBLISHED'] } }
    ];
  }

  // Default: Only published
  return [
    { status: 'PUBLISHED' }
  ];
}

/**
 * Get user with group and role information
 * Fetches user roles for capability-based access control
 */
export async function getUserWithGroup(userId: string): Promise<User | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      groupId: true,
      group: {
        select: {
          name: true
        }
      },
      userRoles: {
        where: { isActive: true },
        include: {
          role: {
            select: {
              name: true
            }
          }
        }
      }
    }
  });

  if (!user) return null;

  // Get primary role name
  const primaryRole = user.userRoles?.[0]?.role?.name || user.group?.name || 'user';

  return {
    id: user.id,
    email: user.email,
    role: primaryRole,
    groupId: user.groupId,
    group: user.group
  };
}

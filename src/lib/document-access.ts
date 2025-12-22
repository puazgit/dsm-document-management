/**
 * Document Access Control Utilities
 * 
 * This module provides helper functions for managing document access based on
 * user groups, roles, and document permissions.
 */

import { PrismaClient } from '@prisma/client';

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
  isPublic: boolean;
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
  // Rule 1: Admin can access everything
  if (user.role === 'admin' || user.role === 'org_administrator' || user.group?.name === 'administrator') {
    return true;
  }

  // Rule 2: Users with full document permissions can access all documents
  if (userPermissions) {
    const hasFullDocumentAccess = userPermissions.includes('*') || 
      (userPermissions.includes('documents.update') && 
       userPermissions.includes('documents.approve') && 
       userPermissions.includes('documents.delete') &&
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
    const highLevelRoles = ['org_dirut', 'org_dewas', 'org_ppd', 'org_komite_audit'];
    if (highLevelRoles.includes(user.role || '')) {
      // High-level roles can access if document is approved/published
      return ['APPROVED', 'PUBLISHED'].includes(document.status);
    }
    
    // User doesn't have access
    return false;
  }

  // Rule 5: No specific accessGroups - follow default rules
  if (document.isPublic) {
    // Public document - check status-based access
    return canAccessByStatus(user, document, userPermissions);
  }

  // Private document with no specific groups - only higher roles can access
  const canAccessPrivate = ['editor', 'org_ppd', 'org_kadiv', 'org_gm', 'org_dirut', 'org_dewas'].includes(user.role || '') ||
    (userPermissions && userPermissions.includes('documents.read'));
    
  if (canAccessPrivate) {
    return canAccessByStatus(user, document, userPermissions);
  }

  return false;
}

/**
 * Check if user can access document based on status and role
 */
function canAccessByStatus(user: User, document: Document, userPermissions?: string[]): boolean {
  const role = user.role || '';

  // Check if user has full document permissions (bypass role check)
  if (userPermissions) {
    const hasFullDocumentAccess = userPermissions.includes('*') || 
      (userPermissions.includes('documents.update') && 
       userPermissions.includes('documents.approve') && 
       userPermissions.includes('documents.delete') &&
       userPermissions.includes('documents.read') &&
       userPermissions.includes('documents.create'));
    
    if (hasFullDocumentAccess) {
      return true;
    }
  }

  switch (document.status) {
    case 'DRAFT':
    case 'PENDING_REVIEW':
      // Only creator, editors, and high-level roles can see drafts
      return ['editor', 'org_ppd', 'org_kadiv', 'org_gm', 'org_dirut'].includes(role) ||
        Boolean(userPermissions && userPermissions.includes('documents.read'));

    case 'PENDING_APPROVAL':
      // Approval flow roles can see
      return ['editor', 'org_ppd', 'org_kadiv', 'org_gm', 'org_dirut', 'org_dewas'].includes(role) ||
        Boolean(userPermissions && userPermissions.includes('documents.read'));

    case 'APPROVED':
    case 'PUBLISHED':
      // Most roles can see published documents
      return !['org_guest'].includes(role);

    case 'REJECTED':
      // Only creator and admin roles can see rejected
      return ['editor', 'org_ppd', 'org_dirut'].includes(role) ||
        Boolean(userPermissions && userPermissions.includes('documents.read'));

    case 'ARCHIVED':
    case 'EXPIRED':
      // Higher roles and creator can see archived/expired
      return ['editor', 'org_ppd', 'org_kadiv', 'org_gm', 'org_dirut', 'org_dewas'].includes(role) ||
        Boolean(userPermissions && userPermissions.includes('documents.read'));

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
  if (role === 'admin' || role === 'org_administrator' || userGroupName === 'administrator') {
    return {};
  }

  // Users with full document permissions see everything
  if (userPermissions) {
    const hasFullDocumentAccess = userPermissions.includes('*') || 
      (userPermissions.includes('documents.update') && 
       userPermissions.includes('documents.approve') && 
       userPermissions.includes('documents.delete') &&
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

  // Add public documents access based on role
  accessConditions.push({
    AND: [
      { isPublic: true },
      { accessGroups: { isEmpty: true } }, // No specific group restrictions
      ...getStatusConditionsForRole(role, userPermissions)
    ]
  });

  // Add role-based access for documents without group restrictions
  if (['editor', 'org_ppd', 'org_kadiv', 'org_gm', 'org_dirut', 'org_dewas'].includes(role) ||
      (userPermissions && userPermissions.includes('documents.read'))) {
    accessConditions.push({
      AND: [
        { accessGroups: { isEmpty: true } },
        ...getStatusConditionsForRole(role, userPermissions)
      ]
    });
  }

  return { OR: accessConditions };
}

/**
 * Get status conditions based on role
 */
function getStatusConditionsForRole(role: string, userPermissions?: string[]): any[] {
  // Users with full document permissions can see all statuses
  if (userPermissions) {
    const hasFullDocumentAccess = userPermissions.includes('*') || 
      (userPermissions.includes('documents.update') && 
       userPermissions.includes('documents.approve') && 
       userPermissions.includes('documents.delete') &&
       userPermissions.includes('documents.read') &&
       userPermissions.includes('documents.create'));
    
    if (hasFullDocumentAccess) {
      return [
        { status: { in: ['DRAFT', 'PENDING_REVIEW', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED', 'REJECTED', 'ARCHIVED', 'EXPIRED'] } }
      ];
    }
  }

  switch (role) {
    case 'editor':
    case 'org_ppd':
      return [
        { status: { in: ['DRAFT', 'PENDING_REVIEW', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED', 'REJECTED'] } }
      ];

    case 'org_dirut':
    case 'org_dewas':
      return [
        { status: { in: ['PENDING_APPROVAL', 'APPROVED', 'PUBLISHED'] } }
      ];

    case 'org_kadiv':
    case 'org_gm':
    case 'org_komite_audit':
      return [
        { status: { in: ['APPROVED', 'PUBLISHED'] } }
      ];

    case 'org_manager':
    case 'org_staff':
      return [
        { status: 'PUBLISHED' }
      ];

    case 'viewer':
    case 'org_guest':
      return [
        { status: 'PUBLISHED' },
        { isPublic: true }
      ];

    default:
      return [
        { status: 'PUBLISHED' }
      ];
  }
}

/**
 * Get user with group information
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

  // Get primary role
  const primaryRole = user.userRoles?.[0]?.role?.name || user.group?.name || 'user';

  return {
    id: user.id,
    email: user.email,
    role: primaryRole,
    groupId: user.groupId,
    group: user.group
  };
}

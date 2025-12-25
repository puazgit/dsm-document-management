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
  level?: number;
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
    const userLevel = user.level || 0;
    if (userLevel >= 70) {
      // Level 70+ (Manager+) can access if document is approved/published
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

  // Private document with no specific groups - level 50+ can access
  const userLevel = user.level || 0;
  const canAccessPrivate = userLevel >= 50 ||
    (userPermissions && userPermissions.includes('documents.read'));
    
  if (canAccessPrivate) {
    return canAccessByStatus(user, document, userPermissions);
  }

  return false;
}

/**
 * Check if user can access document based on status and role level
 * Uses level-based access control consistent with workflow system
 * Level hierarchy: admin=100, manager=70-90, editor=50, viewer=10-40
 */
function canAccessByStatus(user: User, document: Document, userPermissions?: string[]): boolean {
  const userLevel = user.level || 0;

  // Check if user has full document permissions (bypass level check)
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

  // Permission-based check as fallback
  const hasReadPermission = userPermissions && userPermissions.includes('documents.read');

  switch (document.status) {
    case 'DRAFT':
    case 'PENDING_REVIEW':
      // Level 50+ (Editor+) can see drafts and pending review
      return userLevel >= 50 || Boolean(hasReadPermission);

    case 'PENDING_APPROVAL':
      // Level 70+ (Manager+) can see pending approval
      return userLevel >= 70 || Boolean(hasReadPermission);

    case 'APPROVED':
    case 'PUBLISHED':
      // Level 10+ (all except guest) can see published documents
      return userLevel >= 10;

    case 'REJECTED':
      // Level 50+ (Editor+) can see rejected documents
      return userLevel >= 50 || Boolean(hasReadPermission);

    case 'ARCHIVED':
    case 'EXPIRED':
      // Level 50+ (Editor+) can see archived/expired
      return userLevel >= 50 || Boolean(hasReadPermission);

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

  const userLevel = user.level || 0;

  // Add group-specific access
  if (userGroupName) {
    accessConditions.push({
      AND: [
        { accessGroups: { has: userGroupName } },
        ...getStatusConditionsForRole(role, userPermissions, userLevel)
      ]
    });
  }

  // Add public documents access based on role level
  accessConditions.push({
    AND: [
      { isPublic: true },
      { accessGroups: { isEmpty: true } }, // No specific group restrictions
      ...getStatusConditionsForRole(role, userPermissions, userLevel)
    ]
  });

  // Add level-based access for documents without group restrictions
  if (userLevel >= 50 || (userPermissions && userPermissions.includes('documents.read'))) {
    accessConditions.push({
      AND: [
        { accessGroups: { isEmpty: true } },
        ...getStatusConditionsForRole(role, userPermissions, userLevel)
      ]
    });
  }

  return { OR: accessConditions };
}

/**
 * Get status conditions based on role level
 * Uses level-based access control for consistency with workflow system
 * Note: This function now requires user object with level, passed through buildDocumentAccessWhere
 */
function getStatusConditionsForRole(role: string, userPermissions?: string[], userLevel?: number): any[] {
  // Users with full document permissions can see all statuses
  if (userPermissions) {
    const hasFullDocumentAccess = userPermissions.includes('*') || 
      (userPermissions.includes('documents.update') && 
       userPermissions.includes('documents.approve') && 
       userPermissions.includes('documents.read') &&
       userPermissions.includes('documents.create'));
    
    if (hasFullDocumentAccess) {
      return [
        { status: { in: ['DRAFT', 'PENDING_REVIEW', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED', 'REJECTED', 'ARCHIVED', 'EXPIRED'] } }
      ];
    }
  }

  const level = userLevel || 0;

  // Level-based access control
  if (level >= 100) {
    // Admin (100+): All statuses
    return [
      { status: { in: ['DRAFT', 'PENDING_REVIEW', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED', 'REJECTED', 'ARCHIVED', 'EXPIRED'] } }
    ];
  } else if (level >= 70) {
    // Manager+ (70-99): All except archived
    return [
      { status: { in: ['DRAFT', 'PENDING_REVIEW', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED', 'REJECTED'] } }
    ];
  } else if (level >= 50) {
    // Editor (50-69): Draft through published, rejected
    return [
      { status: { in: ['DRAFT', 'PENDING_REVIEW', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED', 'REJECTED'] } }
    ];
  } else if (level >= 40) {
    // Higher viewers (40-49): Approved and published
    return [
      { status: { in: ['APPROVED', 'PUBLISHED'] } }
    ];
  } else if (level >= 10) {
    // Regular users (10-39): Only published
    return [
      { status: 'PUBLISHED' }
    ];
  } else {
    // Guest (0-9): Only published and public
    return [
      { status: 'PUBLISHED' },
      { isPublic: true }
    ];
  }
}

/**
 * Get user with group and role level information
 * Fetches highest role level for level-based access control
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
              name: true,
              level: true
            }
          }
        }
      }
    }
  });

  if (!user) return null;

  // Get highest role level from all user roles
  const userLevel = user.userRoles.reduce((maxLevel, userRole) => {
    return Math.max(maxLevel, userRole.role.level);
  }, 0);

  // Get primary role name
  const primaryRole = user.userRoles?.[0]?.role?.name || user.group?.name || 'user';

  return {
    id: user.id,
    email: user.email,
    role: primaryRole,
    level: userLevel,
    groupId: user.groupId,
    group: user.group
  };
}

/**
 * Document Hierarchy Helper Functions
 * 
 * Utilities untuk mengelola hierarki dokumen dan relationships
 */

import { prisma } from './prisma';

/**
 * Build hierarchy path untuk document
 * Format: /parent_id/child_id/grandchild_id
 */
export function buildHierarchyPath(parentPath: string | null, documentId: string): string {
  if (!parentPath) return `/${documentId}`;
  return `${parentPath}/${documentId}`;
}

/**
 * Calculate hierarchy level dari parent
 */
export function calculateHierarchyLevel(parentLevel: number | null): number {
  return parentLevel !== null ? parentLevel + 1 : 0;
}

/**
 * Get document with its full hierarchy tree (children)
 */
export async function getDocumentWithChildren(documentId: string, maxDepth: number = 3) {
  // Build the nested include for children recursively
  function buildNestedInclude(depth: number): any {
    if (depth === 0) return undefined;
    
    return {
      where: { status: { not: 'ARCHIVED' } },
      orderBy: { sortOrder: 'asc' },
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
        childDocuments: buildNestedInclude(depth - 1),
      },
    };
  }

  const childrenInclude = buildNestedInclude(maxDepth);

  return await prisma.document.findUnique({
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
      ...(childrenInclude && { childDocuments: childrenInclude }),
    },
  });
}

/**
 * Get document with its parent hierarchy (breadcrumb)
 */
export async function getDocumentWithParents(documentId: string) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      documentType: true,
      parentDocument: {
        include: {
          parentDocument: {
            include: {
              parentDocument: {
                include: {
                  parentDocument: true, // Max 4 levels up
                },
              },
            },
          },
        },
      },
    },
  });

  if (!document) return null;

  // Build breadcrumb array from bottom to top
  const breadcrumb: any[] = [];
  let current: any = document;
  
  while (current) {
    breadcrumb.unshift({
      id: current.id,
      title: current.title,
      level: current.hierarchyLevel,
    });
    current = current.parentDocument;
  }

  return {
    document,
    breadcrumb,
  };
}

/**
 * Get all root documents (no parent)
 */
export async function getRootDocuments(filters?: {
  documentTypeId?: string;
  status?: string;
  includeChildren?: boolean;
}) {
  const where: any = {
    parentDocumentId: null,
  };

  if (filters?.documentTypeId) {
    where.documentTypeId = filters.documentTypeId;
  }

  if (filters?.status) {
    where.status = filters.status;
  }

  const include: any = {
    documentType: true,
    createdBy: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    },
  };

  if (filters?.includeChildren) {
    include.childDocuments = {
      where: { status: { not: 'ARCHIVED' } },
      orderBy: { sortOrder: 'asc' },
      include: {
        documentType: true,
      },
    };
  }

  return await prisma.document.findMany({
    where,
    include,
    orderBy: [
      { sortOrder: 'asc' },
      { createdAt: 'desc' },
    ],
  });
}

/**
 * Move document to new parent (update hierarchy)
 */
export async function moveDocument(
  documentId: string,
  newParentId: string | null
) {
  // Get new parent info
  let newParent = null;
  if (newParentId) {
    newParent = await prisma.document.findUnique({
      where: { id: newParentId },
      select: {
        id: true,
        hierarchyLevel: true,
        hierarchyPath: true,
      },
    });

    if (!newParent) {
      throw new Error('Parent document not found');
    }

    // Check for circular reference
    if (newParent.hierarchyPath?.includes(documentId)) {
      throw new Error('Cannot move document to its own descendant');
    }
  }

  // Calculate new hierarchy values
  const newLevel = calculateHierarchyLevel(newParent?.hierarchyLevel || null);
  const newPath = buildHierarchyPath(newParent?.hierarchyPath || null, documentId);

  // Update document
  const updated = await prisma.document.update({
    where: { id: documentId },
    data: {
      parentDocumentId: newParentId,
      hierarchyLevel: newLevel,
      hierarchyPath: newPath,
    },
  });

  // Update all descendants' paths and levels
  await updateDescendantsHierarchy(documentId);

  return updated;
}

/**
 * Update hierarchy info for all descendants when parent changes
 */
async function updateDescendantsHierarchy(parentId: string) {
  const parent = await prisma.document.findUnique({
    where: { id: parentId },
    select: {
      hierarchyLevel: true,
      hierarchyPath: true,
    },
  });

  if (!parent) return;

  const children = await prisma.document.findMany({
    where: { parentDocumentId: parentId },
  });

  for (const child of children) {
    const newLevel = calculateHierarchyLevel(parent.hierarchyLevel);
    const newPath = buildHierarchyPath(parent.hierarchyPath, child.id);

    await prisma.document.update({
      where: { id: child.id },
      data: {
        hierarchyLevel: newLevel,
        hierarchyPath: newPath,
      },
    });

    // Recursively update children
    await updateDescendantsHierarchy(child.id);
  }
}

/**
 * Create document relation (reference, supersedes, etc.)
 */
export async function createDocumentRelation(
  parentId: string,
  childId: string,
  relationType: 'PARENT_CHILD' | 'REFERENCE' | 'SUPERSEDES' | 'RELATED' | 'ATTACHMENT',
  metadata?: any
) {
  // Check if relation already exists
  const existing = await prisma.documentRelation.findUnique({
    where: {
      parentId_childId: {
        parentId,
        childId,
      },
    },
  });

  if (existing) {
    throw new Error('Relation already exists');
  }

  return await prisma.documentRelation.create({
    data: {
      parentId,
      childId,
      relationType,
      metadata,
    },
  });
}

/**
 * Get all related documents
 */
export async function getRelatedDocuments(documentId: string) {
  const relations = await prisma.documentRelation.findMany({
    where: {
      OR: [
        { parentId: documentId },
        { childId: documentId },
      ],
    },
    include: {
      parent: {
        select: {
          id: true,
          title: true,
          status: true,
          documentType: { select: { name: true, icon: true } },
        },
      },
      child: {
        select: {
          id: true,
          title: true,
          status: true,
          documentType: { select: { name: true, icon: true } },
        },
      },
    },
  });

  return {
    parents: relations
      .filter((r) => r.childId === documentId)
      .map((r) => ({ ...r.parent, relationType: r.relationType })),
    children: relations
      .filter((r) => r.parentId === documentId)
      .map((r) => ({ ...r.child, relationType: r.relationType })),
  };
}

/**
 * Get document siblings (same parent)
 */
export async function getDocumentSiblings(documentId: string) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { parentDocumentId: true },
  });

  if (!doc?.parentDocumentId) return [];

  return await prisma.document.findMany({
    where: {
      parentDocumentId: doc.parentDocumentId,
      id: { not: documentId },
      status: { not: 'ARCHIVED' },
    },
    select: {
      id: true,
      title: true,
      status: true,
      sortOrder: true,
      documentType: { select: { name: true, icon: true } },
    },
    orderBy: { sortOrder: 'asc' },
  });
}

/**
 * Reorder documents within same parent
 */
export async function reorderDocuments(
  parentId: string | null,
  documentOrders: { id: string; sortOrder: number }[]
) {
  const updates = documentOrders.map(({ id, sortOrder }) =>
    prisma.document.update({
      where: { id },
      data: { sortOrder },
    })
  );

  await prisma.$transaction(updates);
}

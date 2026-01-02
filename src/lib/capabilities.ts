/**
 * Role Capability Utilities
 * Database-driven capability checks to replace hardcoded role name checks
 */

import { prisma } from '@/lib/prisma';

/**
 * User object interface for capability checks
 */
export interface CapabilityUser {
  id: string;
  email?: string | null;
  roles?: Array<{
    id: string;
    name: string;
  }>;
}

/**
 * Capability cache for performance optimization
 * Cache user capabilities for 5 minutes
 */
const capabilityCache = new Map<string, { capabilities: string[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Check if a user has a specific capability
 * 
 * @param user User object with roles
 * @param capabilityName Name of the capability to check (e.g., 'ADMIN_ACCESS', 'DOCUMENT_FULL_ACCESS')
 * @returns Promise<boolean> True if user has the capability
 * 
 * @example
 * ```ts
 * const canManageUsers = await hasCapability(user, 'USER_MANAGE');
 * if (canManageUsers) {
 *   // Allow user management operations
 * }
 * ```
 */
export async function hasCapability(
  user: CapabilityUser | null | undefined,
  capabilityName: string
): Promise<boolean> {
  if (!user?.id) return false;

  const capabilities = await getUserCapabilities(user);
  return capabilities.includes(capabilityName);
}

/**
 * Check if user has any of the specified capabilities
 * 
 * @param user User object with roles
 * @param capabilityNames Array of capability names to check
 * @returns Promise<boolean> True if user has at least one capability
 * 
 * @example
 * ```ts
 * const canManageDocuments = await hasAnyCapability(user, ['DOCUMENT_FULL_ACCESS', 'DOCUMENT_MANAGE']);
 * ```
 */
export async function hasAnyCapability(
  user: CapabilityUser | null | undefined,
  capabilityNames: string[]
): Promise<boolean> {
  if (!user?.id) return false;

  const capabilities = await getUserCapabilities(user);
  return capabilityNames.some(name => capabilities.includes(name));
}

/**
 * Check if user has all of the specified capabilities
 * 
 * @param user User object with roles
 * @param capabilityNames Array of capability names to check
 * @returns Promise<boolean> True if user has all capabilities
 * 
 * @example
 * ```ts
 * const hasFullAdmin = await hasAllCapabilities(user, ['ADMIN_ACCESS', 'SYSTEM_CONFIGURE']);
 * ```
 */
export async function hasAllCapabilities(
  user: CapabilityUser | null | undefined,
  capabilityNames: string[]
): Promise<boolean> {
  if (!user?.id) return false;

  const capabilities = await getUserCapabilities(user);
  return capabilityNames.every(name => capabilities.includes(name));
}

/**
 * Get all capabilities for a user based on their assigned roles
 * Uses caching for performance optimization
 * 
 * @param user User object with roles
 * @returns Promise<string[]> Array of capability names
 * 
 * @example
 * ```ts
 * const capabilities = await getUserCapabilities(user);
 * console.log('User has capabilities:', capabilities);
 * ```
 */
export async function getUserCapabilities(
  user: CapabilityUser | null | undefined
): Promise<string[]> {
  if (!user?.id) return [];

  // Check cache first
  const cached = capabilityCache.get(user.id);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.capabilities;
  }

  // Query database for user's role capabilities
  const userWithCapabilities = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      userRoles: {
        select: {
          role: {
            select: {
              capabilityAssignments: {
                select: {
                  capability: {
                    select: {
                      name: true
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  // Extract unique capability names
  const capabilities = new Set<string>();
  
  if (userWithCapabilities?.userRoles) {
    for (const userRole of userWithCapabilities.userRoles) {
      for (const assignment of userRole.role.capabilityAssignments) {
        capabilities.add(assignment.capability.name);
      }
    }
  }

  const capabilityArray = Array.from(capabilities);

  // Update cache
  capabilityCache.set(user.id, {
    capabilities: capabilityArray,
    timestamp: now
  });

  return capabilityArray;
}

/**
 * Clear capability cache for a specific user or all users
 * Useful after role/capability changes
 * 
 * @param userId Optional user ID to clear specific cache, omit to clear all
 * 
 * @example
 * ```ts
 * // Clear cache for specific user after role change
 * await clearCapabilityCache(userId);
 * 
 * // Clear all caches after system-wide capability changes
 * await clearCapabilityCache();
 * ```
 */
export function clearCapabilityCache(userId?: string): void {
  if (userId) {
    capabilityCache.delete(userId);
  } else {
    capabilityCache.clear();
  }
}

/**
 * Helper function to check if user is admin (has ADMIN_ACCESS capability)
 * Replaces hardcoded role name checks like: user.role === 'admin'
 * 
 * @param user User object with roles
 * @returns Promise<boolean> True if user has admin access
 * 
 * @example
 * ```ts
 * // Before: if (user.role === 'admin')
 * // After: if (await isAdmin(user))
 * ```
 */
export async function isAdmin(user: CapabilityUser | null | undefined): Promise<boolean> {
  return hasCapability(user, 'ADMIN_ACCESS');
}

/**
 * Helper function to check if user has full document access
 * Replaces permission-based checks for document access
 * 
 * @param user User object with roles
 * @returns Promise<boolean> True if user has full document access
 * 
 * @example
 * ```ts
 * if (await hasFullDocumentAccess(user)) {
 *   // User can access all documents
 * }
 * ```
 */
export async function hasFullDocumentAccess(user: CapabilityUser | null | undefined): Promise<boolean> {
  return hasAnyCapability(user, ['ADMIN_ACCESS', 'DOCUMENT_FULL_ACCESS']);
}

/**
 * Helper function to check if user can manage documents
 * Includes approval, workflow management, etc.
 * 
 * @param user User object with roles
 * @returns Promise<boolean> True if user can manage documents
 */
export async function canManageDocuments(user: CapabilityUser | null | undefined): Promise<boolean> {
  return hasAnyCapability(user, ['ADMIN_ACCESS', 'DOCUMENT_MANAGE']);
}

/**
 * Helper function to check if user can manage other users
 * 
 * @param user User object with roles
 * @returns Promise<boolean> True if user can manage users
 */
export async function canManageUsers(user: CapabilityUser | null | undefined): Promise<boolean> {
  return hasAnyCapability(user, ['ADMIN_ACCESS', 'USER_MANAGE']);
}

/**
 * Helper function to check if user can manage roles and permissions
 * 
 * @param user User object with roles
 * @returns Promise<boolean> True if user can manage roles
 */
export async function canManageRoles(user: CapabilityUser | null | undefined): Promise<boolean> {
  return hasAnyCapability(user, ['ADMIN_ACCESS', 'ROLE_MANAGE']);
}

/**
 * Helper function to check if user can configure system settings
 * 
 * @param user User object with roles
 * @returns Promise<boolean> True if user can configure system
 */
export async function canConfigureSystem(user: CapabilityUser | null | undefined): Promise<boolean> {
  return hasAnyCapability(user, ['ADMIN_ACCESS', 'SYSTEM_CONFIGURE']);
}
/**
 * @deprecated LEGACY FILE - This file uses the old Permission-based system
 * 
 * MIGRATION STATUS: DEPRECATED
 * - This file is kept for backward compatibility only
 * - All permission checks should migrate to capability-based system
 * - Use: UnifiedAccessControl.hasCapability() for server-side checks
 * - Use: useCapabilities() hook for client-side checks
 * 
 * DO NOT ADD NEW FUNCTIONALITY TO THIS FILE
 */

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

/**
 * @deprecated Use UserWithCapabilities instead
 */
export interface UserWithPermissions {
  id: string
  email: string
  name: string
  role: string
  permissions: string[]
  isActive: boolean
}

/**
 * Get user with permissions from session
 * @deprecated Use session.user.capabilities instead
 * Legacy function maintained for backward compatibility
 */
export async function getUserWithPermissions(request?: NextRequest): Promise<UserWithPermissions | null> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return null

    // Get user with roles and permissions from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                capabilityAssignments: {
                  include: {
                    capability: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!user) return null

    // Flatten permissions from all user roles
    const permissions = user.userRoles.flatMap(userRole => 
      userRole.role.capabilityAssignments
        .map(ca => ca.capability.name)
    )

    // Remove duplicates
    const uniquePermissions = [...new Set(permissions)]

    return {
      id: user.id,
      email: user.email,
      name: user.firstName + ' ' + user.lastName,
      role: user.userRoles[0]?.role.name || 'user', // Use primary role
      permissions: uniquePermissions,
      isActive: user.isActive
    }
  } catch (error) {
    console.error('Error getting user with permissions:', error)
    return null
  }
}

/**
 * Check if user has specific permission
 * @deprecated Use UnifiedAccessControl.hasCapability() instead
 * Legacy function maintained for backward compatibility
 */
export async function hasPermission(
  permissionToCheck: string, 
  request?: NextRequest
): Promise<boolean> {
  const user = await getUserWithPermissions(request)
  if (!user) return false
  
  return user.permissions.includes(permissionToCheck)
}

/**
 * Check if user has any of the specified permissions
 * @deprecated Use UnifiedAccessControl.hasAnyCapability() instead
 * Legacy function maintained for backward compatibility
 */
export async function hasAnyPermission(
  permissionsToCheck: string[], 
  request?: NextRequest
): Promise<boolean> {
  const user = await getUserWithPermissions(request)
  if (!user) return false
  
  return permissionsToCheck.some(permission => user.permissions.includes(permission))
}

/**
 * Check if user has all of the specified permissions
 */
export async function hasAllPermissions(
  permissionsToCheck: string[], 
  request?: NextRequest
): Promise<boolean> {
  const user = await getUserWithPermissions(request)
  if (!user) return false
  
  return permissionsToCheck.every(permission => user.permissions.includes(permission))
}

/**
 * Check if user has specific role
 */
export async function hasRole(
  roleToCheck: string, 
  request?: NextRequest
): Promise<boolean> {
  const user = await getUserWithPermissions(request)
  if (!user) return false
  
  return user.role === roleToCheck
}

/**
 * Check if user is admin
 */
export async function isAdmin(request?: NextRequest): Promise<boolean> {
  return await hasRole('admin', request) || await hasPermission('admin.access', request)
}

/**
 * Middleware helper to check permissions
 */
export function requirePermission(permission: string) {
  return async (request: NextRequest) => {
    const hasAccess = await hasPermission(permission, request)
    return hasAccess
  }
}

/**
 * Middleware helper to check roles
 */
export function requireRole(role: string) {
  return async (request: NextRequest) => {
    const hasAccess = await hasRole(role, request)
    return hasAccess
  }
}

/**
 * API route helper for permission checking
 * @deprecated Use requireCapability() from rbac-helpers.ts instead
 * Legacy function maintained for backward compatibility
 */
export async function checkApiPermission(
  request: NextRequest,
  requiredPermission: string
): Promise<{ success: boolean; user?: UserWithPermissions; error?: string }> {
  try {
    const user = await getUserWithPermissions(request)
    
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    if (!user.isActive) {
      return { success: false, error: 'Account is disabled' }
    }

    if (!user.permissions.includes(requiredPermission)) {
      return { success: false, error: 'Insufficient permissions' }
    }

    return { success: true, user }
  } catch (error) {
    console.error('Error checking API permission:', error)
    return { success: false, error: 'Internal server error' }
  }
}

/**
 * API route helper for role checking
 */
export async function checkApiRole(
  request: NextRequest,
  requiredRole: string
): Promise<{ success: boolean; user?: UserWithPermissions; error?: string }> {
  try {
    const user = await getUserWithPermissions(request)
    
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    if (!user.isActive) {
      return { success: false, error: 'Account is disabled' }
    }

    if (user.role !== requiredRole) {
      return { success: false, error: 'Insufficient role' }
    }

    return { success: true, user }
  } catch (error) {
    console.error('Error checking API role:', error)
    return { success: false, error: 'Internal server error' }
  }
}
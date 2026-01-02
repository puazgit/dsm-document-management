/**
 * Authorization utilities for API routes and middleware
 * 
 * MIGRATION NOTE: Permission-based functions are deprecated
 * - hasPermission() checks use static role configs (DEPRECATED)
 * - Modern code should use UnifiedAccessControl.hasCapability()
 * - Capability-based system queries database for dynamic permissions
 * 
 * Unified approach using centralized role configuration
 */

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { hasRoleAccess, hasPermission, normalizeRoleName, getRoleConfig } from '@/config/roles'

export interface AuthResult {
  success: boolean
  user?: {
    id: string
    email: string
    role: string
    groupId?: string
    divisiId?: string
    isActive: boolean
  }
  error?: string
  status?: number
}

/**
 * Get current user from session with normalized role
 */
export async function getCurrentUser(request?: NextRequest): Promise<AuthResult> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return { 
        success: false, 
        error: 'Unauthorized - No active session', 
        status: 401 
      }
    }

    const normalizedRole = normalizeRoleName(session.user.role || '')
    
    if (!normalizedRole) {
      return { 
        success: false, 
        error: 'Invalid role configuration', 
        status: 403 
      }
    }

    if (!session.user.isActive) {
      return { 
        success: false, 
        error: 'Account is disabled', 
        status: 403 
      }
    }

    return {
      success: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        role: normalizedRole,
        groupId: session.user.groupId,
        divisiId: session.user.divisiId,
        isActive: session.user.isActive
      }
    }
  } catch (error) {
    console.error('Error getting current user:', error)
    return { 
      success: false, 
      error: 'Internal server error', 
      status: 500 
    }
  }
}

/**
 * Check if user has required role access (hierarchy-based)
 */
export async function checkRoleAccess(
  request: NextRequest, 
  requiredRoles: string[]
): Promise<AuthResult> {
  const userResult = await getCurrentUser(request)
  
  if (!userResult.success || !userResult.user) {
    return userResult
  }

  const hasAccess = hasRoleAccess(userResult.user.role, requiredRoles)
  
  if (!hasAccess) {
    const roleConfig = getRoleConfig(userResult.user.role)
    return {
      success: false,
      error: `Insufficient permissions. Required: [${requiredRoles.join(', ')}], Current: ${userResult.user.role}`,
      status: 403
    }
  }

  return userResult
}

/**
 * Check if user has specific permission
 * @deprecated Use UnifiedAccessControl.hasCapability() instead
 * This function uses static role configuration, not dynamic database capabilities
 */
export async function checkPermissionAccess(
  request: NextRequest,
  permission: string
): Promise<AuthResult> {
  const userResult = await getCurrentUser(request)
  
  if (!userResult.success || !userResult.user) {
    return userResult
  }

  const hasAccess = hasPermission(userResult.user.role, permission)
  
  if (!hasAccess) {
    return {
      success: false,
      error: `Missing permission: ${permission}`,
      status: 403
    }
  }

  return userResult
}

/**
 * API route wrapper for role-based authorization
 */
export function requireRoles(requiredRoles: string[]) {
  return function <T extends any[]>(
    handler: (request: NextRequest, ...args: T) => Promise<Response>
  ) {
    return async (request: NextRequest, ...args: T): Promise<Response> => {
      const authResult = await checkRoleAccess(request, requiredRoles)
      
      if (!authResult.success) {
        return NextResponse.json(
          { error: authResult.error },
          { status: authResult.status || 403 }
        )
      }

      // Add user to request context
      (request as any).user = authResult.user
      
      return handler(request, ...args)
    }
  }
}

/**
 * API route wrapper for permission-based authorization
 * @deprecated Use requireCapability() from rbac-helpers.ts instead
 * This function uses static role configuration, not dynamic database capabilities
 */
export function requirePermission(permission: string) {
  return function <T extends any[]>(
    handler: (request: NextRequest, ...args: T) => Promise<Response>
  ) {
    return async (request: NextRequest, ...args: T): Promise<Response> => {
      const authResult = await checkPermissionAccess(request, permission)
      
      if (!authResult.success) {
        return NextResponse.json(
          { error: authResult.error },
          { status: authResult.status || 403 }
        )
      }

      // Add user to request context
      (request as any).user = authResult.user
      
      return handler(request, ...args)
    }
  }
}

/**
 * Simple role check for conditional logic (non-blocking)
 */
export async function userHasRole(request: NextRequest, requiredRole: string): Promise<boolean> {
  const userResult = await getCurrentUser(request)
  if (!userResult.success || !userResult.user) return false
  
  return hasRoleAccess(userResult.user.role, [requiredRole])
}

/**
 * Simple permission check for conditional logic (non-blocking)
 * @deprecated Use UnifiedAccessControl.hasCapability() instead
 * This function uses static role configuration, not dynamic database capabilities
 */
export async function userHasPermission(request: NextRequest, permission: string): Promise<boolean> {
  const userResult = await getCurrentUser(request)
  if (!userResult.success || !userResult.user) return false
  
  return hasPermission(userResult.user.role, permission)
}

/**
 * Legacy compatibility - maps old role checking patterns to modern names
 */
export const LEGACY_ROLE_MAPPINGS = {
  // Admin patterns - map to modern admin role
  admin: ['admin'],
  administrator: ['admin'], 
  ADMIN: ['admin'],
  ADMINISTRATOR: ['admin'],
  
  // Management patterns - map to modern org_ prefixed roles
  manager: ['manager', 'kadiv', 'gm'],
  MANAGER: ['manager', 'kadiv', 'gm'],
  kadiv: ['kadiv'],
  KADIV: ['kadiv'],
  gm: ['gm'],
  GM: ['gm'],
  
  // Document responsibility patterns
  ppd: ['ppd'],
  PPD: ['ppd'],
  
  // Director patterns
  dirut: ['dirut'],
  DIRUT: ['dirut'],
  
  // Audit patterns
  dewas: ['dewas'],
  DEWAS: ['dewas'],
  komite_audit: ['komite_audit'],
  KOMITE_AUDIT: ['komite_audit'],
  
  // Guest patterns
  guest: ['guest'],
  GUEST: ['guest'],
  
  // Viewer patterns
  viewer: ['viewer', 'members'],
  VIEWER: ['viewer', 'members'],
} as const

/**
 * Helper for migrating old hardcoded role checks
 */
export async function checkLegacyRoles(
  request: NextRequest,
  legacyRoles: string[]
): Promise<AuthResult> {
  const mappedRoles = legacyRoles.flatMap(role => 
    LEGACY_ROLE_MAPPINGS[role as keyof typeof LEGACY_ROLE_MAPPINGS] || [role]
  )
  
  return checkRoleAccess(request, mappedRoles)
}
/**
 * RBAC Helper Functions for Full Database-Driven Access Control
 * 
 * Use these helpers in API routes instead of hardcoded role checks
 * All checks are performed against database capabilities
 */

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { UnifiedAccessControl } from '@/lib/unified-access-control'
import { prisma } from '@/lib/prisma'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface AuthResult {
  authorized: boolean
  userId?: string
  error?: NextResponse
  user?: UserWithCapabilities
}

export interface UserWithCapabilities {
  id: string
  email: string
  firstName: string
  lastName: string
  capabilities: string[]
  roles: Array<{
    id: string
    name: string
    displayName: string
  }>
}

// ============================================================================
// CAPABILITY CHECKING FUNCTIONS
// ============================================================================

/**
 * Check if current session user has required capability
 * 
 * @param request - NextRequest object
 * @param capability - Capability ID to check (e.g., 'USER_MANAGE', 'DOCUMENT_DELETE')
 * @returns AuthResult with authorized status and user info or error response
 * 
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const auth = await requireCapability(request, 'USER_MANAGE')
 *   if (!auth.authorized) return auth.error
 *   
 *   // User has capability, proceed with logic
 *   const userId = auth.userId
 * }
 * ```
 */
export async function requireCapability(
  request: NextRequest,
  capability: string
): Promise<AuthResult> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return { 
        authorized: false, 
        error: NextResponse.json(
          { error: 'Unauthorized', details: 'Authentication required' }, 
          { status: 401 }
        ) 
      }
    }

    const hasAccess = await UnifiedAccessControl.hasCapability(
      session.user.id,
      capability
    )

    if (!hasAccess) {
      return {
        authorized: false,
        error: NextResponse.json({ 
          error: 'Insufficient permissions',
          details: `Required capability: ${capability}`
        }, { status: 403 })
      }
    }

    return { 
      authorized: true, 
      userId: session.user.id 
    }
  } catch (error) {
    console.error('requireCapability error:', error)
    return {
      authorized: false,
      error: NextResponse.json(
        { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, 
        { status: 500 }
      )
    }
  }
}

/**
 * Check if user has ANY of the required capabilities (OR logic)
 * 
 * @param request - NextRequest object
 * @param capabilities - Array of capability IDs
 * @returns AuthResult
 * 
 * @example
 * ```typescript
 * // User needs either DOCUMENT_MANAGE or DOCUMENT_APPROVE
 * const auth = await requireAnyCapability(request, ['DOCUMENT_MANAGE', 'DOCUMENT_APPROVE'])
 * ```
 */
export async function requireAnyCapability(
  request: NextRequest,
  capabilities: string[]
): Promise<AuthResult> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return { 
        authorized: false, 
        error: NextResponse.json(
          { error: 'Unauthorized', details: 'Authentication required' }, 
          { status: 401 }
        ) 
      }
    }

    for (const cap of capabilities) {
      const hasAccess = await UnifiedAccessControl.hasCapability(
        session.user.id,
        cap
      )
      if (hasAccess) {
        return { 
          authorized: true, 
          userId: session.user.id 
        }
      }
    }

    return {
      authorized: false,
      error: NextResponse.json({ 
        error: 'Insufficient permissions',
        details: `Required one of: ${capabilities.join(', ')}`
      }, { status: 403 })
    }
  } catch (error) {
    console.error('requireAnyCapability error:', error)
    return {
      authorized: false,
      error: NextResponse.json(
        { error: 'Internal server error' }, 
        { status: 500 }
      )
    }
  }
}

/**
 * Check if user has ALL of the required capabilities (AND logic)
 * 
 * @param request - NextRequest object
 * @param capabilities - Array of capability IDs
 * @returns AuthResult
 * 
 * @example
 * ```typescript
 * // User needs both USER_VIEW and USER_MANAGE
 * const auth = await requireAllCapabilities(request, ['USER_VIEW', 'USER_MANAGE'])
 * ```
 */
export async function requireAllCapabilities(
  request: NextRequest,
  capabilities: string[]
): Promise<AuthResult> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return { 
        authorized: false, 
        error: NextResponse.json(
          { error: 'Unauthorized' }, 
          { status: 401 }
        ) 
      }
    }

    for (const cap of capabilities) {
      const hasAccess = await UnifiedAccessControl.hasCapability(
        session.user.id,
        cap
      )
      if (!hasAccess) {
        return {
          authorized: false,
          error: NextResponse.json({ 
            error: 'Insufficient permissions',
            details: `Missing required capability: ${cap}`
          }, { status: 403 })
        }
      }
    }

    return { 
      authorized: true, 
      userId: session.user.id 
    }
  } catch (error) {
    console.error('requireAllCapabilities error:', error)
    return {
      authorized: false,
      error: NextResponse.json(
        { error: 'Internal server error' }, 
        { status: 500 }
      )
    }
  }
}

// ============================================================================
// USER INFO FUNCTIONS
// ============================================================================

/**
 * Get current user with capabilities loaded
 * 
 * @param request - Optional NextRequest
 * @returns UserWithCapabilities or null
 * 
 * @example
 * ```typescript
 * const user = await getCurrentUserWithCapabilities()
 * if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 * 
 * if (user.capabilities.includes('ADMIN_ACCESS')) {
 *   // User has admin access
 * }
 * ```
 */
export async function getCurrentUserWithCapabilities(
  request?: NextRequest
): Promise<UserWithCapabilities | null> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return null

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        userRoles: {
          where: { isActive: true },
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

    // Flatten capabilities from all roles
    const capabilities = user.userRoles.flatMap(ur =>
      ur.role.capabilityAssignments.map(ca => ca.capability.id)
    )

    // Get unique role info
    const roles = user.userRoles.map(ur => ({
      id: ur.role.id,
      name: ur.role.name,
      displayName: ur.role.displayName
    }))

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      capabilities: Array.from(new Set(capabilities)),
      roles
    }
  } catch (error) {
    console.error('getCurrentUserWithCapabilities error:', error)
    return null
  }
}

/**
 * Check if current user has capability (without throwing error)
 * 
 * @param request - NextRequest
 * @param capability - Capability ID
 * @returns boolean
 * 
 * @example
 * ```typescript
 * const canManage = await hasCapability(request, 'USER_MANAGE')
 * if (canManage) {
 *   // Show management UI
 * }
 * ```
 */
export async function hasCapability(
  request: NextRequest,
  capability: string
): Promise<boolean> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return false

    return await UnifiedAccessControl.hasCapability(
      session.user.id,
      capability
    )
  } catch (error) {
    console.error('hasCapability error:', error)
    return false
  }
}

// ============================================================================
// CONVENIENCE WRAPPERS
// ============================================================================

/**
 * Require admin access (ADMIN_ACCESS capability)
 */
export async function requireAdmin(request: NextRequest): Promise<AuthResult> {
  return requireCapability(request, 'ADMIN_ACCESS')
}

/**
 * Require user management access
 */
export async function requireUserManagement(request: NextRequest): Promise<AuthResult> {
  return requireCapability(request, 'USER_MANAGE')
}

/**
 * Require role management access
 */
export async function requireRoleManagement(request: NextRequest): Promise<AuthResult> {
  return requireCapability(request, 'ROLE_MANAGE')
}

/**
 * Require document management access
 */
export async function requireDocumentManagement(request: NextRequest): Promise<AuthResult> {
  return requireCapability(request, 'DOCUMENT_MANAGE')
}

/**
 * Check if user can view resource (own profile or has admin access)
 * 
 * @param request - NextRequest
 * @param resourceUserId - User ID of the resource being accessed
 * @returns AuthResult
 * 
 * @example
 * ```typescript
 * // User can view their own profile or admin can view any profile
 * const auth = await requireSelfOrCapability(request, params.userId, 'USER_VIEW')
 * if (!auth.authorized) return auth.error
 * ```
 */
export async function requireSelfOrCapability(
  request: NextRequest,
  resourceUserId: string,
  capability: string
): Promise<AuthResult> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return { 
        authorized: false, 
        error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) 
      }
    }

    // Check if accessing own resource
    if (session.user.id === resourceUserId) {
      return { authorized: true, userId: session.user.id }
    }

    // Check if has capability
    const hasAccess = await UnifiedAccessControl.hasCapability(
      session.user.id,
      capability
    )

    if (!hasAccess) {
      return {
        authorized: false,
        error: NextResponse.json({ 
          error: 'Insufficient permissions',
          details: 'You can only access your own resources or need admin permission'
        }, { status: 403 })
      }
    }

    return { authorized: true, userId: session.user.id }
  } catch (error) {
    console.error('requireSelfOrCapability error:', error)
    return {
      authorized: false,
      error: NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}

// ============================================================================
// MIGRATION HELPERS
// ============================================================================

/**
 * ⚠️ DEPRECATED: For migration only
 * Use requireCapability() instead
 * 
 * This maps old role-based checks to new capability-based checks
 */
export async function requireRoleDeprecated(
  request: NextRequest,
  roles: string[]
): Promise<AuthResult> {
  console.warn('⚠️ requireRoleDeprecated is deprecated. Migrate to requireCapability()')
  
  // Map common role combinations to capabilities
  const roleToCapabilityMap: Record<string, string> = {
    'admin,administrator': 'ADMIN_ACCESS',
    'admin,administrator,ppd.pusat': 'ROLE_MANAGE',
    'admin,administrator,ppd.pusat,manager': 'USER_MANAGE',
  }

  const rolesKey = roles.sort().join(',')
  const capability = roleToCapabilityMap[rolesKey]

  if (capability) {
    return requireCapability(request, capability)
  }

  // Fallback to basic admin check
  return requireCapability(request, 'ADMIN_ACCESS')
}

/**
 * Centralized Role/Group Configuration
 * 
 * Note: In this system, "Groups" act as "Roles" for organizational simplicity.
 * - Users belong to Groups (organizational units)
 * - Groups have hierarchical levels and permissions
 * - Session stores group name as "role" for backward compatibility
 */

export interface RoleConfig {
  name: string
  displayName: string
  level: number
  permissions: string[]
  description: string
}

/**
 * Centralized role definitions with hierarchy levels
 * Higher level = more permissions
 */
export const ROLES: Record<string, RoleConfig> = {
  administrator: {
    name: 'administrator',
    displayName: 'Administrator',
    level: 100,
    permissions: ['*'], // All permissions
    description: 'Full system access and administration privileges'
  },
  ppd: {
    name: 'ppd',
    displayName: 'Penanggung Jawab Dokumen',
    level: 90,
    permissions: [
      'users.read', 'users.create', 'users.update',
      'documents.*',
      'analytics.read',
      'roles.read'
    ],
    description: 'Document responsibility and management'
  },
  kadiv: {
    name: 'kadiv',
    displayName: 'Kepala Divisi',
    level: 80,
    permissions: [
      'documents.create', 'documents.read', 'documents.update', 'documents.approve',
      'users.read',
      'analytics.read'
    ],
    description: 'Division head with approval authority'
  },
  gm: {
    name: 'gm',
    displayName: 'General Manager',
    level: 70,
    permissions: [
      'documents.read', 'documents.approve',
      'users.read',
      'analytics.read'
    ],
    description: 'General Manager with high-level access'
  },
  manager: {
    name: 'manager',
    displayName: 'Manager',
    level: 60,
    permissions: [
      'documents.create', 'documents.read', 'documents.update',
      'users.read',
      'analytics.read'
    ],
    description: 'Management level access'
  },
  dirut: {
    name: 'dirut',
    displayName: 'Direktur Utama',
    level: 50,
    permissions: [
      'documents.read', 'documents.approve',
      'users.read'
    ],
    description: 'Director with executive access'
  },
  dewas: {
    name: 'dewas',
    displayName: 'Dewan Pengawas',
    level: 40,
    permissions: [
      'documents.read',
      'users.read'
    ],
    description: 'Board of Supervisors'
  },
  komite_audit: {
    name: 'komite_audit',
    displayName: 'Komite Audit',
    level: 30,
    permissions: [
      'documents.read',
      'users.read'
    ],
    description: 'Audit Committee with review access'
  },
  members: {
    name: 'members',
    displayName: 'Members',
    level: 20,
    permissions: [
      'documents.read'
    ],
    description: 'Regular members with basic access'
  },
  viewer: {
    name: 'viewer',
    displayName: 'Viewer',
    level: 10,
    permissions: [
      'documents.read'
    ],
    description: 'Read-only access to documents'
  }
} as const

/**
 * Role name type for type safety
 */
export type RoleName = keyof typeof ROLES

/**
 * Check if user role has access to required roles (hierarchy-based)
 */
export function hasRoleAccess(userRole: string, requiredRoles: string[]): boolean {
  const userRoleConfig = ROLES[userRole as RoleName]
  if (!userRoleConfig) return false

  // Administrator always has access
  if (userRole === 'administrator') return true

  // Check if user's role level meets any of the required role levels
  return requiredRoles.some(requiredRole => {
    const requiredRoleConfig = ROLES[requiredRole as RoleName]
    if (!requiredRoleConfig) return false
    
    return userRoleConfig.level >= requiredRoleConfig.level
  })
}

/**
 * Check if user role has specific permission
 */
export function hasPermission(userRole: string, permission: string): boolean {
  const roleConfig = ROLES[userRole as RoleName]
  if (!roleConfig) return false

  // Administrator has all permissions
  if (roleConfig.permissions.includes('*')) return true

  // Check exact permission match
  if (roleConfig.permissions.includes(permission)) return true

  // Check wildcard permissions (e.g., 'documents.*' matches 'documents.read')
  return roleConfig.permissions.some(rolePermission => {
    if (rolePermission.endsWith('.*')) {
      const module = rolePermission.replace('.*', '')
      return permission.startsWith(module + '.')
    }
    return false
  })
}

/**
 * Get all available role names
 */
export function getAllRoleNames(): string[] {
  return Object.keys(ROLES)
}

/**
 * Get role configuration by name
 */
export function getRoleConfig(roleName: string): RoleConfig | undefined {
  return ROLES[roleName as RoleName]
}

/**
 * Get roles that have specific permission
 */
export function getRolesWithPermission(permission: string): string[] {
  return Object.entries(ROLES)
    .filter(([_, config]) => hasPermission(config.name, permission))
    .map(([name, _]) => name)
}

/**
 * Normalize role name (handle case variations and aliases)
 */
export function normalizeRoleName(roleName: string): string | null {
  const normalized = roleName.toLowerCase().trim()
  
  // Handle aliases and variations
  const roleAliases: Record<string, string> = {
    'admin': 'administrator',
    'ADMIN': 'administrator',
    'ADMINISTRATOR': 'administrator',
    'administrator': 'administrator',
    'ppd': 'ppd',
    'PPD': 'ppd',
    'manager': 'manager',
    'MANAGER': 'manager',
    'viewer': 'viewer',
    'VIEWER': 'viewer',
    'user': 'members', // fallback
    'USER': 'members'
  }

  const mappedRole = roleAliases[roleName] || normalized
  return ROLES[mappedRole as RoleName] ? mappedRole : null
}
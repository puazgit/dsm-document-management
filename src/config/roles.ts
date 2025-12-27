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
  level: number
  permissions: string[]
  description: string
}

/**
 * Centralized role definitions with hierarchy levels
 * Higher level = more permissions
 */
export const ROLES: Record<string, RoleConfig> = {
  admin: {
    name: 'admin',
    level: 100,
    permissions: ['*'], // All permissions
    description: 'Full system access and administration privileges'
  },
  administrator: {
    name: 'administrator',
    level: 100,
    permissions: ['*'],
    description: 'Full organizational system access'
  },
  'ppd.pusat': {
    name: 'ppd.pusat',
    level: 100,
    permissions: [
      'users.read', 'users.create', 'users.update',
      'documents.*',
      'analytics.read',
      'roles.read'
    ],
    description: 'Central Document Controller - Full access'
  },
  'ppd.unit': {
    name: 'ppd.unit',
    level: 70,
    permissions: [
      'users.*',
      'documents.*',
      'analytics.read'
    ],
    description: 'Unit Document Controller'
  },
  kadiv: {
    name: 'kadiv',
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
    level: 50,
    permissions: [
      'documents.read', 'documents.approve',
      'users.read'
    ],
    description: 'Director with executive access'
  },
  dewas: {
    name: 'dewas',
    level: 40,
    permissions: [
      'documents.read',
      'users.read'
    ],
    description: 'Board of Supervisors'
  },
  komite_audit: {
    name: 'komite_audit',
    level: 30,
    permissions: [
      'documents.read',
      'users.read'
    ],
    description: 'Audit Committee with review access'
  },
  staff: {
    name: 'staff',
    level: 25,
    permissions: [
      'documents.read'
    ],
    description: 'Staff with standard access'
  },
  guest: {
    name: 'guest',
    level: 20,
    permissions: [
      'documents.read'
    ],
    description: 'Guest access with limited permissions'
  },
  viewer: {
    name: 'viewer',
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

  // Admin always has access
  if (userRole === 'admin') return true

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
  // Note: This function is deprecated, use capability-based checks instead
  const roleConfig = ROLES[userRole as RoleName]
  if (!roleConfig) return false

  // Admin has all permissions
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
  
  // Handle aliases and variations - map legacy to modern names
  const roleAliases: Record<string, string> = {
    'ADMINISTRATOR': 'administrator',
    'ADMIN': 'admin',
    'PPD': 'ppd',
    'ppd.pusat': 'ppd.pusat',
    'ppd.unit': 'ppd.unit',
    'MANAGER': 'manager',
    'KADIV': 'kadiv',
    'GM': 'gm',
    'DIRUT': 'dirut',
    'DEWAS': 'dewas',
    'KOMITE_AUDIT': 'komite_audit',
    'GUEST': 'guest',
    'STAFF': 'staff',
    'VIEWER': 'viewer',
    'USER': 'staff', // fallback
    // Legacy org_ prefixed names
    'org_administrator': 'administrator',
    'org_ppd': 'ppd',
    'org_kadiv': 'kadiv',
    'org_gm': 'gm',
    'org_manager': 'manager',
    'org_dirut': 'dirut',
    'org_dewas': 'dewas',
    'org_komite_audit': 'komite_audit',
    'org_guest': 'guest'
  }

  const mappedRole = roleAliases[roleName] || normalized
  return ROLES[mappedRole as RoleName] ? mappedRole : null
}
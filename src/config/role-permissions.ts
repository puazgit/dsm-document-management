/**
 * Centralized Role Permission Constants
 * 
 * Gunakan constants ini untuk menghindari hardcoded role checks di berbagai file
 * Single Source of Truth untuk role-based permissions
 */

// ============================================================================
// SYSTEM ROLES
// ============================================================================

/**
 * All valid system roles
 * Sync dengan database dan /src/config/roles.ts
 */
export const SYSTEM_ROLES = {
  ADMIN: 'admin',
  ADMINISTRATOR: 'administrator',
  PPD_PUSAT: 'ppd.pusat',
  PPD_UNIT: 'ppd.unit',
  KADIV: 'kadiv',
  GM: 'gm',
  MANAGER: 'manager',
  DIRUT: 'dirut',
  DEWAS: 'dewas',
  KOMITE_AUDIT: 'komite_audit',
  STAFF: 'staff',
  GUEST: 'guest',
  VIEWER: 'viewer',
  EDITOR: 'editor',
} as const

export type SystemRoleName = typeof SYSTEM_ROLES[keyof typeof SYSTEM_ROLES]

// ============================================================================
// ROLE PERMISSIONS (Permission Actions)
// ============================================================================

/**
 * Mendefinisikan role mana yang bisa melakukan action tertentu
 * Gunakan ini di API routes dan components
 */
export const ROLE_PERMISSIONS = {
  
  // -------------------------
  // USER MANAGEMENT
  // -------------------------
  
  /** Roles yang dapat melihat daftar users */
  CAN_VIEW_USERS: [
    SYSTEM_ROLES.ADMIN,
    SYSTEM_ROLES.ADMINISTRATOR,
    SYSTEM_ROLES.PPD_PUSAT,
    SYSTEM_ROLES.PPD_UNIT,
    SYSTEM_ROLES.MANAGER,
    SYSTEM_ROLES.KADIV,
  ],
  
  /** Roles yang dapat create/edit/delete users */
  CAN_MANAGE_USERS: [
    SYSTEM_ROLES.ADMIN,
    SYSTEM_ROLES.ADMINISTRATOR,
    SYSTEM_ROLES.PPD_PUSAT,
    SYSTEM_ROLES.PPD_UNIT,
  ],
  
  /** Roles yang dapat assign/revoke roles ke users */
  CAN_ASSIGN_ROLES: [
    SYSTEM_ROLES.ADMIN,
    SYSTEM_ROLES.ADMINISTRATOR,
    SYSTEM_ROLES.PPD_PUSAT,
    SYSTEM_ROLES.MANAGER,
    SYSTEM_ROLES.KADIV,
  ],
  
  /** Roles yang dapat assign groups ke users */
  CAN_ASSIGN_GROUPS: [
    SYSTEM_ROLES.ADMIN,
    SYSTEM_ROLES.ADMINISTRATOR,
    SYSTEM_ROLES.PPD_PUSAT,
    SYSTEM_ROLES.MANAGER,
    SYSTEM_ROLES.KADIV,
  ],
  
  // -------------------------
  // ROLE & PERMISSION MANAGEMENT
  // -------------------------
  
  /** Roles yang dapat manage roles (create/edit roles) */
  CAN_MANAGE_ROLES: [
    SYSTEM_ROLES.ADMIN,
    SYSTEM_ROLES.ADMINISTRATOR,
    SYSTEM_ROLES.PPD_PUSAT,
  ],
  
  /** Roles yang dapat manage permissions & capabilities */
  CAN_MANAGE_PERMISSIONS: [
    SYSTEM_ROLES.ADMIN,
    SYSTEM_ROLES.ADMINISTRATOR,
    SYSTEM_ROLES.PPD_PUSAT,
  ],
  
  /** Roles yang dapat assign capabilities ke roles */
  CAN_ASSIGN_CAPABILITIES: [
    SYSTEM_ROLES.ADMIN,
    SYSTEM_ROLES.ADMINISTRATOR,
    SYSTEM_ROLES.PPD_PUSAT,
  ],
  
  // -------------------------
  // DOCUMENT MANAGEMENT
  // -------------------------
  
  /** Roles yang dapat upload/create documents */
  CAN_CREATE_DOCUMENTS: [
    SYSTEM_ROLES.ADMIN,
    SYSTEM_ROLES.ADMINISTRATOR,
    SYSTEM_ROLES.PPD_PUSAT,
    SYSTEM_ROLES.PPD_UNIT,
    SYSTEM_ROLES.KADIV,
    SYSTEM_ROLES.MANAGER,
    SYSTEM_ROLES.EDITOR,
  ],
  
  /** Roles yang dapat edit documents */
  CAN_EDIT_DOCUMENTS: [
    SYSTEM_ROLES.ADMIN,
    SYSTEM_ROLES.ADMINISTRATOR,
    SYSTEM_ROLES.PPD_PUSAT,
    SYSTEM_ROLES.PPD_UNIT,
    SYSTEM_ROLES.KADIV,
    SYSTEM_ROLES.MANAGER,
    SYSTEM_ROLES.EDITOR,
  ],
  
  /** Roles yang dapat delete documents */
  CAN_DELETE_DOCUMENTS: [
    SYSTEM_ROLES.ADMIN,
    SYSTEM_ROLES.ADMINISTRATOR,
    SYSTEM_ROLES.PPD_PUSAT,
  ],
  
  /** Roles yang dapat approve documents */
  CAN_APPROVE_DOCUMENTS: [
    SYSTEM_ROLES.ADMIN,
    SYSTEM_ROLES.ADMINISTRATOR,
    SYSTEM_ROLES.PPD_PUSAT,
    SYSTEM_ROLES.KADIV,
    SYSTEM_ROLES.DIRUT,
    SYSTEM_ROLES.GM,
  ],
  
  /** Roles yang dapat publish documents */
  CAN_PUBLISH_DOCUMENTS: [
    SYSTEM_ROLES.ADMIN,
    SYSTEM_ROLES.ADMINISTRATOR,
    SYSTEM_ROLES.PPD_PUSAT,
  ],
  
  // -------------------------
  // GROUP MANAGEMENT
  // -------------------------
  
  /** Roles yang dapat manage groups (organizational units) */
  CAN_MANAGE_GROUPS: [
    SYSTEM_ROLES.ADMIN,
    SYSTEM_ROLES.ADMINISTRATOR,
    SYSTEM_ROLES.PPD_PUSAT,
    SYSTEM_ROLES.PPD_UNIT,
  ],
  
  /** Roles yang tidak boleh dihapus groupnya (system groups) */
  PROTECTED_GROUPS: [
    'administrator',
    'ppd', // Legacy group (if exists)
  ],
  
  // -------------------------
  // ADMIN MENU ACCESS
  // -------------------------
  
  /** Roles yang dapat mengakses Admin menu */
  CAN_ACCESS_ADMIN: [
    SYSTEM_ROLES.ADMIN,
    SYSTEM_ROLES.ADMINISTRATOR,
    SYSTEM_ROLES.PPD_PUSAT,
    SYSTEM_ROLES.PPD_UNIT,
  ],
  
  /** Roles yang dapat mengakses RBAC Management UI */
  CAN_ACCESS_RBAC_UI: [
    SYSTEM_ROLES.ADMIN,
    SYSTEM_ROLES.ADMINISTRATOR,
    SYSTEM_ROLES.PPD_PUSAT,
  ],
  
  /** Roles yang dapat mengakses Analytics */
  CAN_ACCESS_ANALYTICS: [
    SYSTEM_ROLES.ADMIN,
    SYSTEM_ROLES.ADMINISTRATOR,
    SYSTEM_ROLES.PPD_PUSAT,
    SYSTEM_ROLES.PPD_UNIT,
    SYSTEM_ROLES.MANAGER,
    SYSTEM_ROLES.KADIV,
  ],
  
  /** Roles yang dapat mengakses Audit Logs */
  CAN_ACCESS_AUDIT_LOGS: [
    SYSTEM_ROLES.ADMIN,
    SYSTEM_ROLES.ADMINISTRATOR,
    SYSTEM_ROLES.PPD_PUSAT,
  ],
  
  // -------------------------
  // SYSTEM SETTINGS
  // -------------------------
  
  /** Roles yang dapat manage system settings */
  CAN_MANAGE_SYSTEM_SETTINGS: [
    SYSTEM_ROLES.ADMIN,
    SYSTEM_ROLES.ADMINISTRATOR,
  ],
  
  /** Roles yang dapat manage PDF permissions */
  CAN_MANAGE_PDF_PERMISSIONS: [
    SYSTEM_ROLES.ADMIN,
    SYSTEM_ROLES.ADMINISTRATOR,
    SYSTEM_ROLES.PPD_PUSAT,
  ],
  
} as const

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a role has permission to perform an action
 * 
 * @param roleName - Role name dari user
 * @param permissionKey - Key dari ROLE_PERMISSIONS
 * @returns boolean
 * 
 * @example
 * ```typescript
 * if (hasRolePermission(user.role.name, 'CAN_MANAGE_USERS')) {
 *   // Allow user management
 * }
 * ```
 */
export function hasRolePermission(
  roleName: string, 
  permissionKey: keyof typeof ROLE_PERMISSIONS
): boolean {
  const allowedRoles = ROLE_PERMISSIONS[permissionKey]
  return allowedRoles.includes(roleName as any)
}

/**
 * Check if user has ANY of the required roles
 * 
 * @param userRole - Role name dari user
 * @param requiredRoles - Array of role names yang diperbolehkan
 * @returns boolean
 * 
 * @example
 * ```typescript
 * if (hasAnyRole(user.role.name, ROLE_PERMISSIONS.CAN_MANAGE_USERS)) {
 *   // Allow
 * }
 * ```
 */
export function hasAnyRole(userRole: string, requiredRoles: readonly string[]): boolean {
  return requiredRoles.includes(userRole)
}

/**
 * Check if user with multiple roles has permission
 * 
 * @param userRoles - Array of user's role names
 * @param permissionKey - Key dari ROLE_PERMISSIONS
 * @returns boolean
 * 
 * @example
 * ```typescript
 * const userRoleNames = user.userRoles.map(ur => ur.role.name)
 * if (hasAnyRoleWithPermission(userRoleNames, 'CAN_MANAGE_USERS')) {
 *   // Allow
 * }
 * ```
 */
export function hasAnyRoleWithPermission(
  userRoles: string[],
  permissionKey: keyof typeof ROLE_PERMISSIONS
): boolean {
  const allowedRoles = ROLE_PERMISSIONS[permissionKey]
  return userRoles.some(role => allowedRoles.includes(role as any))
}

/**
 * Get all roles yang punya permission tertentu
 * 
 * @param permissionKey - Key dari ROLE_PERMISSIONS
 * @returns Array of role names
 */
export function getRolesWithPermission(
  permissionKey: keyof typeof ROLE_PERMISSIONS
): readonly string[] {
  return ROLE_PERMISSIONS[permissionKey]
}

// ============================================================================
// PPD ROLE HELPERS
// ============================================================================

/**
 * Check if role adalah PPD role (ppd.pusat atau ppd.unit)
 * 
 * Gunakan ini untuk menggantikan hardcoded check:
 * ❌ ['ppd', 'ppd.pusat', 'ppd.unit'].includes(roleName)
 * ✅ isPpdRole(roleName)
 * 
 * @param roleName - Role name
 * @returns boolean
 */
export function isPpdRole(roleName: string): boolean {
  return roleName === SYSTEM_ROLES.PPD_PUSAT || roleName === SYSTEM_ROLES.PPD_UNIT
}

/**
 * Check if role adalah PPD Pusat
 */
export function isPpdPusat(roleName: string): boolean {
  return roleName === SYSTEM_ROLES.PPD_PUSAT
}

/**
 * Check if role adalah PPD Unit
 */
export function isPpdUnit(roleName: string): boolean {
  return roleName === SYSTEM_ROLES.PPD_UNIT
}

// ============================================================================
// ADMIN ROLE HELPERS
// ============================================================================

/**
 * Check if role adalah admin role (admin atau administrator)
 * 
 * Gunakan ini untuk menggantikan:
 * ❌ ['admin', 'administrator'].includes(roleName)
 * ✅ isAdminRole(roleName)
 */
export function isAdminRole(roleName: string): boolean {
  return roleName === SYSTEM_ROLES.ADMIN || roleName === SYSTEM_ROLES.ADMINISTRATOR
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * Type for permission keys
 */
export type RolePermissionKey = keyof typeof ROLE_PERMISSIONS

/**
 * Type guard untuk check valid role
 */
export function isValidSystemRole(role: string): role is SystemRoleName {
  return Object.values(SYSTEM_ROLES).includes(role as SystemRoleName)
}

// ============================================================================
// MIGRATION NOTES
// ============================================================================

/**
 * CARA MIGRASI DARI HARDCODED KE CENTRALIZED:
 * 
 * SEBELUM:
 * ```typescript
 * const canAssignRoles = user.userRoles.some(ur => 
 *   ['administrator', 'ppd', 'manager', 'kadiv'].includes(ur.role.name)
 * )
 * ```
 * 
 * SESUDAH:
 * ```typescript
 * import { hasAnyRoleWithPermission, ROLE_PERMISSIONS } from '@/config/role-permissions'
 * 
 * const userRoleNames = user.userRoles.map(ur => ur.role.name)
 * const canAssignRoles = hasAnyRoleWithPermission(userRoleNames, 'CAN_ASSIGN_ROLES')
 * ```
 * 
 * ATAU lebih singkat:
 * ```typescript
 * import { hasAnyRole, ROLE_PERMISSIONS } from '@/config/role-permissions'
 * 
 * const canAssignRoles = user.userRoles.some(ur => 
 *   hasAnyRole(ur.role.name, ROLE_PERMISSIONS.CAN_ASSIGN_ROLES)
 * )
 * ```
 */

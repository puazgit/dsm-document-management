import { prisma } from './prisma'

export enum AuditAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PASSWORD_RESET = 'PASSWORD_RESET',
  ASSIGN = 'ASSIGN',
  REVOKE = 'REVOKE',
  ACTIVATE = 'ACTIVATE',
  DEACTIVATE = 'DEACTIVATE',
  PERMISSION_GRANT = 'PERMISSION_GRANT', // @deprecated Use CAPABILITY_GRANT
  PERMISSION_REVOKE = 'PERMISSION_REVOKE', // @deprecated Use CAPABILITY_REVOKE
  CAPABILITY_GRANT = 'CAPABILITY_GRANT', // Modern capability grant
  CAPABILITY_REVOKE = 'CAPABILITY_REVOKE', // Modern capability revoke
}

export enum AuditResource {
  USER = 'USER',
  ROLE = 'ROLE', 
  PERMISSION = 'PERMISSION', // @deprecated Use CAPABILITY
  USER_ROLE = 'USER_ROLE',
  ROLE_PERMISSION = 'ROLE_PERMISSION', // @deprecated Use ROLE_CAPABILITY
  ROLE_CAPABILITY = 'ROLE_CAPABILITY', // Modern capability assignment
  CAPABILITY = 'CAPABILITY', // Modern capability
  PROFILE = 'PROFILE',
  PASSWORD = 'PASSWORD',
  SESSION = 'SESSION',
  GROUP = 'GROUP'
}

interface AuditLogInput {
  action: AuditAction
  resource: AuditResource
  resourceId?: string | null
  actorId?: string | null
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

/**
 * Create an audit log entry
 */
export async function createAuditLog({
  action,
  resource,
  resourceId,
  actorId,
  details,
  ipAddress,
  userAgent,
}: AuditLogInput) {
  try {
    const auditLog = await prisma.auditLog.create({
      data: {
        action,
        resource,
        resourceId: resourceId || '',
        actorId: actorId || '',
        details: details ? JSON.stringify(details) : null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        metadata: details ? JSON.stringify(details) : null,
      },
      include: {
        actor: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    return auditLog
  } catch (error) {
    console.error('Failed to create audit log:', error)
    // Don't throw error to prevent audit logging from breaking main operations
    return null
  }
}

/**
 * Get audit logs with pagination and filtering
 */
export async function getAuditLogs({
  page = 1,
  limit = 50,
  action,
  resource,
  actorId,
  resourceId,
  startDate,
  endDate,
}: {
  page?: number
  limit?: number
  action?: AuditAction
  resource?: AuditResource
  actorId?: string
  resourceId?: string
  startDate?: Date
  endDate?: Date
} = {}) {
  const skip = (page - 1) * limit

  const where: any = {}

  if (action) where.action = action
  if (resource) where.resource = resource
  if (actorId) where.actorId = actorId
  if (resourceId) where.resourceId = resourceId
  
  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) where.createdAt.gte = startDate
    if (endDate) where.createdAt.lte = endDate
  }

  const [auditLogs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      include: {
        actor: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditLog.count({ where }),
  ])

  return {
    logs: auditLogs.map((log: any) => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
    })),
    pagination: {
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    },
  }
}

/**
 * Helper functions for common audit scenarios
 */
export const auditHelpers = {
  // User management
  userCreated: (userId: string, actorId: string, userData: any, ipAddress?: string, userAgent?: string) =>
    createAuditLog({
      action: AuditAction.CREATE,
      resource: AuditResource.USER,
      resourceId: userId,
      actorId,
      details: { 
        username: userData.username,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
      },
      ipAddress,
      userAgent,
    }),

  userUpdated: (userId: string, actorId: string, changes: any, ipAddress?: string, userAgent?: string) =>
    createAuditLog({
      action: AuditAction.UPDATE,
      resource: AuditResource.USER,
      resourceId: userId,
      actorId,
      details: { changes },
      ipAddress,
      userAgent,
    }),

  userDeleted: (userId: string, actorId: string, userData: any, ipAddress?: string, userAgent?: string) =>
    createAuditLog({
      action: AuditAction.DELETE,
      resource: AuditResource.USER,
      resourceId: userId,
      actorId,
      details: { 
        username: userData.username,
        email: userData.email,
      },
      ipAddress,
      userAgent,
    }),

  userActivated: (userId: string, actorId: string, ipAddress?: string, userAgent?: string) =>
    createAuditLog({
      action: AuditAction.ACTIVATE,
      resource: AuditResource.USER,
      resourceId: userId,
      actorId,
      ipAddress,
      userAgent,
    }),

  userDeactivated: (userId: string, actorId: string, ipAddress?: string, userAgent?: string) =>
    createAuditLog({
      action: AuditAction.DEACTIVATE,
      resource: AuditResource.USER,
      resourceId: userId,
      actorId,
      ipAddress,
      userAgent,
    }),

  // Role assignment
  roleAssigned: (userId: string, roleId: string, actorId: string, roleName: string, ipAddress?: string, userAgent?: string) =>
    createAuditLog({
      action: AuditAction.ASSIGN,
      resource: AuditResource.USER_ROLE,
      resourceId: `${userId}-${roleId}`,
      actorId,
      details: { 
        userId,
        roleId,
        roleName,
      },
      ipAddress,
      userAgent,
    }),

  roleRevoked: (userId: string, roleId: string, actorId: string, roleName: string, ipAddress?: string, userAgent?: string) =>
    createAuditLog({
      action: AuditAction.REVOKE,
      resource: AuditResource.USER_ROLE,
      resourceId: `${userId}-${roleId}`,
      actorId,
      details: { 
        userId,
        roleId,
        roleName,
      },
      ipAddress,
      userAgent,
    }),

  // Role management
  roleCreated: (roleId: string, actorId: string, roleData: any, ipAddress?: string, userAgent?: string) =>
    createAuditLog({
      action: AuditAction.CREATE,
      resource: AuditResource.ROLE,
      resourceId: roleId,
      actorId,
      details: { 
        name: roleData.name,
        displayName: roleData.displayName,
        description: roleData.description,
      },
      ipAddress,
      userAgent,
    }),

  roleUpdated: (roleId: string, actorId: string, changes: any, ipAddress?: string, userAgent?: string) =>
    createAuditLog({
      action: AuditAction.UPDATE,
      resource: AuditResource.ROLE,
      resourceId: roleId,
      actorId,
      details: { changes },
      ipAddress,
      userAgent,
    }),

  roleDeleted: (roleId: string, actorId: string, roleData: any, ipAddress?: string, userAgent?: string) =>
    createAuditLog({
      action: AuditAction.DELETE,
      resource: AuditResource.ROLE,
      resourceId: roleId,
      actorId,
      details: { 
        name: roleData.name,
        displayName: roleData.displayName,
      },
      ipAddress,
      userAgent,
    }),

  // Permission management (DEPRECATED - Use capability functions below)
  /**
   * @deprecated Use capabilityGranted() instead
   */
  permissionGranted: (roleId: string, permissionId: string, actorId: string, details: any, ipAddress?: string, userAgent?: string) =>
    createAuditLog({
      action: AuditAction.PERMISSION_GRANT,
      resource: AuditResource.ROLE_PERMISSION,
      resourceId: `${roleId}-${permissionId}`,
      actorId,
      details,
      ipAddress,
      userAgent,
    }),

  /**
   * @deprecated Use capabilityRevoked() instead
   */
  permissionRevoked: (roleId: string, permissionId: string, actorId: string, details: any, ipAddress?: string, userAgent?: string) =>
    createAuditLog({
      action: AuditAction.PERMISSION_REVOKE,
      resource: AuditResource.ROLE_PERMISSION,
      resourceId: `${roleId}-${permissionId}`,
      actorId,
      details,
      ipAddress,
      userAgent,
    }),

  // Capability management (MODERN - Use these for new code)
  capabilityGranted: (roleId: string, capabilityId: string, actorId: string, details: any, ipAddress?: string, userAgent?: string) =>
    createAuditLog({
      action: AuditAction.CAPABILITY_GRANT,
      resource: AuditResource.ROLE_CAPABILITY,
      resourceId: `${roleId}-${capabilityId}`,
      actorId,
      details: {
        ...details,
        capabilityId,
        roleId,
      },
      ipAddress,
      userAgent,
    }),

  capabilityRevoked: (roleId: string, capabilityId: string, actorId: string, details: any, ipAddress?: string, userAgent?: string) =>
    createAuditLog({
      action: AuditAction.CAPABILITY_REVOKE,
      resource: AuditResource.ROLE_CAPABILITY,
      resourceId: `${roleId}-${capabilityId}`,
      actorId,
      details: {
        ...details,
        capabilityId,
        roleId,
      },
      ipAddress,
      userAgent,
    }),

  // Authentication events
  loginAttempt: (userId: string, success: boolean, ipAddress?: string, userAgent?: string) =>
    createAuditLog({
      action: success ? AuditAction.LOGIN : AuditAction.LOGIN_FAILED,
      resource: AuditResource.USER,
      resourceId: userId,
      actorId: userId,
      ipAddress,
      userAgent,
    }),

  loginSuccess: (userId: string, email: string, ipAddress?: string, userAgent?: string) =>
    createAuditLog({
      action: AuditAction.LOGIN,
      resource: AuditResource.USER,
      resourceId: userId,
      actorId: userId,
      details: { email },
      ipAddress,
      userAgent,
    }),

  loginFailed: (userId: string | null, email: string, reason: string, ipAddress?: string, userAgent?: string) =>
    createAuditLog({
      action: AuditAction.LOGIN_FAILED,
      resource: AuditResource.USER,
      resourceId: userId,
      actorId: userId,
      details: { email, reason },
      ipAddress,
      userAgent,
    }),

  userLogout: (userId: string, ipAddress?: string, userAgent?: string) =>
    createAuditLog({
      action: AuditAction.LOGOUT,
      resource: AuditResource.SESSION,
      resourceId: userId,
      actorId: userId,
      ipAddress,
      userAgent,
    }),

  // Profile updates
  profileUpdated: (userId: string, changes: any, ipAddress?: string, userAgent?: string) =>
    createAuditLog({
      action: AuditAction.UPDATE,
      resource: AuditResource.PROFILE,
      resourceId: userId,
      actorId: userId,
      details: { changes },
      ipAddress,
      userAgent,
    }),

  passwordChanged: (userId: string, ipAddress?: string, userAgent?: string) =>
    createAuditLog({
      action: AuditAction.UPDATE,
      resource: AuditResource.PASSWORD,
      resourceId: userId,
      actorId: userId,
      ipAddress,
      userAgent,
    }),

  // Group management
  groupCreated: (groupId: string, actorId: string, groupData: any, ipAddress?: string, userAgent?: string) =>
    createAuditLog({
      action: AuditAction.CREATE,
      resource: AuditResource.GROUP,
      resourceId: groupId,
      actorId,
      details: { 
        name: groupData.name,
        displayName: groupData.displayName,
      },
      ipAddress,
      userAgent,
    }),

  groupUpdated: (groupId: string, actorId: string, changes: any, ipAddress?: string, userAgent?: string) =>
    createAuditLog({
      action: AuditAction.UPDATE,
      resource: AuditResource.GROUP,
      resourceId: groupId,
      actorId,
      details: { changes },
      ipAddress,
      userAgent,
    }),

  groupDeleted: (groupId: string, actorId: string, groupData: any, ipAddress?: string, userAgent?: string) =>
    createAuditLog({
      action: AuditAction.DELETE,
      resource: AuditResource.GROUP,
      resourceId: groupId,
      actorId,
      details: { 
        name: groupData.name,
        displayName: groupData.displayName,
      },
      ipAddress,
      userAgent,
    }),

  groupAssigned: (userId: string, groupId: string, actorId: string, groupName: string, ipAddress?: string, userAgent?: string) =>
    createAuditLog({
      action: AuditAction.ASSIGN,
      resource: AuditResource.GROUP,
      resourceId: userId,
      actorId,
      details: { 
        groupId,
        groupName,
        action: 'user_assigned_to_group',
      },
      ipAddress,
      userAgent,
    }),

  groupRemoved: (userId: string, groupId: string, actorId: string, groupName: string, ipAddress?: string, userAgent?: string) =>
    createAuditLog({
      action: AuditAction.REVOKE,
      resource: AuditResource.GROUP,
      resourceId: userId,
      actorId,
      details: { 
        groupId,
        groupName,
        action: 'user_removed_from_group',
      },
      ipAddress,
      userAgent,
    }),
}
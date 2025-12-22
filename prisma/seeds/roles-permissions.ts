import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedRolesAndPermissions() {
  console.log('🌱 Seeding roles and permissions...')

  // Create default roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      displayName: 'Administrator',
      description: 'Full system access with all permissions',
      level: 100,
      isActive: true,
      isSystem: true,
    },
  })

  const editorRole = await prisma.role.upsert({
    where: { name: 'editor' },
    update: {},
    create: {
      name: 'editor',
      displayName: 'Editor',
      description: 'Can create, edit, and manage documents',
      level: 50,
      isActive: true,
      isSystem: true,
    },
  })

  const viewerRole = await prisma.role.upsert({
    where: { name: 'viewer' },
    update: {},
    create: {
      name: 'viewer',
      displayName: 'Viewer',
      description: 'Can only view documents',
      level: 10,
      isActive: true,
      isSystem: true,
    },
  })

  // Create permissions
  const permissions = [
    // User Management Permissions
    { name: 'users.create', displayName: 'Create Users', module: 'users', action: 'create', resource: 'all' },
    { name: 'users.read', displayName: 'View Users', module: 'users', action: 'read', resource: 'all' },
    { name: 'users.update', displayName: 'Update Users', module: 'users', action: 'update', resource: 'all' },
    { name: 'users.delete', displayName: 'Delete Users', module: 'users', action: 'delete', resource: 'all' },
    { name: 'users.profile', displayName: 'Manage Own Profile', module: 'users', action: 'update', resource: 'own' },

    // Document Management Permissions
    { name: 'documents.create', displayName: 'Create Documents', module: 'documents', action: 'create', resource: 'all' },
    { name: 'documents.read', displayName: 'View Documents', module: 'documents', action: 'read', resource: 'all' },
    { name: 'documents.read.own', displayName: 'View Own Documents', module: 'documents', action: 'read', resource: 'own' },
    { name: 'documents.update', displayName: 'Edit Documents', module: 'documents', action: 'update', resource: 'all' },
    { name: 'documents.update.own', displayName: 'Edit Own Documents', module: 'documents', action: 'update', resource: 'own' },
    { name: 'documents.delete', displayName: 'Delete Documents', module: 'documents', action: 'delete', resource: 'all' },
    { name: 'documents.delete.own', displayName: 'Delete Own Documents', module: 'documents', action: 'delete', resource: 'own' },
    { name: 'documents.approve', displayName: 'Approve Documents', module: 'documents', action: 'approve', resource: 'all' },
    { name: 'documents.upload', displayName: 'Upload Documents', module: 'documents', action: 'upload', resource: 'all' },
    { name: 'documents.download', displayName: 'Download Documents', module: 'documents', action: 'download', resource: 'all' },

    // PDF-Specific Permissions
    { name: 'pdf.view', displayName: 'View PDF Documents', module: 'pdf', action: 'view', resource: 'all' },
    { name: 'pdf.download', displayName: 'Download PDF Documents', module: 'pdf', action: 'download', resource: 'all' },
    { name: 'pdf.print', displayName: 'Print PDF Documents', module: 'pdf', action: 'print', resource: 'all' },
    { name: 'pdf.copy', displayName: 'Copy PDF Content', module: 'pdf', action: 'copy', resource: 'all' },
    { name: 'pdf.watermark', displayName: 'PDF Watermark Control', module: 'pdf', action: 'watermark', resource: 'all' },

    // Document Types Permissions
    { name: 'document-types.create', displayName: 'Create Document Types', module: 'document-types', action: 'create', resource: 'all' },
    { name: 'document-types.read', displayName: 'View Document Types', module: 'document-types', action: 'read', resource: 'all' },
    { name: 'document-types.update', displayName: 'Update Document Types', module: 'document-types', action: 'update', resource: 'all' },
    { name: 'document-types.delete', displayName: 'Delete Document Types', module: 'document-types', action: 'delete', resource: 'all' },

    // Comments Permissions
    { name: 'comments.create', displayName: 'Create Comments', module: 'comments', action: 'create', resource: 'all' },
    { name: 'comments.read', displayName: 'View Comments', module: 'comments', action: 'read', resource: 'all' },
    { name: 'comments.update', displayName: 'Edit Comments', module: 'comments', action: 'update', resource: 'own' },
    { name: 'comments.delete', displayName: 'Delete Comments', module: 'comments', action: 'delete', resource: 'own' },
    { name: 'comments.moderate', displayName: 'Moderate Comments', module: 'comments', action: 'moderate', resource: 'all' },

    // Role Management Permissions
    { name: 'roles.create', displayName: 'Create Roles', module: 'roles', action: 'create', resource: 'all' },
    { name: 'roles.read', displayName: 'View Roles', module: 'roles', action: 'read', resource: 'all' },
    { name: 'roles.update', displayName: 'Update Roles', module: 'roles', action: 'update', resource: 'all' },
    { name: 'roles.delete', displayName: 'Delete Roles', module: 'roles', action: 'delete', resource: 'all' },
    { name: 'roles.assign', displayName: 'Assign Roles', module: 'roles', action: 'assign', resource: 'all' },

    // Audit Permissions
    { name: 'audit.read', displayName: 'View Audit Logs', module: 'audit', action: 'read', resource: 'all' },
    { name: 'audit.export', displayName: 'Export Audit Reports', module: 'audit', action: 'export', resource: 'all' },
    { name: 'audit.analytics', displayName: 'View Audit Analytics', module: 'audit', action: 'analytics', resource: 'all' },

    // System Permissions
    { name: 'system.admin', displayName: 'System Administration', module: 'system', action: 'admin', resource: 'all' },
    { name: 'system.settings', displayName: 'System Settings', module: 'system', action: 'settings', resource: 'all' },
    { name: 'system.logs', displayName: 'View System Logs', module: 'system', action: 'logs', resource: 'all' },
    { name: 'system.analytics', displayName: 'View Analytics', module: 'system', action: 'analytics', resource: 'all' },
  ]

  // Create permissions
  const createdPermissions = []
  for (const perm of permissions) {
    const permission = await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: {
        name: perm.name,
        displayName: perm.displayName,
        description: `Permission to ${perm.action} ${perm.module}`,
        module: perm.module,
        action: perm.action,
        resource: perm.resource,
        isActive: true,
      },
    })
    createdPermissions.push(permission)
  }

  // Assign permissions to roles
  
  // Admin gets all permissions
  for (const permission of createdPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: permission.id,
        isGranted: true,
      },
    })
  }

  // Editor gets document and comment permissions (including PDF download but not print/copy)
  const editorPermissions = createdPermissions.filter(p => 
    p.module === 'documents' || 
    p.module === 'document-types' || 
    p.module === 'comments' ||
    p.name === 'users.profile' ||
    (p.module === 'pdf' && (p.action === 'view' || p.action === 'download'))
  )
  
  for (const permission of editorPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: editorRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: editorRole.id,
        permissionId: permission.id,
        isGranted: true,
      },
    })
  }

  // Viewer gets read-only permissions (PDF view only, no download)
  const viewerPermissions = createdPermissions.filter(p => 
    p.action === 'read' || 
    p.name === 'users.profile' ||
    p.name === 'comments.create' ||
    (p.module === 'pdf' && p.action === 'view')
  )
  
  for (const permission of viewerPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: viewerRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: viewerRole.id,
        permissionId: permission.id,
        isGranted: true,
      },
    })
  }

  console.log('✅ Roles and permissions seeded successfully!')
  console.log(`Created ${createdPermissions.length} permissions`)
  console.log(`Admin role: ${adminRole.id}`)
  console.log(`Editor role: ${editorRole.id}`)
  console.log(`Viewer role: ${viewerRole.id}`)
}
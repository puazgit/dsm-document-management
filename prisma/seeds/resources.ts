import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Resource definitions for unified RBAC system
export const resources = [
  // =====================
  // NAVIGATION RESOURCES
  // =====================
  
  // Dashboard
  {
    id: 'nav-dashboard',
    type: 'navigation',
    path: '/dashboard',
    name: 'Dashboard',
    description: 'Main dashboard',
    requiredCapability: null, // Accessible to all authenticated users
    icon: 'LayoutDashboard',
    sortOrder: 1,
    metadata: { visibleToGuest: true },
  },
  
  // Documents Menu
  {
    id: 'nav-documents',
    type: 'navigation',
    path: '/documents',
    name: 'Documents',
    description: 'Document management',
    requiredCapability: 'DOCUMENT_VIEW',
    icon: 'FileText',
    sortOrder: 2,
  },
  {
    id: 'nav-documents-all',
    type: 'navigation',
    path: '/documents',
    name: 'All Documents',
    description: 'View all documents',
    parentId: 'nav-documents',
    requiredCapability: 'DOCUMENT_VIEW',
    sortOrder: 1,
  },
  {
    id: 'nav-documents-create',
    type: 'navigation',
    path: '/documents/new',
    name: 'Create Document',
    description: 'Create new document',
    parentId: 'nav-documents',
    requiredCapability: 'DOCUMENT_CREATE',
    sortOrder: 2,
  },
  
  // Admin Menu
  {
    id: 'nav-admin',
    type: 'navigation',
    path: '/admin',
    name: 'Admin',
    description: 'System administration',
    requiredCapability: 'ADMIN_ACCESS',
    icon: 'Settings',
    sortOrder: 10,
  },
  {
    id: 'nav-admin-users',
    type: 'navigation',
    path: '/admin/users',
    name: 'User Management',
    description: 'Manage users',
    parentId: 'nav-admin',
    requiredCapability: 'USER_MANAGE',
    sortOrder: 1,
  },
  {
    id: 'nav-admin-roles',
    type: 'navigation',
    path: '/admin/roles',
    name: 'Role Management',
    description: 'Manage roles',
    parentId: 'nav-admin',
    requiredCapability: 'ROLE_MANAGE',
    sortOrder: 2,
  },
  {
    id: 'nav-admin-permissions',
    type: 'navigation',
    path: '/admin/permissions',
    name: 'Permission Management',
    description: 'Manage permissions',
    parentId: 'nav-admin',
    requiredCapability: 'PERMISSION_MANAGE',
    sortOrder: 3,
  },
  {
    id: 'nav-admin-organizations',
    type: 'navigation',
    path: '/admin/organizations',
    name: 'Organizations',
    description: 'Manage organizational units',
    parentId: 'nav-admin',
    requiredCapability: 'ORGANIZATION_MANAGE',
    sortOrder: 4,
  },
  {
    id: 'nav-admin-audit',
    type: 'navigation',
    path: '/admin/audit',
    name: 'Audit Logs',
    description: 'View audit logs',
    parentId: 'nav-admin',
    requiredCapability: 'AUDIT_VIEW',
    sortOrder: 5,
  },
  
  // Analytics Menu
  {
    id: 'nav-analytics',
    type: 'navigation',
    path: '/analytics',
    name: 'Analytics',
    description: 'Analytics and reports',
    requiredCapability: 'ANALYTICS_VIEW',
    icon: 'BarChart3',
    sortOrder: 3,
  },
  
  // Profile
  {
    id: 'nav-profile',
    type: 'navigation',
    path: '/profile',
    name: 'Profile',
    description: 'User profile',
    requiredCapability: null, // Accessible to all
    icon: 'User',
    sortOrder: 100,
  },
  
  // ====================
  // ROUTE RESOURCES
  // ====================
  
  {
    id: 'route-dashboard',
    type: 'route',
    path: '/dashboard',
    name: 'Dashboard Route',
    requiredCapability: null,
  },
  {
    id: 'route-documents',
    type: 'route',
    path: '/documents',
    name: 'Documents Route',
    requiredCapability: 'DOCUMENT_VIEW',
  },
  {
    id: 'route-documents-new',
    type: 'route',
    path: '/documents/new',
    name: 'Create Document Route',
    requiredCapability: 'DOCUMENT_CREATE',
  },
  {
    id: 'route-documents-edit',
    type: 'route',
    path: '/documents/:id/edit',
    name: 'Edit Document Route',
    requiredCapability: 'DOCUMENT_EDIT',
  },
  {
    id: 'route-admin',
    type: 'route',
    path: '/admin',
    name: 'Admin Route',
    requiredCapability: 'ADMIN_ACCESS',
  },
  {
    id: 'route-admin-users',
    type: 'route',
    path: '/admin/users',
    name: 'User Management Route',
    requiredCapability: 'USER_MANAGE',
  },
  {
    id: 'route-admin-roles',
    type: 'route',
    path: '/admin/roles',
    name: 'Role Management Route',
    requiredCapability: 'ROLE_MANAGE',
  },
  {
    id: 'route-admin-permissions',
    type: 'route',
    path: '/admin/permissions',
    name: 'Permission Management Route',
    requiredCapability: 'PERMISSION_MANAGE',
  },
  {
    id: 'route-admin-organizations',
    type: 'route',
    path: '/admin/organizations',
    name: 'Organizations Route',
    requiredCapability: 'ORGANIZATION_MANAGE',
  },
  {
    id: 'route-admin-audit',
    type: 'route',
    path: '/admin/audit',
    name: 'Audit Logs Route',
    requiredCapability: 'AUDIT_VIEW',
  },
  {
    id: 'route-analytics',
    type: 'route',
    path: '/analytics',
    name: 'Analytics Route',
    requiredCapability: 'ANALYTICS_VIEW',
  },
  {
    id: 'route-profile',
    type: 'route',
    path: '/profile',
    name: 'Profile Route',
    requiredCapability: null,
  },
  
  // =================
  // API RESOURCES
  // =================
  
  // Document APIs
  {
    id: 'api-documents-list',
    type: 'api',
    path: '/api/documents',
    name: 'List Documents API',
    description: 'GET /api/documents',
    requiredCapability: 'DOCUMENT_VIEW',
    metadata: { method: 'GET' },
  },
  {
    id: 'api-documents-get',
    type: 'api',
    path: '/api/documents/:id',
    name: 'Get Document API',
    description: 'GET /api/documents/:id',
    requiredCapability: 'DOCUMENT_VIEW',
    metadata: { method: 'GET' },
  },
  {
    id: 'api-documents-create',
    type: 'api',
    path: '/api/documents',
    name: 'Create Document API',
    description: 'POST /api/documents',
    requiredCapability: 'DOCUMENT_CREATE',
    metadata: { method: 'POST' },
  },
  {
    id: 'api-documents-update',
    type: 'api',
    path: '/api/documents/:id',
    name: 'Update Document API',
    description: 'PUT /api/documents/:id',
    requiredCapability: 'DOCUMENT_EDIT',
    metadata: { method: 'PUT' },
  },
  {
    id: 'api-documents-delete',
    type: 'api',
    path: '/api/documents/:id',
    name: 'Delete Document API',
    description: 'DELETE /api/documents/:id',
    requiredCapability: 'DOCUMENT_DELETE',
    metadata: { method: 'DELETE' },
  },
  {
    id: 'api-documents-approve',
    type: 'api',
    path: '/api/documents/:id/approve',
    name: 'Approve Document API',
    description: 'POST /api/documents/:id/approve',
    requiredCapability: 'DOCUMENT_APPROVE',
    metadata: { method: 'POST' },
  },
  {
    id: 'api-documents-publish',
    type: 'api',
    path: '/api/documents/:id/publish',
    name: 'Publish Document API',
    description: 'POST /api/documents/:id/publish',
    requiredCapability: 'DOCUMENT_PUBLISH',
    metadata: { method: 'POST' },
  },
  
  // User APIs
  {
    id: 'api-users-list',
    type: 'api',
    path: '/api/users',
    name: 'List Users API',
    description: 'GET /api/users',
    requiredCapability: 'USER_VIEW',
    metadata: { method: 'GET' },
  },
  {
    id: 'api-users-get',
    type: 'api',
    path: '/api/users/:id',
    name: 'Get User API',
    description: 'GET /api/users/:id',
    requiredCapability: 'USER_VIEW',
    metadata: { method: 'GET' },
  },
  {
    id: 'api-users-create',
    type: 'api',
    path: '/api/users',
    name: 'Create User API',
    description: 'POST /api/users',
    requiredCapability: 'USER_MANAGE',
    metadata: { method: 'POST' },
  },
  {
    id: 'api-users-update',
    type: 'api',
    path: '/api/users/:id',
    name: 'Update User API',
    description: 'PUT /api/users/:id',
    requiredCapability: 'USER_MANAGE',
    metadata: { method: 'PUT' },
  },
  {
    id: 'api-users-delete',
    type: 'api',
    path: '/api/users/:id',
    name: 'Delete User API',
    description: 'DELETE /api/users/:id',
    requiredCapability: 'USER_MANAGE',
    metadata: { method: 'DELETE' },
  },
  
  // Role APIs
  {
    id: 'api-roles-list',
    type: 'api',
    path: '/api/roles',
    name: 'List Roles API',
    description: 'GET /api/roles',
    requiredCapability: 'USER_VIEW',
    metadata: { method: 'GET' },
  },
  {
    id: 'api-roles-create',
    type: 'api',
    path: '/api/roles',
    name: 'Create Role API',
    description: 'POST /api/roles',
    requiredCapability: 'ROLE_MANAGE',
    metadata: { method: 'POST' },
  },
  {
    id: 'api-roles-update',
    type: 'api',
    path: '/api/roles/:id',
    name: 'Update Role API',
    description: 'PUT /api/roles/:id',
    requiredCapability: 'ROLE_MANAGE',
    metadata: { method: 'PUT' },
  },
  {
    id: 'api-roles-delete',
    type: 'api',
    path: '/api/roles/:id',
    name: 'Delete Role API',
    description: 'DELETE /api/roles/:id',
    requiredCapability: 'ROLE_MANAGE',
    metadata: { method: 'DELETE' },
  },
  
  // Permission APIs
  {
    id: 'api-permissions-list',
    type: 'api',
    path: '/api/permissions',
    name: 'List Permissions API',
    description: 'GET /api/permissions',
    requiredCapability: 'USER_VIEW',
    metadata: { method: 'GET' },
  },
  {
    id: 'api-permissions-manage',
    type: 'api',
    path: '/api/permissions',
    name: 'Manage Permissions API',
    description: 'POST /api/permissions',
    requiredCapability: 'PERMISSION_MANAGE',
    metadata: { method: 'POST' },
  },
  
  // Analytics APIs
  {
    id: 'api-analytics-dashboard',
    type: 'api',
    path: '/api/analytics/dashboard',
    name: 'Analytics Dashboard API',
    description: 'GET /api/analytics/dashboard',
    requiredCapability: 'ANALYTICS_VIEW',
    metadata: { method: 'GET' },
  },
  {
    id: 'api-analytics-export',
    type: 'api',
    path: '/api/analytics/export',
    name: 'Export Analytics API',
    description: 'GET /api/analytics/export',
    requiredCapability: 'ANALYTICS_EXPORT',
    metadata: { method: 'GET' },
  },
  
  // Audit APIs
  {
    id: 'api-audit-logs',
    type: 'api',
    path: '/api/audit/logs',
    name: 'Audit Logs API',
    description: 'GET /api/audit/logs',
    requiredCapability: 'AUDIT_VIEW',
    metadata: { method: 'GET' },
  },
  
  // Organization APIs
  {
    id: 'api-organizations-list',
    type: 'api',
    path: '/api/organizations',
    name: 'List Organizations API',
    description: 'GET /api/organizations',
    requiredCapability: 'ORGANIZATION_VIEW',
    metadata: { method: 'GET' },
  },
  {
    id: 'api-organizations-manage',
    type: 'api',
    path: '/api/organizations',
    name: 'Manage Organizations API',
    description: 'POST /api/organizations',
    requiredCapability: 'ORGANIZATION_MANAGE',
    metadata: { method: 'POST' },
  },
]

export async function seedResources() {
  console.log('🌱 Seeding resources...')
  
  for (const resource of resources) {
    await prisma.resource.upsert({
      where: { id: resource.id },
      update: {
        type: resource.type,
        path: resource.path,
        name: resource.name,
        description: resource.description,
        parentId: resource.parentId || null,
        requiredCapability: resource.requiredCapability || null,
        icon: resource.icon,
        sortOrder: resource.sortOrder,
        metadata: resource.metadata,
      },
      create: {
        id: resource.id,
        type: resource.type,
        path: resource.path,
        name: resource.name,
        description: resource.description,
        parentId: resource.parentId || null,
        requiredCapability: resource.requiredCapability || null,
        icon: resource.icon,
        sortOrder: resource.sortOrder,
        metadata: resource.metadata,
      },
    })
    console.log(`  ✓ ${resource.type.padEnd(10)} ${resource.name}`)
  }
  
  console.log(`✅ Seeded ${resources.length} resources`)
  console.log(`   - Navigation: ${resources.filter(r => r.type === 'navigation').length}`)
  console.log(`   - Routes: ${resources.filter(r => r.type === 'route').length}`)
  console.log(`   - APIs: ${resources.filter(r => r.type === 'api').length}`)
}

// Run if called directly
if (require.main === module) {
  seedResources()
    .then(() => {
      console.log('✅ Resources seeded successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Error seeding resources:', error)
      process.exit(1)
    })
    .finally(() => {
      prisma.$disconnect()
    })
}

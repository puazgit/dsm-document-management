import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Additional resources for RBAC management UI
const newResources = [
  // RBAC Management submenu under Admin
  {
    id: 'nav-admin-rbac',
    type: 'navigation',
    path: '/admin/rbac',
    name: 'RBAC Management',
    description: 'Manage unified RBAC system',
    parentId: 'nav-admin',
    requiredCapability: 'PERMISSION_MANAGE',
    sortOrder: 6,
  },
  {
    id: 'nav-admin-rbac-resources',
    type: 'navigation',
    path: '/admin/rbac/resources',
    name: 'Resources',
    description: 'Manage resources (navigation, routes, APIs)',
    parentId: 'nav-admin-rbac',
    requiredCapability: 'PERMISSION_MANAGE',
    sortOrder: 1,
  },
  {
    id: 'nav-admin-rbac-assignments',
    type: 'navigation',
    path: '/admin/rbac/assignments',
    name: 'Role Assignments',
    description: 'Assign capabilities to roles',
    parentId: 'nav-admin-rbac',
    requiredCapability: 'ROLE_MANAGE',
    sortOrder: 2,
  },
  
  // Routes
  {
    id: 'route-admin-rbac-resources',
    type: 'route',
    path: '/admin/rbac/resources',
    name: 'RBAC Resources Route',
    requiredCapability: 'PERMISSION_MANAGE',
  },
  {
    id: 'route-admin-rbac-assignments',
    type: 'route',
    path: '/admin/rbac/assignments',
    name: 'RBAC Assignments Route',
    requiredCapability: 'ROLE_MANAGE',
  },
  
  // API endpoints
  {
    id: 'api-admin-capabilities-list',
    type: 'api',
    path: '/api/admin/capabilities',
    name: 'List Capabilities API',
    description: 'GET /api/admin/capabilities',
    requiredCapability: 'PERMISSION_MANAGE',
    metadata: { method: 'GET' },
  },
  {
    id: 'api-admin-capabilities-create',
    type: 'api',
    path: '/api/admin/capabilities',
    name: 'Create Capability API',
    description: 'POST /api/admin/capabilities',
    requiredCapability: 'PERMISSION_MANAGE',
    metadata: { method: 'POST' },
  },
  {
    id: 'api-admin-resources-list',
    type: 'api',
    path: '/api/admin/resources',
    name: 'List Resources API',
    description: 'GET /api/admin/resources',
    requiredCapability: 'PERMISSION_MANAGE',
    metadata: { method: 'GET' },
  },
  {
    id: 'api-admin-resources-create',
    type: 'api',
    path: '/api/admin/resources',
    name: 'Create Resource API',
    description: 'POST /api/admin/resources',
    requiredCapability: 'PERMISSION_MANAGE',
    metadata: { method: 'POST' },
  },
  {
    id: 'api-admin-role-capabilities-list',
    type: 'api',
    path: '/api/admin/role-capabilities',
    name: 'List Role Capabilities API',
    description: 'GET /api/admin/role-capabilities',
    requiredCapability: 'ROLE_MANAGE',
    metadata: { method: 'GET' },
  },
  {
    id: 'api-admin-role-capabilities-manage',
    type: 'api',
    path: '/api/admin/role-capabilities',
    name: 'Manage Role Capabilities API',
    description: 'POST /api/admin/role-capabilities',
    requiredCapability: 'ROLE_MANAGE',
    metadata: { method: 'POST' },
  },
]

async function addRBACNavigationResources() {
  console.log('🌱 Adding RBAC management navigation resources...\n')
  
  for (const resource of newResources) {
    await prisma.resource.upsert({
      where: { id: resource.id },
      update: {
        type: resource.type,
        path: resource.path,
        name: resource.name,
        description: resource.description,
        parentId: resource.parentId || null,
        requiredCapability: resource.requiredCapability || null,
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
        sortOrder: resource.sortOrder || 0,
        metadata: resource.metadata,
      },
    })
    console.log(`  ✓ ${resource.type.padEnd(10)} ${resource.name}`)
  }
  
  console.log(`\n✅ Added ${newResources.length} RBAC management resources`)
  console.log(`   - Navigation: ${newResources.filter(r => r.type === 'navigation').length}`)
  console.log(`   - Routes: ${newResources.filter(r => r.type === 'route').length}`)
  console.log(`   - APIs: ${newResources.filter(r => r.type === 'api').length}`)
}

// Run if called directly
if (require.main === module) {
  addRBACNavigationResources()
    .then(() => {
      console.log('\n✅ RBAC navigation resources added successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Error adding RBAC navigation resources:', error)
      process.exit(1)
    })
    .finally(() => {
      prisma.$disconnect()
    })
}

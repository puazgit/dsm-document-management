import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Capability definitions for the unified RBAC system
export const capabilities = [
  // System Administration
  {
    name: 'ADMIN_ACCESS',
    description: 'Full system administration access',
    category: 'system',
  },
  {
    name: 'SYSTEM_CONFIG',
    description: 'System configuration management',
    category: 'system',
  },
  
  // User Management
  {
    name: 'USER_MANAGE',
    description: 'Create, update, delete users',
    category: 'user',
  },
  {
    name: 'USER_VIEW',
    description: 'View user information',
    category: 'user',
  },
  
  // Role & Permission Management
  {
    name: 'ROLE_MANAGE',
    description: 'Manage roles and permissions',
    category: 'user',
  },
  {
    name: 'PERMISSION_MANAGE',
    description: 'Manage permissions',
    category: 'user',
  },
  
  // Document Management
  {
    name: 'DOCUMENT_FULL_ACCESS',
    description: 'Full document management access',
    category: 'document',
  },
  {
    name: 'DOCUMENT_VIEW',
    description: 'View documents',
    category: 'document',
  },
  {
    name: 'DOCUMENT_CREATE',
    description: 'Create new documents',
    category: 'document',
  },
  {
    name: 'DOCUMENT_EDIT',
    description: 'Edit documents',
    category: 'document',
  },
  {
    name: 'DOCUMENT_DELETE',
    description: 'Delete documents',
    category: 'document',
  },
  {
    name: 'DOCUMENT_APPROVE',
    description: 'Approve documents',
    category: 'document',
  },
  {
    name: 'DOCUMENT_PUBLISH',
    description: 'Publish documents',
    category: 'document',
  },
  
  // Organizational Management
  {
    name: 'ORGANIZATION_MANAGE',
    description: 'Manage organizational units (PPD)',
    category: 'organization',
  },
  {
    name: 'ORGANIZATION_VIEW',
    description: 'View organizational units',
    category: 'organization',
  },
  
  // Analytics & Reports
  {
    name: 'ANALYTICS_VIEW',
    description: 'View analytics and reports',
    category: 'analytics',
  },
  {
    name: 'ANALYTICS_EXPORT',
    description: 'Export analytics data',
    category: 'analytics',
  },
  
  // Audit Logs
  {
    name: 'AUDIT_VIEW',
    description: 'View audit logs',
    category: 'audit',
  },
  
  // Workflow Management
  {
    name: 'WORKFLOW_MANAGE',
    description: 'Manage workflow configurations',
    category: 'workflow',
  },
]

export async function seedRoleCapabilities() {
  console.log('🌱 Seeding role capabilities...')
  
  for (const cap of capabilities) {
    await prisma.roleCapability.upsert({
      where: { name: cap.name },
      update: {
        description: cap.description,
        category: cap.category,
      },
      create: cap,
    })
    console.log(`  ✓ ${cap.name}`)
  }
  
  console.log(`✅ Seeded ${capabilities.length} role capabilities`)
}

// Run if called directly
if (require.main === module) {
  seedRoleCapabilities()
    .then(() => {
      console.log('✅ Role capabilities seeded successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Error seeding role capabilities:', error)
      process.exit(1)
    })
    .finally(() => {
      prisma.$disconnect()
    })
}

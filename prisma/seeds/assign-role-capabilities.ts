import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Map capabilities to roles
export const roleCapabilityMappings = [
  // ================
  // ADMIN ROLE
  // ================
  {
    roleName: 'admin',
    capabilities: [
      'ADMIN_ACCESS',
      'SYSTEM_CONFIG',
      'USER_MANAGE',
      'USER_VIEW',
      'ROLE_MANAGE',
      'PERMISSION_MANAGE',
      'DOCUMENT_FULL_ACCESS',
      'DOCUMENT_VIEW',
      'DOCUMENT_CREATE',
      'DOCUMENT_EDIT',
      'DOCUMENT_DELETE',
      'DOCUMENT_APPROVE',
      'DOCUMENT_PUBLISH',
      'ORGANIZATION_MANAGE',
      'ORGANIZATION_VIEW',
      'ANALYTICS_VIEW',
      'ANALYTICS_EXPORT',
      'AUDIT_VIEW',
      'WORKFLOW_MANAGE',
    ],
  },
  
  // ===================
  // PPD.PUSAT ROLE
  // ===================
  {
    roleName: 'ppd.pusat',
    capabilities: [
      'ADMIN_ACCESS',
      'USER_MANAGE',
      'USER_VIEW',
      'ROLE_MANAGE',
      'PERMISSION_MANAGE',
      'DOCUMENT_FULL_ACCESS',
      'DOCUMENT_VIEW',
      'DOCUMENT_CREATE',
      'DOCUMENT_EDIT',
      'DOCUMENT_DELETE',
      'DOCUMENT_APPROVE',
      'DOCUMENT_PUBLISH',
      'ORGANIZATION_MANAGE',
      'ORGANIZATION_VIEW',
      'ANALYTICS_VIEW',
      'ANALYTICS_EXPORT',
      'AUDIT_VIEW',
    ],
  },
  
  // =================
  // PPD.UNIT ROLE
  // =================
  {
    roleName: 'ppd.unit',
    capabilities: [
      'ADMIN_ACCESS',      // Can see Admin menu
      'USER_VIEW',         // Can view users
      'DOCUMENT_VIEW',
      'DOCUMENT_CREATE',
      'DOCUMENT_EDIT',
      'ORGANIZATION_VIEW',
      'ANALYTICS_VIEW',
    ],
  },
  
  // ===============
  // MANAGER ROLE
  // ===============
  {
    roleName: 'manager',
    capabilities: [
      'USER_VIEW',
      'DOCUMENT_VIEW',
      'DOCUMENT_CREATE',
      'DOCUMENT_EDIT',
      'DOCUMENT_APPROVE',
      'DOCUMENT_PUBLISH',
      'ORGANIZATION_VIEW',
      'ANALYTICS_VIEW',
    ],
  },
  
  // ==============
  // EDITOR ROLE
  // ==============
  {
    roleName: 'editor',
    capabilities: [
      'DOCUMENT_VIEW',
      'DOCUMENT_CREATE',
      'DOCUMENT_EDIT',
      'ANALYTICS_VIEW',
    ],
  },
  
  // ==============
  // VIEWER ROLE
  // ==============
  {
    roleName: 'viewer',
    capabilities: [
      'DOCUMENT_VIEW',
    ],
  },
  
  // =============
  // GUEST ROLE
  // =============
  {
    roleName: 'guest',
    capabilities: [
      'DOCUMENT_VIEW', // Limited document viewing
    ],
  },
]

export async function assignRoleCapabilities() {
  console.log('🌱 Assigning capabilities to roles...')
  
  for (const mapping of roleCapabilityMappings) {
    // Find role
    const role = await prisma.role.findUnique({
      where: { name: mapping.roleName },
    })
    
    if (!role) {
      console.log(`  ⚠️  Role not found: ${mapping.roleName}`)
      continue
    }
    
    console.log(`\n📋 Role: ${mapping.roleName} (${mapping.capabilities.length} capabilities)`)
    
    for (const capName of mapping.capabilities) {
      // Find capability
      const capability = await prisma.roleCapability.findUnique({
        where: { name: capName },
      })
      
      if (!capability) {
        console.log(`  ⚠️  Capability not found: ${capName}`)
        continue
      }
      
      // Create assignment
      await prisma.roleCapabilityAssignment.upsert({
        where: {
          roleId_capabilityId: {
            roleId: role.id,
            capabilityId: capability.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          capabilityId: capability.id,
        },
      })
      
      console.log(`  ✓ ${capName}`)
    }
  }
  
  console.log(`\n✅ Role capabilities assigned successfully`)
}

// Run if called directly
if (require.main === module) {
  assignRoleCapabilities()
    .then(() => {
      console.log('✅ All done!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Error assigning role capabilities:', error)
      process.exit(1)
    })
    .finally(() => {
      prisma.$disconnect()
    })
}

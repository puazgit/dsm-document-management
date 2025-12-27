import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('📊 Analyzing Permission vs Capability System\n')
  
  // Count permissions
  const permissionCount = await prisma.permission.count()
  const rolePermissionCount = await prisma.rolePermission.count()
  
  // Count capabilities
  const capabilityCount = await prisma.roleCapability.count()
  const capabilityAssignmentCount = await prisma.roleCapabilityAssignment.count()
  
  console.log('📈 Database Stats:')
  console.log(`   Permissions: ${permissionCount}`)
  console.log(`   RolePermissions (assignments): ${rolePermissionCount}`)
  console.log(`   Capabilities: ${capabilityCount}`)
  console.log(`   CapabilityAssignments: ${capabilityAssignmentCount}`)
  console.log('')
  
  // Sample permissions
  const samplePermissions = await prisma.permission.findMany({
    take: 5,
    select: { name: true, module: true, action: true }
  })
  
  console.log('📋 Sample Permissions (granular):')
  samplePermissions.forEach(p => {
    console.log(`   • ${p.name} (${p.module}.${p.action})`)
  })
  console.log('')
  
  // Sample capabilities
  const sampleCapabilities = await prisma.roleCapability.findMany({
    take: 5,
    select: { name: true, category: true }
  })
  
  console.log('🔑 Sample Capabilities (high-level):')
  sampleCapabilities.forEach(c => {
    console.log(`   • ${c.name} (${c.category || 'general'})`)
  })
  console.log('')
  
  // Check usage in code
  console.log('💡 Analysis:')
  console.log('')
  console.log('PERMISSIONS (Granular):')
  console.log('   • Format: module.action (e.g., users.create, documents.read)')
  console.log('   • Used for: Fine-grained access control')
  console.log('   • Used in: Session, API endpoints, specific operations')
  console.log('   • Example: Check if user can edit a specific document')
  console.log('')
  console.log('CAPABILITIES (High-level):')
  console.log('   • Format: CATEGORY_ACTION (e.g., USER_MANAGE, DOCUMENT_FULL_ACCESS)')
  console.log('   • Used for: Page/feature-level access control')
  console.log('   • Used in: Route protection, menu visibility, broad features')
  console.log('   • Example: Check if user can access /admin/users page')
  console.log('')
  
  console.log('🎯 Recommendation:')
  console.log('')
  console.log('KEEP BOTH SYSTEMS:')
  console.log('   ✅ Permissions: Granular control (API endpoints, specific actions)')
  console.log('   ✅ Capabilities: Coarse control (page access, menu items)')
  console.log('')
  console.log('   They serve different purposes and complement each other!')
  console.log('')
  console.log('   Example flow:')
  console.log('   1. Capability check: Can user access /admin/users? → USER_MANAGE')
  console.log('   2. Permission check: Can user create user? → users.create')
  console.log('   3. Permission check: Can user delete user? → users.delete')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

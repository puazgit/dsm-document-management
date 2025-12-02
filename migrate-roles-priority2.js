/**
 * Database Role Migration Script - Priority 2
 * 
 * This script creates missing roles in the database that are referenced in code
 * but don't exist in the database yet.
 * 
 * Missing roles to create:
 * - administrator (legacy alias for admin)  
 * - dewas -> org_dewas (already exists, remove legacy)
 * - dirut -> org_dirut (already exists, remove legacy) 
 * - gm -> org_gm (already exists, remove legacy)
 * - guest -> org_guest (already exists, remove legacy)
 * - kadiv -> org_kadiv (already exists, remove legacy)
 * - komite_audit -> org_komite_audit (already exists, remove legacy)
 * - manager -> org_manager (already exists, remove legacy)
 * - ppd -> org_ppd (already exists, remove legacy)
 * - reviewer (needs to be created)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Role definitions to create
const rolesToCreate = [
  {
    name: 'reviewer',
    displayName: 'Document Reviewer',
    description: 'Role for reviewing and approving documents',
    permissions: [
      'documents.read',
      'documents.review', 
      'documents.approve',
      'comments.create',
      'comments.read'
    ]
  }
];

// Legacy role mappings that need cleanup
const legacyRoleMappings = {
  'administrator': 'admin',
  'dewas': 'org_dewas',
  'dirut': 'org_dirut', 
  'gm': 'org_gm',
  'guest': 'org_guest',
  'kadiv': 'org_kadiv',
  'komite_audit': 'org_komite_audit',
  'manager': 'org_manager',
  'ppd': 'org_ppd'
};

async function createMissingRoles() {
  console.log('🔄 Creating missing roles in database...');
  
  for (const roleData of rolesToCreate) {
    try {
      // Check if role already exists
      const existingRole = await prisma.role.findUnique({
        where: { name: roleData.name }
      });
      
      if (existingRole) {
        console.log(`⚠️  Role '${roleData.name}' already exists, skipping...`);
        continue;
      }
      
      // Create the role
      const newRole = await prisma.role.create({
        data: {
          name: roleData.name,
          displayName: roleData.displayName,
          description: roleData.description
        }
      });
      
      console.log(`✅ Created role: ${newRole.name} (${newRole.displayName})`);
      
      // Create permissions for the role
      for (const permissionName of roleData.permissions) {
        const [action, module] = permissionName.split('.');
        
        // Check if permission exists
        let permission = await prisma.permission.findFirst({
          where: { action, module }
        });
        
        // Create permission if it doesn't exist
        if (!permission) {
          permission = await prisma.permission.create({
            data: {
              action,
              module,
              description: `${action} access for ${module}`
            }
          });
          console.log(`  📋 Created permission: ${permission.action}.${permission.module}`);
        }
        
        // Link role to permission
        await prisma.rolePermission.create({
          data: {
            roleId: newRole.id,
            permissionId: permission.id
          }
        });
        
        console.log(`  🔗 Linked ${newRole.name} to ${permission.action}.${permission.module}`);
      }
      
    } catch (error) {
      console.error(`❌ Error creating role ${roleData.name}:`, error.message);
    }
  }
}

async function migrateUserRoles() {
  console.log('\n🔄 Migrating user roles from legacy to modern names...');
  
  for (const [legacyName, modernName] of Object.entries(legacyRoleMappings)) {
    try {
      // Find legacy role
      const legacyRole = await prisma.role.findUnique({
        where: { name: legacyName }
      });
      
      // Find modern role
      const modernRole = await prisma.role.findUnique({
        where: { name: modernName }
      });
      
      if (!legacyRole) {
        console.log(`⚠️  Legacy role '${legacyName}' not found in database, skipping...`);
        continue;
      }
      
      if (!modernRole) {
        console.log(`❌ Modern role '${modernName}' not found in database!`);
        continue;
      }
      
      // Find users with legacy role
      const usersWithLegacyRole = await prisma.userRole.findMany({
        where: { roleId: legacyRole.id },
        include: { user: true }
      });
      
      if (usersWithLegacyRole.length === 0) {
        console.log(`ℹ️  No users found with legacy role '${legacyName}'`);
        continue;
      }
      
      console.log(`🔄 Migrating ${usersWithLegacyRole.length} users from '${legacyName}' to '${modernName}'...`);
      
      // Migrate each user
      for (const userRole of usersWithLegacyRole) {
        // Check if user already has modern role
        const existingModernRole = await prisma.userRole.findFirst({
          where: {
            userId: userRole.userId,
            roleId: modernRole.id
          }
        });
        
        if (existingModernRole) {
          console.log(`  ⚠️  User ${userRole.user.email} already has modern role, removing legacy...`);
        } else {
          // Create new user role with modern role
          await prisma.userRole.create({
            data: {
              userId: userRole.userId,
              roleId: modernRole.id
            }
          });
          console.log(`  ✅ Assigned modern role to ${userRole.user.email}`);
        }
        
        // Remove legacy user role
        await prisma.userRole.delete({
          where: { id: userRole.id }
        });
        console.log(`  🗑️  Removed legacy role from ${userRole.user.email}`);
      }
      
    } catch (error) {
      console.error(`❌ Error migrating role ${legacyName}:`, error.message);
    }
  }
}

async function cleanupLegacyRoles() {
  console.log('\n🧹 Cleaning up unused legacy roles...');
  
  for (const legacyName of Object.keys(legacyRoleMappings)) {
    try {
      const legacyRole = await prisma.role.findUnique({
        where: { name: legacyName }
      });
      
      if (!legacyRole) {
        console.log(`ℹ️  Legacy role '${legacyName}' not found, skipping...`);
        continue;
      }
      
      // Check if any users still have this role
      const usersWithRole = await prisma.userRole.count({
        where: { roleId: legacyRole.id }
      });
      
      if (usersWithRole > 0) {
        console.log(`⚠️  Legacy role '${legacyName}' still has ${usersWithRole} users, skipping deletion`);
        continue;
      }
      
      // Remove role permissions first
      await prisma.rolePermission.deleteMany({
        where: { roleId: legacyRole.id }
      });
      
      // Delete the role
      await prisma.role.delete({
        where: { id: legacyRole.id }
      });
      
      console.log(`✅ Deleted legacy role: ${legacyName}`);
      
    } catch (error) {
      console.error(`❌ Error deleting legacy role ${legacyName}:`, error.message);
    }
  }
}

async function generateReport() {
  console.log('\n📊 ROLE MIGRATION REPORT');
  console.log('='.repeat(50));
  
  // Count roles
  const totalRoles = await prisma.role.count();
  console.log(`📈 Total roles in database: ${totalRoles}`);
  
  // List all roles
  const allRoles = await prisma.role.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          userRoles: true,
          rolePermissions: true
        }
      }
    }
  });
  
  console.log('\n📋 Role Summary:');
  for (const role of allRoles) {
    const userCount = role._count.userRoles;
    const permissionCount = role._count.rolePermissions;
    console.log(`  ${role.name.padEnd(20)} | Users: ${userCount.toString().padStart(3)} | Permissions: ${permissionCount.toString().padStart(3)}`);
  }
  
  // Check for users without roles
  const usersWithoutRoles = await prisma.user.count({
    where: {
      userRoles: {
        none: {}
      }
    }
  });
  
  if (usersWithoutRoles > 0) {
    console.log(`\n⚠️  Warning: ${usersWithoutRoles} users have no roles assigned`);
  }
  
  console.log('\n✅ Role migration completed successfully!');
}

async function main() {
  try {
    console.log('🚀 PRIORITY 2: DATABASE ROLE MIGRATION');
    console.log('='.repeat(60));
    
    await createMissingRoles();
    await migrateUserRoles(); 
    await cleanupLegacyRoles();
    await generateReport();
    
  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute migration
main().catch(console.error);
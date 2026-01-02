import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface PermissionMapping {
  permissionName: string;
  capabilityName: string;
}

// Complete mapping from permission names to capability names
const PERMISSION_TO_CAPABILITY: Record<string, string> = {
  'audit.analytics': 'AUDIT_ANALYTICS',
  'audit.export': 'AUDIT_EXPORT',
  'audit.read': 'AUDIT_READ',
  'audit.view': 'AUDIT_VIEW',
  'comments.create': 'COMMENT_CREATE',
  'comments.delete': 'COMMENT_DELETE',
  'comments.moderate': 'COMMENT_MODERATE',
  'comments.read': 'COMMENT_READ',
  'comments.update': 'COMMENT_UPDATE',
  'document-types.create': 'DOCUMENT_TYPE_CREATE',
  'document-types.delete': 'DOCUMENT_TYPE_DELETE',
  'document-types.read': 'DOCUMENT_TYPE_READ',
  'document-types.update': 'DOCUMENT_TYPE_UPDATE',
  'documents.approve': 'DOCUMENT_APPROVE',
  'documents.create': 'DOCUMENT_CREATE',
  'documents.delete': 'DOCUMENT_DELETE',
  'documents.delete.own': 'DOCUMENT_DELETE_OWN',
  'documents.download': 'DOCUMENT_DOWNLOAD',
  'documents.read': 'DOCUMENT_READ',
  'documents.read.own': 'DOCUMENT_READ_OWN',
  'documents.update': 'DOCUMENT_UPDATE',
  'documents.update.own': 'DOCUMENT_UPDATE_OWN',
  'documents.upload': 'DOCUMENT_UPLOAD',
  'documents.view': 'DOCUMENT_VIEW',
  'groups.create': 'GROUP_CREATE',
  'groups.delete': 'GROUP_DELETE',
  'groups.update': 'GROUP_UPDATE',
  'groups.view': 'GROUP_VIEW',
  'pdf.copy': 'PDF_COPY',
  'pdf.download': 'PDF_DOWNLOAD',
  'pdf.print': 'PDF_PRINT',
  'pdf.view': 'PDF_VIEW',
  'pdf.watermark': 'PDF_WATERMARK',
  'permissions.manage': 'PERMISSION_MANAGE',
  'permissions.view': 'PERMISSION_VIEW',
  'roles.assign': 'ROLE_ASSIGN',
  'roles.create': 'ROLE_CREATE',
  'roles.delete': 'ROLE_DELETE',
  'roles.read': 'ROLE_READ',
  'roles.update': 'ROLE_UPDATE',
  'roles.view': 'ROLE_VIEW',
  'settings.update': 'SETTINGS_UPDATE',
  'settings.view': 'SETTINGS_VIEW',
  'system.admin': 'SYSTEM_ADMIN',
  'system.analytics': 'SYSTEM_ANALYTICS',
  'system.logs': 'SYSTEM_LOGS',
  'system.settings': 'SYSTEM_SETTINGS',
  'users.create': 'USER_CREATE',
  'users.delete': 'USER_DELETE',
  'users.profile': 'USER_PROFILE',
  'users.read': 'USER_READ',
  'users.update': 'USER_UPDATE',
  'users.view': 'USER_VIEW',
};

async function migratePermissionsToCapabilities() {
  console.log('🔄 Phase 2 Task 2.3: Migrate RolePermission → RoleCapabilityAssignment\n');
  console.log('=' .repeat(80));
  
  try {
    // Step 1: Get all RolePermission records
    console.log('\n📊 Step 1: Analyzing existing RolePermission data...\n');
    
    const rolePermissions = await prisma.rolePermission.findMany({
      include: {
        permission: true,
        role: true,
      },
    });
    
    console.log(`Found ${rolePermissions.length} RolePermission records`);
    
    // Step 2: Group by role
    const byRole: Record<string, typeof rolePermissions> = {};
    rolePermissions.forEach(rp => {
      if (!byRole[rp.role.name]) {
        byRole[rp.role.name] = [];
      }
      byRole[rp.role.name]!.push(rp);
    });
    
    console.log(`Spread across ${Object.keys(byRole).length} roles\n`);
    
    Object.keys(byRole).sort().forEach(roleName => {
      const perms = byRole[roleName];
      if (perms) {
        console.log(`   - ${roleName.padEnd(20)}: ${perms.length} permissions`);
      }
    });
    
    // Step 3: Check existing RoleCapabilityAssignment records
    console.log('\n📊 Step 2: Checking existing capability assignments...\n');
    
    const existingAssignments = await prisma.roleCapabilityAssignment.findMany({
      include: {
        role: true,
        capability: true,
      },
    });
    
    console.log(`Found ${existingAssignments.length} existing capability assignments`);
    
    // Create set of existing assignments for quick lookup
    const existingSet = new Set(
      existingAssignments.map(a => `${a.role.name}:${a.capability.name}`)
    );
    
    // Step 4: Map permissions to capabilities
    console.log('\n📊 Step 3: Mapping permissions to capabilities...\n');
    
    const mappings: Array<{
      roleName: string;
      roleId: string;
      permissionName: string;
      capabilityName: string;
      capabilityId: string | null;
      exists: boolean;
    }> = [];
    
    let unmappedCount = 0;
    let missingCapabilities = 0;
    
    for (const rp of rolePermissions) {
      const capabilityName = PERMISSION_TO_CAPABILITY[rp.permission.name];
      
      if (!capabilityName) {
        console.log(`   ⚠️  No mapping for permission: ${rp.permission.name}`);
        unmappedCount++;
        continue;
      }
      
      // Find capability in database
      const capability = await prisma.roleCapability.findUnique({
        where: { name: capabilityName },
      });
      
      if (!capability) {
        console.log(`   ❌ Capability not found: ${capabilityName} (for ${rp.permission.name})`);
        missingCapabilities++;
        continue;
      }
      
      const assignmentKey = `${rp.role.name}:${capability.name}`;
      const alreadyExists = existingSet.has(assignmentKey);
      
      mappings.push({
        roleName: rp.role.name,
        roleId: rp.roleId,
        permissionName: rp.permission.name,
        capabilityName: capability.name,
        capabilityId: capability.id,
        exists: alreadyExists,
      });
    }
    
    console.log(`\nMapping summary:`);
    console.log(`   - Successfully mapped: ${mappings.length}`);
    console.log(`   - Unmapped permissions: ${unmappedCount}`);
    console.log(`   - Missing capabilities: ${missingCapabilities}`);
    console.log(`   - Already assigned: ${mappings.filter(m => m.exists).length}`);
    console.log(`   - New assignments needed: ${mappings.filter(m => !m.exists).length}`);
    
    if (unmappedCount > 0 || missingCapabilities > 0) {
      console.log('\n⚠️  WARNING: Some permissions cannot be migrated!');
      console.log('Please review and fix the issues above before proceeding.\n');
      return;
    }
    
    // Step 5: Create new assignments
    const newMappings = mappings.filter(m => !m.exists);
    
    if (newMappings.length === 0) {
      console.log('\n✅ All permissions already migrated to capabilities!\n');
      return;
    }
    
    console.log('\n📊 Step 4: Creating new capability assignments...\n');
    
    let created = 0;
    const errors: string[] = [];
    
    for (const mapping of newMappings) {
      try {
        await prisma.roleCapabilityAssignment.create({
          data: {
            roleId: mapping.roleId,
            capabilityId: mapping.capabilityId!,
          },
        });
        
        console.log(`   ✅ ${mapping.roleName.padEnd(15)} → ${mapping.capabilityName}`);
        created++;
      } catch (error: any) {
        const errorMsg = `${mapping.roleName} → ${mapping.capabilityName}: ${error.message}`;
        errors.push(errorMsg);
        console.log(`   ❌ ${errorMsg}`);
      }
    }
    
    // Step 6: Verification
    console.log('\n📊 Step 5: Verifying migration...\n');
    
    const finalAssignments = await prisma.roleCapabilityAssignment.findMany({
      include: {
        role: true,
        capability: true,
      },
    });
    
    // Group by role
    const assignmentsByRole: Record<string, typeof finalAssignments> = {};
    finalAssignments.forEach(a => {
      if (!assignmentsByRole[a.role.name]) {
        assignmentsByRole[a.role.name] = [];
      }
      assignmentsByRole[a.role.name]!.push(a);
    });
    
    console.log('Role capability assignments:');
    Object.keys(assignmentsByRole).sort().forEach(roleName => {
      const assignments = assignmentsByRole[roleName];
      if (assignments) {
        const originalPerms = byRole[roleName]?.length || 0;
        console.log(`   - ${roleName.padEnd(20)}: ${assignments.length} capabilities (was ${originalPerms} permissions)`);
      }
    });
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('\n✅ MIGRATION SUMMARY\n');
    console.log(`Total RolePermission records: ${rolePermissions.length}`);
    console.log(`Successfully mapped: ${mappings.length}`);
    console.log(`New assignments created: ${created}`);
    console.log(`Errors: ${errors.length}`);
    console.log(`Total capability assignments: ${finalAssignments.length}\n`);
    
    if (errors.length > 0) {
      console.log('❌ Errors encountered:');
      errors.forEach(err => console.log(`   - ${err}`));
      console.log('');
    }
    
    // Compare totals
    const rolesWithPermissions = Object.keys(byRole).length;
    const rolesWithCapabilities = Object.keys(assignmentsByRole).length;
    
    if (rolesWithCapabilities >= rolesWithPermissions) {
      console.log('✅ All roles successfully migrated!\n');
    } else {
      console.log(`⚠️  Only ${rolesWithCapabilities}/${rolesWithPermissions} roles migrated\n`);
    }
    
    console.log('✅ PHASE 2 TASK 2.3 COMPLETE\n');
    console.log('Next steps:');
    console.log('  1. Review the capability assignments in /admin/rbac/assignments');
    console.log('  2. Test with different user roles');
    console.log('  3. Proceed to Phase 3: Update NextAuth callbacks');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
}

migratePermissionsToCapabilities()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

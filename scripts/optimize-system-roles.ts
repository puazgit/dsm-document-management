import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function optimizeSystemRoles() {
  console.log('🔧 Optimizing System Roles Configuration\n');
  console.log('='.repeat(80));
  
  // Define which roles should be system roles (critical, cannot be deleted)
  const criticalRoleNames = ['admin', 'administrator', 'guest'];
  
  console.log('\n📋 PLAN:\n');
  console.log('✅ Roles that SHOULD be system roles (is_system = true):');
  console.log('   - admin: Main administrator account');
  console.log('   - administrator: Alternative admin role');
  console.log('   - guest: Default public access role');
  console.log('');
  console.log('⚠️  Roles that should NOT be system roles (is_system = false):');
  console.log('   - viewer: Regular user role, can be edited/deleted');
  console.log('   - manager: Regular user role, can be edited/deleted');
  console.log('   - editor: Regular user role, can be edited/deleted');
  console.log('   - All org_* roles: Organizational roles, fully editable');
  console.log('');
  
  const confirm = process.argv.includes('--apply');
  
  if (!confirm) {
    console.log('⚠️  DRY RUN MODE - No changes will be made');
    console.log('   Run with --apply flag to apply changes\n');
  } else {
    console.log('✅ APPLY MODE - Changes will be saved to database\n');
  }
  
  console.log('='.repeat(80));
  console.log('\n📊 CURRENT STATE:\n');
  
  const allRoles = await prisma.role.findMany({
    include: {
      _count: {
        select: {
          userRoles: true
        }
      }
    }
  });
  
  let changesNeeded = 0;
  const updates: Array<{role: string, from: boolean, to: boolean}> = [];
  
  for (const role of allRoles) {
    const shouldBeSystem = criticalRoleNames.includes(role.name.toLowerCase());
    const isCurrentlySystem = role.isSystem;
    
    if (shouldBeSystem !== isCurrentlySystem) {
      changesNeeded++;
      updates.push({
        role: role.name,
        from: isCurrentlySystem,
        to: shouldBeSystem
      });
      
      const action = shouldBeSystem ? '🔒 Mark as SYSTEM' : '🔓 Mark as REGULAR';
      console.log(`${action}: ${role.displayName} (${role.name})`);
      console.log(`   Current: is_system = ${isCurrentlySystem}`);
      console.log(`   Target:  is_system = ${shouldBeSystem}`);
      console.log(`   Users: ${role._count.userRoles}`);
      console.log('');
    }
  }
  
  if (changesNeeded === 0) {
    console.log('✅ No changes needed - all roles properly configured\n');
  } else {
    console.log(`\n📝 Summary: ${changesNeeded} role(s) need updating\n`);
    
    if (confirm) {
      console.log('🔄 Applying changes...\n');
      
      for (const update of updates) {
        const role = await prisma.role.findFirst({
          where: { name: update.role }
        });
        
        if (role) {
          await prisma.role.update({
            where: { id: role.id },
            data: { isSystem: update.to }
          });
          
          const status = update.to ? '🔒 SYSTEM' : '🔓 REGULAR';
          console.log(`✅ Updated ${update.role} → ${status}`);
        }
      }
      
      console.log('\n✅ All changes applied successfully!\n');
    } else {
      console.log('💡 To apply these changes, run:');
      console.log('   npx tsx scripts/optimize-system-roles.ts --apply\n');
    }
  }
  
  console.log('='.repeat(80));
  console.log('\n📚 EXPLANATION OF is_system FLAG:\n');
  console.log('Purpose:');
  console.log('   - Prevents accidental deletion in admin interface');
  console.log('   - Marks roles critical to application security');
  console.log('   - UI typically hides "Delete" button for system roles');
  console.log('');
  console.log('When to use is_system = true:');
  console.log('   ✅ Core application roles (admin, guest)');
  console.log('   ✅ Roles used in code logic/authorization');
  console.log('   ✅ Default roles for new users');
  console.log('');
  console.log('When to use is_system = false:');
  console.log('   ✅ Organizational roles (department-specific)');
  console.log('   ✅ Custom roles created by admins');
  console.log('   ✅ Temporary or project-specific roles');
  console.log('   ✅ Roles that may be deleted/renamed');
  console.log('');
  console.log('Best Practice:');
  console.log('   - Only 2-4 roles should be system roles');
  console.log('   - Keep majority as regular roles for flexibility');
  console.log('   - Admins can still edit permissions of system roles');
  console.log('   - Only deletion is prevented, not modification');
  console.log('\n');
  
  await prisma.$disconnect();
}

optimizeSystemRoles().catch(console.error);

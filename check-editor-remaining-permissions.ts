import { prisma } from './src/lib/prisma';

(async () => {
  try {
    console.log('🔍 Checking Editor Role Remaining Permissions\n');
    console.log('═'.repeat(70));
    
    // Get editor role with all permissions
    const editorRole = await prisma.role.findUnique({
      where: { name: 'editor' },
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        }
      }
    });
    
    if (!editorRole) {
      console.log('❌ Editor role not found');
      return;
    }
    
    console.log('\n📊 EDITOR ROLE INFO:');
    console.log('─'.repeat(70));
    console.log(`Name: ${editorRole.name}`);
    console.log(`Display Name: ${editorRole.displayName}`);
    console.log(`Level: ${editorRole.level}`);
    console.log(`Total Permissions: ${editorRole.rolePermissions.length}`);
    
    if (editorRole.rolePermissions.length > 0) {
      console.log('\n\n🔐 PERMISSIONS YANG MASIH ADA:');
      console.log('═'.repeat(70));
      editorRole.rolePermissions.forEach((rp, index) => {
        console.log(`\n${index + 1}. ${rp.permission.name}`);
        console.log(`   Resource: ${rp.permission.resource}`);
        console.log(`   Action: ${rp.permission.action}`);
        console.log(`   Description: ${rp.permission.description}`);
        if (rp.assignedAt) {
          console.log(`   Assigned at: ${rp.assignedAt.toISOString()}`);
        }
      });
      
      console.log('\n\n📋 GROUPED BY RESOURCE:');
      console.log('═'.repeat(70));
      const grouped = editorRole.rolePermissions.reduce((acc, rp) => {
        const resource = rp.permission.resource;
        if (!acc[resource]) acc[resource] = [];
        acc[resource].push(rp.permission.name);
        return acc;
      }, {} as Record<string, string[]>);
      
      Object.entries(grouped).forEach(([resource, perms]) => {
        console.log(`\n${resource}:`);
        perms.forEach(p => console.log(`  - ${p}`));
      });
    } else {
      console.log('\n✅ Editor role has NO permissions assigned');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();

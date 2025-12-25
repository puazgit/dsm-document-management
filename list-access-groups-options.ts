import { prisma } from './src/lib/prisma';

(async () => {
  try {
    console.log('📋 Available Options for access_groups:\n');
    
    // Get all active groups
    const groups = await prisma.group.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        displayName: true,
        level: true
      },
      orderBy: { level: 'desc' }
    });
    
    console.log('1️⃣  GROUP NAMES (dapat digunakan di access_groups):');
    console.log('─'.repeat(60));
    groups.forEach(group => {
      console.log(`   "${group.name.padEnd(25)}" - ${group.displayName} (level ${group.level})`);
    });
    
    // Get all active roles
    const roles = await prisma.role.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        displayName: true,
        level: true,
        isSystem: true
      },
      orderBy: { level: 'desc' }
    });
    
    console.log('\n2️⃣  ROLE NAMES (dapat digunakan di access_groups):');
    console.log('─'.repeat(60));
    roles.forEach(role => {
      const badge = role.isSystem ? '⭐ System' : '  Custom';
      console.log(`   "${role.name.padEnd(25)}" - ${role.displayName.padEnd(30)} ${badge} (level ${role.level})`);
    });
    
    console.log('\n\n💡 USAGE EXAMPLES:');
    console.log('─'.repeat(60));
    console.log('-- Add single group:');
    console.log('UPDATE documents SET access_groups = \'["Legal"]\' WHERE id = \'xxx\';');
    console.log('\n-- Add single role:');
    console.log('UPDATE documents SET access_groups = \'["editor"]\' WHERE id = \'xxx\';');
    console.log('\n-- Add multiple groups:');
    console.log('UPDATE documents SET access_groups = \'["Legal", "Finance", "HR"]\' WHERE id = \'xxx\';');
    console.log('\n-- Add mix of groups and roles:');
    console.log('UPDATE documents SET access_groups = \'["Legal", "editor", "manager"]\' WHERE id = \'xxx\';');
    console.log('\n-- Clear all access (empty array):');
    console.log('UPDATE documents SET access_groups = \'[]\' WHERE id = \'xxx\';');
    
    console.log('\n\n📊 CURRENT DOCUMENT ACCESS GROUPS:');
    console.log('─'.repeat(60));
    
    const documents = await prisma.document.findMany({
      where: {
        accessGroups: {
          isEmpty: false
        }
      },
      select: {
        id: true,
        title: true,
        accessGroups: true,
        isPublic: true
      },
      take: 10
    });
    
    if (documents.length === 0) {
      console.log('No documents with access groups set');
    } else {
      documents.forEach(doc => {
        console.log(`\n📄 ${doc.title}`);
        console.log(`   Public: ${doc.isPublic ? '✅ Yes' : '❌ No'}`);
        console.log(`   Access Groups: [${doc.accessGroups.join(', ')}]`);
      });
    }
    
    console.log('\n\n✅ Access Control Logic:');
    console.log('─'.repeat(60));
    console.log('User can access document if ANY of these conditions are true:');
    console.log('  1. document.isPublic = true');
    console.log('  2. User is document owner (createdById)');
    console.log('  3. User\'s Group ID is in accessGroups');
    console.log('  4. User\'s Group Name is in accessGroups');
    console.log('  5. User\'s Role Name is in accessGroups');
    console.log('  6. User has admin or org_administrator role (bypass)');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();

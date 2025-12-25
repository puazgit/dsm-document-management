import { prisma } from './src/lib/prisma';

(async () => {
  try {
    // Find BCMS document
    const bcmsDoc = await prisma.document.findFirst({
      where: {
        title: {
          contains: 'Pedoman BCMS',
          mode: 'insensitive'
        }
      },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });
    
    if (!bcmsDoc) {
      console.log('❌ Document "Pedoman BCMS" not found');
      return;
    }
    
    // Get legal user
    const legalUser = await prisma.user.findUnique({
      where: { email: 'legal@dsm.com' },
      include: { group: true }
    });
    
    if (!legalUser) {
      console.log('❌ User legal@dsm.com not found');
      return;
    }
    
    console.log('📄 Document Info:');
    console.log('- ID:', bcmsDoc.id);
    console.log('- Title:', bcmsDoc.title);
    console.log('- File:', bcmsDoc.fileName);
    console.log('- Is Public:', bcmsDoc.isPublic);
    console.log('- Access Groups:', JSON.stringify(bcmsDoc.accessGroups));
    console.log('- Owner ID:', bcmsDoc.createdById);
    console.log('- Owner Email:', bcmsDoc.createdBy.email);
    
    console.log('\n👤 Legal User Info:');
    console.log('- ID:', legalUser.id);
    console.log('- Email:', legalUser.email);
    console.log('- Group ID:', legalUser.groupId);
    console.log('- Group Name:', legalUser.group?.name);
    
    console.log('\n🔍 Access Check:');
    const isPublic = bcmsDoc.isPublic;
    const isOwner = bcmsDoc.createdById === legalUser.id;
    const hasGroupIdAccess = bcmsDoc.accessGroups.includes(legalUser.groupId || '');
    const hasGroupNameAccess = bcmsDoc.accessGroups.includes(legalUser.group?.name || '');
    
    console.log('- Is Public:', isPublic ? '✅ YES' : '❌ NO');
    console.log('- Is Owner:', isOwner ? '✅ YES' : '❌ NO');
    console.log('- Has Group ID Access:', hasGroupIdAccess ? '✅ YES' : '❌ NO');
    console.log('- Has Group Name Access:', hasGroupNameAccess ? '✅ YES' : '❌ NO');
    console.log('- Access Groups Length:', bcmsDoc.accessGroups.length);
    
    const shouldHaveAccess = isPublic || isOwner || hasGroupIdAccess || hasGroupNameAccess;
    console.log('\n🎯 Final Result:', shouldHaveAccess ? '✅ SHOULD HAVE ACCESS' : '❌ ACCESS DENIED');
    
    if (!shouldHaveAccess) {
      console.log('\n💡 Solution Options:');
      console.log('1. Set document as public:');
      console.log('   UPDATE documents SET is_public = true WHERE id = \'' + bcmsDoc.id + '\';');
      console.log('\n2. Add Legal group to access groups:');
      console.log('   UPDATE documents SET access_groups = \'["Legal"]\' WHERE id = \'' + bcmsDoc.id + '\';');
      console.log('\n3. Add editor role to access groups:');
      console.log('   UPDATE documents SET access_groups = \'["editor"]\' WHERE id = \'' + bcmsDoc.id + '\';');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();

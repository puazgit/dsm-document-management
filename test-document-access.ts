import { prisma } from './src/lib/prisma';

(async () => {
  try {
    // Get legal user
    const legalUser = await prisma.user.findUnique({
      where: { email: 'legal@dsm.com' },
      include: { group: true }
    });
    
    if (!legalUser) {
      console.log('❌ User legal@dsm.com not found');
      return;
    }
    
    console.log('✅ Legal User Info:');
    console.log('- User ID:', legalUser.id);
    console.log('- Group ID:', legalUser.groupId);
    console.log('- Group Name:', legalUser.group?.name);
    
    // Get all documents
    const documents = await prisma.document.findMany({
      select: {
        id: true,
        title: true,
        fileName: true,
        isPublic: true,
        accessGroups: true,
        createdById: true,
        createdBy: {
          select: {
            email: true,
            firstName: true,
            lastName: true
          }
        }
      },
      take: 10,
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`\n📄 Found ${documents.length} recent documents\n`);
    
    documents.forEach((doc, index) => {
      const isOwner = doc.createdById === legalUser.id;
      const hasGroupIdAccess = doc.accessGroups.includes(legalUser.groupId || '');
      const hasGroupNameAccess = doc.accessGroups.includes(legalUser.group?.name || '');
      
      const hasAccess = doc.isPublic || isOwner || hasGroupIdAccess || hasGroupNameAccess;
      
      console.log(`${index + 1}. ${doc.title}`);
      console.log(`   File: ${doc.fileName}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Owner: ${doc.createdBy.email}`);
      console.log(`   Public: ${doc.isPublic}`);
      console.log(`   Access Groups: [${doc.accessGroups.join(', ')}]`);
      console.log(`   🔍 Access Check:`);
      console.log(`      - Is Owner: ${isOwner}`);
      console.log(`      - Has Group ID Access: ${hasGroupIdAccess}`);
      console.log(`      - Has Group Name Access: ${hasGroupNameAccess}`);
      console.log(`      - Final Access: ${hasAccess ? '✅ YES' : '❌ NO'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();

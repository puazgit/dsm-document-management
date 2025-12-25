import { prisma } from './src/lib/prisma';

(async () => {
  try {
    console.log('🔧 Updating document access to include Legal group...\n');
    
    // Get all documents
    const documents = await prisma.document.findMany({
      where: {
        OR: [
          { accessGroups: { has: 'manager' } },
          { accessGroups: { has: 'tik' } }
        ]
      },
      select: {
        id: true,
        title: true,
        accessGroups: true
      }
    });
    
    console.log(`Found ${documents.length} documents to update\n`);
    
    for (const doc of documents) {
      const updatedAccessGroups = [...new Set([...doc.accessGroups, 'Legal'])];
      
      await prisma.document.update({
        where: { id: doc.id },
        data: { accessGroups: updatedAccessGroups }
      });
      
      console.log(`✅ Updated: ${doc.title}`);
      console.log(`   Before: [${doc.accessGroups.join(', ')}]`);
      console.log(`   After:  [${updatedAccessGroups.join(', ')}]\n`);
    }
    
    console.log('✅ All documents updated successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();

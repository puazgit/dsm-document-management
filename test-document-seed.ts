import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  console.log('Testing Document creation...');
  
  try {
    const user = await prisma.user.findFirst();
    const documentType = await prisma.documentType.findFirst();
    
    if (!user || !documentType) {
      console.log('Missing user or document type');
      return;
    }

    const doc = await prisma.document.create({
      data: {
        title: 'Test Document',
        description: 'Test description',
        fileName: 'test.pdf',
        filePath: '/uploads/test.pdf',
        fileSize: BigInt(1000),
        fileType: 'pdf',
        mimeType: 'application/pdf',
        version: '1.0',
        status: 'DRAFT',
        accessGroups: ['administrator'],
        tags: ['test'],
        documentTypeId: documentType.id,
        createdById: user.id
      }
    });

    console.log('✅ Document created:', doc.id);
    
    // Clean up
    await prisma.document.delete({ where: { id: doc.id } });
    console.log('✅ Test cleanup completed');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();

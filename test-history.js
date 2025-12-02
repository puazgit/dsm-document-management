const { PrismaClient } = require('@prisma/client');

async function testHistory() {
  const prisma = new PrismaClient();
  try {
    console.log('DocumentHistory model available:', !!prisma.documentHistory);
    
    const doc = await prisma.document.findFirst();
    if (doc) {
      console.log('Test document:', doc.id, doc.title);
      
      const history = await prisma.documentHistory.findMany({
        where: { documentId: doc.id },
        include: {
          changedBy: {
            select: { email: true, firstName: true, lastName: true }
          }
        }
      });
      
      console.log('History entries:', history.length);
      history.forEach(h => {
        console.log('- Action:', h.action, 'by', h.changedBy.email, 'at', h.createdAt);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testHistory();
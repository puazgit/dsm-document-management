const { PrismaClient } = require('@prisma/client');

async function createSampleHistory() {
  const prisma = new PrismaClient();
  try {
    // Get first document and admin user
    const document = await prisma.document.findFirst();
    const user = await prisma.user.findFirst({
      where: {
        userRoles: {
          some: {
            role: {
              name: 'admin'
            }
          }
        }
      }
    });
    
    if (!document || !user) {
      console.log('No document or admin user found');
      return;
    }

    // Create some sample history entries
    const historyEntries = [
      {
        documentId: document.id,
        action: 'created',
        changeReason: `Document "${document.title}" was created`,
        changedById: user.id
      },
      {
        documentId: document.id,
        action: 'status_changed',
        statusFrom: 'DRAFT',
        statusTo: 'PENDING_REVIEW',
        changeReason: 'Document status changed for review process',
        changedById: user.id
      },
      {
        documentId: document.id,
        action: 'updated',
        fieldChanged: 'description',
        oldValue: 'Old description',
        newValue: 'Updated description with more details',
        changeReason: 'Updated document description',
        changedById: user.id
      },
      {
        documentId: document.id,
        action: 'status_changed',
        statusFrom: 'PENDING_REVIEW',
        statusTo: 'PUBLISHED',
        changeReason: 'Document approved and published',
        changedById: user.id
      },
      {
        documentId: document.id,
        action: 'file_replaced',
        fieldChanged: 'fileName',
        oldValue: 'old-file.pdf',
        newValue: document.fileName,
        changeReason: 'Document file was updated',
        changedById: user.id
      }
    ];

    for (const entry of historyEntries) {
      await prisma.documentHistory.create({
        data: {
          ...entry,
          createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Random time in last 7 days
        }
      });
    }

    console.log(`Created ${historyEntries.length} history entries for document: ${document.title}`);
    
    // Show the created entries
    const created = await prisma.documentHistory.findMany({
      where: { documentId: document.id },
      include: { changedBy: { select: { email: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('\nCreated entries:');
    created.forEach(entry => {
      console.log(`- ${entry.action}: ${entry.changeReason || 'No reason'} by ${entry.changedBy.email}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createSampleHistory();
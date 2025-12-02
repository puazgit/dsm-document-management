const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function createDraftDocument() {
  try {
    // First, get the user (kadiv) to create the document
    const user = await prisma.user.findFirst({
      where: {
        email: 'kadiv@dsm.com'
      }
    });

    if (!user) {
      console.log('User not found: kadiv@dsm.com');
      return;
    }

    // Get any document type
    const documentType = await prisma.documentType.findFirst({
      where: {
        isActive: true
      }
    });

    if (!documentType) {
      console.log('No active document types found');
      return;
    }

    // Create a DRAFT document
    const draftDocument = await prisma.document.create({
      data: {
        title: 'Test Draft Document for Workflow',
        description: 'This is a test document in DRAFT status to verify workflow transitions',
        fileName: 'test-draft.pdf',
        filePath: '/uploads/test-draft.pdf',
        fileSize: 1024,
        fileType: 'pdf',
        mimeType: 'application/pdf',
        version: '1',
        status: 'DRAFT',
        isPublic: false,
        accessGroups: ['org_kadiv'], // Accessible to kadiv's group
        tags: ['test', 'workflow'],
        metadata: {},
        documentTypeId: documentType.id,
        createdById: user.id,
        updatedById: user.id
      }
    });

    console.log('✅ DRAFT document created successfully:');
    console.log({
      id: draftDocument.id,
      title: draftDocument.title,
      status: draftDocument.status,
      created_by: user.email,
      access_groups: draftDocument.accessGroups
    });

    console.log('\n📋 Now you can test the workflow by:');
    console.log('1. Going to http://localhost:3001/documents');
    console.log('2. Finding the document "Test Draft Document for Workflow"');
    console.log('3. Looking for the status dropdown/workflow options');
    console.log('4. Expected transitions: DRAFT → PENDING_REVIEW or DRAFT → ARCHIVED');

  } catch (error) {
    console.error('❌ Error creating draft document:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDraftDocument();
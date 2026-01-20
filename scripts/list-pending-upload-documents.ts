import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listPendingUploadDocuments() {
  console.log('📋 Documents Waiting for File Upload\n');
  console.log('='.repeat(90));

  const documents = await prisma.document.findMany({
    where: {
      fileName: '',
      OR: [
        { metadata: { path: ['fileStatus'], equals: 'pending-upload' } },
        { filePath: '' }
      ]
    },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      documentType: {
        select: {
          name: true,
          icon: true
        }
      },
      createdBy: {
        select: {
          firstName: true,
          lastName: true,
          email: true
        }
      },
      tags: true,
      metadata: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  });

  if (documents.length === 0) {
    console.log('✅ No documents waiting for file upload.\n');
    return;
  }

  console.log(`Found ${documents.length} document(s) without files:\n`);

  documents.forEach((doc, index) => {
    const metadata = doc.metadata as any;
    console.log(`${index + 1}. ${doc.documentType.icon || '📄'} ${doc.title}`);
    console.log(`   ID:          ${doc.id}`);
    console.log(`   Type:        ${doc.documentType.name}`);
    console.log(`   Status:      ${doc.status}`);
    console.log(`   Created by:  ${doc.createdBy.firstName} ${doc.createdBy.lastName}`);
    console.log(`   Created at:  ${doc.createdAt.toISOString()}`);
    
    if (metadata?.documentNumber) {
      console.log(`   Doc Number:  ${metadata.documentNumber}`);
    }
    
    if (metadata?.department) {
      console.log(`   Department:  ${metadata.department}`);
    }

    if (doc.tags && doc.tags.length > 0) {
      console.log(`   Tags:        ${doc.tags.join(', ')}`);
    }

    console.log(`   Upload URL:  /documents (Edit → Upload File)`);
    console.log('-'.repeat(90));
  });

  console.log(`\nTotal: ${documents.length} documents pending file upload\n`);

  // Group by document type
  const groupedByType = documents.reduce((acc, doc) => {
    const typeName = doc.documentType.name;
    if (!acc[typeName]) {
      acc[typeName] = 0;
    }
    acc[typeName]++;
    return acc;
  }, {} as Record<string, number>);

  console.log('📊 Summary by Document Type:');
  Object.entries(groupedByType).forEach(([type, count]) => {
    console.log(`   ${type}: ${count}`);
  });

  console.log('');
}

listPendingUploadDocuments()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

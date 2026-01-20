import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Fetching documents...');
  
  // Get all documents
  const documents = await prisma.document.findMany({
    select: { id: true, title: true, parentDocumentId: true },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  console.log('\nAvailable documents:');
  documents.forEach((doc, index) => {
    console.log(`${index + 1}. ${doc.title} (ID: ${doc.id})`);
  });

  if (documents.length < 2) {
    console.log('\nNeed at least 2 documents to create hierarchy');
    return;
  }

  // Use first document as parent, second and third as children
  const parentDoc = documents[0]!;
  const childDocs = documents.slice(1, 3); // Get 2 children

  console.log(`\nSetting up hierarchy:`);
  console.log(`Parent: ${parentDoc.title}`);
  console.log(`Children:`);
  childDocs.forEach(doc => console.log(`  - ${doc.title}`));

  // Update children to have parent
  for (let i = 0; i < childDocs.length; i++) {
    const child = childDocs[i]!;
    const hierarchyPath = `${parentDoc.id}/${child.id}`;
    
    await prisma.document.update({
      where: { id: child.id },
      data: {
        parentDocumentId: parentDoc.id,
        hierarchyLevel: 1,
        hierarchyPath: hierarchyPath,
        sortOrder: i
      }
    });
    
    console.log(`✓ Updated ${child.title} as child of ${parentDoc.title}`);
  }

  // Verify the hierarchy
  console.log('\n--- Verifying Hierarchy ---');
  const parentWithChildren = await prisma.document.findUnique({
    where: { id: parentDoc.id },
    include: {
      childDocuments: {
        select: {
          id: true,
          title: true,
          hierarchyLevel: true,
          hierarchyPath: true
        }
      }
    }
  });

  console.log(`\nParent: ${parentWithChildren?.title}`);
  console.log(`Children (${parentWithChildren?.childDocuments.length}):`);
  parentWithChildren?.childDocuments.forEach(child => {
    console.log(`  - ${child.title}`);
    console.log(`    Level: ${child.hierarchyLevel}, Path: ${child.hierarchyPath}`);
  });

  console.log('\n✓ Hierarchy created successfully!');
  console.log('\nYou can now view the hierarchy at: http://localhost:3000/documents');
  console.log('Toggle to "Tree View" to see the parent-child relationship.');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

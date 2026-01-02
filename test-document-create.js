/**
 * Test Document Creation - Verify isPublic field removal
 * This script tests that documents can be created without the isPublic field
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDocumentCreation() {
  console.log('🧪 Testing Document Creation without isPublic field...\n');
  
  try {
    // Get a test user
    const user = await prisma.user.findFirst({
      where: { isActive: true }
    });
    
    if (!user) {
      console.error('❌ No active user found in database');
      return;
    }
    
    console.log(`✓ Found test user: ${user.email}`);
    
    // Get a document type
    const docType = await prisma.documentType.findFirst({
      where: { isActive: true }
    });
    
    if (!docType) {
      console.error('❌ No active document type found');
      return;
    }
    
    console.log(`✓ Found document type: ${docType.name}`);
    
    // Try to create a document WITHOUT isPublic field
    const testDoc = await prisma.document.create({
      data: {
        title: 'Test Document - No isPublic Field',
        fileName: 'test.pdf',
        filePath: '/test/test.pdf',
        documentTypeId: docType.id,
        createdById: user.id,
      },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
      }
    });
    
    console.log('\n✅ Document created successfully!');
    console.log('Document details:');
    console.log(`   ID: ${testDoc.id}`);
    console.log(`   Title: ${testDoc.title}`);
    console.log(`   Status: ${testDoc.status}`);
    console.log(`   Access Groups: ${testDoc.accessGroups.length === 0 ? 'None (accessible based on capabilities)' : testDoc.accessGroups.join(', ')}`);
    console.log(`   Created: ${testDoc.createdAt.toISOString()}`);
    
    // Clean up - delete test document
    await prisma.document.delete({
      where: { id: testDoc.id }
    });
    
    console.log('\n✓ Test document cleaned up');
    console.log('\n🎉 SUCCESS: Document creation works without isPublic field!');
    
  } catch (error) {
    console.error('\n❌ ERROR during document creation:');
    console.error(error.message);
    if (error.code) {
      console.error(`Error Code: ${error.code}`);
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testDocumentCreation()
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });

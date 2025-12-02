const { PrismaClient } = require('@prisma/client');

async function testDocumentVersioning() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Testing Document Versioning System...\n');
    
    // 1. Get documents with multiple versions
    const documentsWithHistory = await prisma.document.findMany({
      include: {
        history: {
          where: {
            action: 'file_replaced'
          },
          orderBy: { createdAt: 'desc' },
          take: 3,
          include: {
            changedBy: {
              select: { firstName: true, lastName: true, email: true }
            }
          }
        },
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      },
      where: {
        history: {
          some: {
            action: 'file_replaced'
          }
        }
      },
      take: 3
    });
    
    console.log(`📊 Documents with File History: ${documentsWithHistory.length}\n`);
    
    documentsWithHistory.forEach((doc, index) => {
      console.log(`${index + 1}. 📄 ${doc.title}`);
      console.log(`   Current File: ${doc.fileName}`);
      console.log(`   Current Version: ${doc.version}`);
      console.log(`   Current Path: ${doc.filePath}`);
      console.log('');
      
      // Show document versions
      console.log(`   📚 Document Versions (${doc.versions.length}):`);
      doc.versions.forEach((version, vIndex) => {
        console.log(`   ${vIndex + 1}. Version ${version.version}`);
        console.log(`      File: ${version.fileName}`);
        console.log(`      Path: ${version.filePath}`);
        console.log(`      Created: ${version.createdAt.toISOString()}`);
        console.log(`      Changes: ${version.changes || 'No notes'}`);
        console.log('');
      });
      
      // Show file change history
      console.log(`   🔄 File Change History (${doc.history.length}):`);
      doc.history.forEach((history, hIndex) => {
        console.log(`   ${hIndex + 1}. ${history.action} - ${history.createdAt.toISOString()}`);
        console.log(`      Reason: ${history.changeReason || 'No reason'}`);
        console.log(`      Changed by: ${history.changedBy.firstName} ${history.changedBy.lastName}`);
        
        if (history.metadata) {
          try {
            const metadata = typeof history.metadata === 'string' 
              ? JSON.parse(history.metadata) 
              : history.metadata;
              
            if (metadata.oldFile && metadata.newFile) {
              console.log(`      Old File: ${metadata.oldFile.fileName} (v${metadata.oldFile.version})`);
              console.log(`      New File: ${metadata.newFile.fileName} (v${metadata.newFile.version})`);
              console.log(`      Old Path: ${metadata.oldFile.filePath}`);
              console.log(`      New Path: ${metadata.newFile.filePath}`);
            }
          } catch (e) {
            console.log(`      Metadata: ${JSON.stringify(history.metadata).substring(0, 100)}...`);
          }
        }
        console.log('');
      });
      
      console.log('─'.repeat(60));
      console.log('');
    });
    
    // 2. Test API endpoint structure
    if (documentsWithHistory.length > 0) {
      const testDoc = documentsWithHistory[0];
      if (testDoc.versions.length > 0) {
        const testVersion = testDoc.versions[0];
        console.log('🔗 API Endpoint URLs for Testing:');
        console.log(`Current Document: /api/documents/${testDoc.id}`);
        console.log(`Version Access: /api/documents/${testDoc.id}/version/${testVersion.version}`);
        console.log('');
        
        // Simulate what frontend will show
        console.log('🖥️  Frontend History Display Simulation:');
        testDoc.history.forEach((entry, index) => {
          console.log(`${index + 1}. File replaced: ${entry.changeReason}`);
          console.log(`   By: ${entry.changedBy.firstName} ${entry.changedBy.lastName}`);
          console.log(`   Date: ${entry.createdAt.toDateString()}`);
          
          if (entry.metadata) {
            try {
              const metadata = typeof entry.metadata === 'string' 
                ? JSON.parse(entry.metadata) 
                : entry.metadata;
                
              if (metadata.oldFile) {
                console.log(`   🔗 Previous Version: ${metadata.oldFile.fileName}`);
                console.log(`      Link: /api/documents/${testDoc.id}/version/${metadata.oldFile.version}`);
              }
              if (metadata.newFile) {
                console.log(`   🔗 Current Version: ${metadata.newFile.fileName}`);  
                console.log(`      Link: /api/documents/${testDoc.id}/version/${metadata.newFile.version}`);
              }
            } catch (e) {
              console.log(`   ⚠️  Could not parse metadata`);
            }
          }
          console.log('');
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testDocumentVersioning();
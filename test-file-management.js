const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function testFileManagement() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Testing Document File Management...\n');
    
    // 1. Get all documents ordered by updatedAt desc
    const documents = await prisma.document.findMany({
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        fileName: true,
        filePath: true,
        version: true,
        updatedAt: true,
        createdAt: true
      },
      take: 5
    });
    
    console.log('📋 Recent Documents (ordered by updatedAt):');
    documents.forEach((doc, index) => {
      console.log(`${index + 1}. ${doc.title}`);
      console.log(`   File: ${doc.fileName}`);
      console.log(`   Version: ${doc.version}`);
      console.log(`   Updated: ${doc.updatedAt.toISOString()}`);
      console.log(`   Created: ${doc.createdAt.toISOString()}`);
      
      // Check if file exists
      if (doc.filePath) {
        const fullPath = path.join(process.cwd(), doc.filePath);
        const exists = fs.existsSync(fullPath);
        console.log(`   File exists: ${exists ? '✅' : '❌'} (${doc.filePath})`);
      }
      console.log('');
    });
    
    // 2. Check upload directory structure
    const uploadsDir = path.join(process.cwd(), 'uploads', 'documents');
    console.log(`📁 Upload Directory: ${uploadsDir}`);
    
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      console.log(`📊 Files in upload directory: ${files.length}`);
      
      files.slice(0, 10).forEach((file, index) => {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        console.log(`${index + 1}. ${file} (${(stats.size / 1024).toFixed(2)} KB, ${stats.mtime.toISOString()})`);
      });
      
      if (files.length > 10) {
        console.log(`   ... and ${files.length - 10} more files`);
      }
    } else {
      console.log('❌ Upload directory does not exist');
    }
    
    // 3. Check document history for file changes
    console.log('\n📊 Recent File Change History:');
    const fileHistory = await prisma.documentHistory.findMany({
      where: {
        action: {
          in: ['file_uploaded', 'file_replaced']
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        document: {
          select: { title: true }
        },
        changedBy: {
          select: { email: true, firstName: true, lastName: true }
        }
      }
    });
    
    fileHistory.forEach((entry, index) => {
      console.log(`${index + 1}. ${entry.action} on "${entry.document.title}"`);
      console.log(`   By: ${entry.changedBy.firstName} ${entry.changedBy.lastName} (${entry.changedBy.email})`);
      console.log(`   Reason: ${entry.changeReason || 'No reason provided'}`);
      console.log(`   Date: ${entry.createdAt.toISOString()}`);
      if (entry.metadata) {
        console.log(`   Metadata: ${JSON.stringify(entry.metadata)}`);
      }
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testFileManagement();
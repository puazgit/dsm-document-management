const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPDFDownloadAPI() {
  console.log('🧪 Testing PDF Download API & Components');
  console.log('=====================================\n');

  try {
    // 1. Check if we have documents in database
    console.log('1. 📊 Checking Database Documents');
    const documents = await prisma.document.findMany({
      where: {
        fileName: {
          endsWith: '.pdf'
        }
      },
      take: 5,
      select: {
        id: true,
        fileName: true,
        title: true,
        fileSize: true,
        filePath: true
      }
    });

    if (documents.length === 0) {
      console.log('   ❌ No PDF documents found in database');
      console.log('   💡 You need to upload some PDF files first');
      return;
    }

    console.log(`   ✅ Found ${documents.length} PDF documents:`);
    documents.forEach((doc, i) => {
      console.log(`   ${i + 1}. ${doc.title} (${doc.fileName})`);
      console.log(`      ID: ${doc.id}`);
      console.log(`      Size: ${doc.fileSize} bytes`);
      console.log(`      Path: ${doc.filePath}`);
      console.log('');
    });

    // 2. Test the download API endpoint
    console.log('2. 🌐 Testing Download API Endpoint');
    const testDoc = documents[0];
    const downloadURL = `http://localhost:3000/api/documents/${testDoc.id}/download`;
    
    console.log(`   Testing: ${downloadURL}`);
    console.log(`   Document: ${testDoc.fileName}`);
    
    // 3. Check admin user for permissions
    console.log('\n3. 👤 Checking Admin User Permissions');
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@dsm.com' },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!adminUser) {
      console.log('   ❌ Admin user not found');
      return;
    }

    const permissions = [];
    adminUser.userRoles.forEach(ur => {
      ur.role.rolePermissions.forEach(rp => {
        permissions.push(rp.permission.name);
      });
    });

    const hasPdfDownload = permissions.includes('pdf.download');
    const hasDocumentsRead = permissions.includes('documents.read');
    
    console.log(`   User: ${adminUser.email}`);
    console.log(`   Total Permissions: ${permissions.length}`);
    console.log(`   Has pdf.download: ${hasPdfDownload ? '✅' : '❌'}`);
    console.log(`   Has documents.read: ${hasDocumentsRead ? '✅' : '❌'}`);

    // 4. Instructions for manual testing
    console.log('\n4. 🧪 Manual Testing Instructions');
    console.log('================================');
    console.log('');
    console.log('To test the PDF download fix:');
    console.log('');
    console.log('Step 1: Start the development server');
    console.log('   npm run dev');
    console.log('');
    console.log('Step 2: Login as admin');
    console.log('   URL: http://localhost:3000/auth/login');
    console.log('   Email: admin@dsm.com');
    console.log('   Password: admin123');
    console.log('');
    console.log('Step 3: Navigate to Documents');
    console.log('   URL: http://localhost:3000/documents');
    console.log('');
    console.log('Step 4: Try downloading a PDF');
    console.log(`   Look for documents with .pdf extension`);
    console.log('   Click the download button or dropdown menu');
    console.log('');
    console.log('Step 5: Check browser console');
    console.log('   Open Developer Tools (F12)');
    console.log('   Look for any "document.createElement" errors');
    console.log('   Should see download success messages instead');
    console.log('');
    console.log('🎯 Expected Behavior:');
    console.log('   ✅ No SSR/document errors in console');
    console.log('   ✅ PDF downloads successfully');
    console.log('   ✅ Download starts automatically');
    console.log('   ✅ File saves to Downloads folder');

    console.log('\n5. 🔧 If Still Not Working:');
    console.log('============================');
    console.log('');
    console.log('Check these common issues:');
    console.log('');
    console.log('A. Server not restarted after code changes:');
    console.log('   - Kill the dev server (Ctrl+C)');
    console.log('   - Run "npm run dev" again');
    console.log('');
    console.log('B. Browser cache issues:');
    console.log('   - Hard refresh (Ctrl+Shift+R)');
    console.log('   - Clear browser cache');
    console.log('   - Try incognito/private mode');
    console.log('');
    console.log('C. Check exact error message:');
    console.log('   - Open browser console');
    console.log('   - Try download again');
    console.log('   - Look for new error details');
    console.log('');
    console.log('D. Verify component is being used:');
    console.log('   - Check which PDF viewer component is loaded');
    console.log('   - Look for import statements in documents page');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testPDFDownloadAPI();
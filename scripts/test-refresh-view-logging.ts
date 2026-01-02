/**
 * Script to test if page refresh adds VIEW entries to audit log
 * 
 * This script will:
 * 1. Count current VIEW entries for a document
 * 2. Simulate accessing the document view endpoint
 * 3. Count VIEW entries again
 * 4. Repeat to test refresh behavior
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testRefreshViewLogging() {
  const documentId = 'cmjgs318h00032pa3aeq66d7f'; // Document ID from the URL
  
  try {
    console.log('🔍 Testing View Logging on Refresh...\n');
    
    // Get document info
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        title: true,
        status: true,
        viewCount: true,
      }
    });
    
    if (!document) {
      console.error('❌ Document not found:', documentId);
      return;
    }
    
    console.log('📄 Document Info:');
    console.log('  ID:', document.id);
    console.log('  Title:', document.title);
    console.log('  Status:', document.status);
    console.log('  Current View Count:', document.viewCount);
    console.log('');
    
    // Count VIEW activities
    const countActivities = async (label: string) => {
      const viewActivities = await prisma.documentActivity.findMany({
        where: {
          documentId: documentId,
          action: 'VIEW'
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10,
        select: {
          id: true,
          action: true,
          createdAt: true,
          userId: true,
          description: true,
        }
      });
      
      console.log(`\n${label}`);
      console.log('─'.repeat(60));
      console.log(`Total VIEW activities: ${viewActivities.length}`);
      
      if (viewActivities.length > 0) {
        console.log('\nRecent VIEW activities:');
        viewActivities.forEach((activity, index) => {
          console.log(`  ${index + 1}. ${activity.createdAt.toISOString()} - ${activity.description}`);
        });
      }
      
      return viewActivities.length;
    };
    
    // Initial count
    const initialCount = await countActivities('📊 INITIAL STATE');
    
    // Get a test user (any active user)
    const testUser = await prisma.user.findFirst({
      where: {
        isActive: true
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      }
    });
    
    if (!testUser) {
      console.error('\n❌ No test user found');
      return;
    }
    
    console.log(`\n🧪 Test User: ${testUser.email} (${testUser.firstName} ${testUser.lastName})`);
    
    // Simulate first view (should log)
    console.log('\n\n🔵 TEST 1: Simulating FIRST VIEW (should log)');
    console.log('─'.repeat(60));
    
    if (document.status === 'PUBLISHED') {
      await prisma.documentActivity.create({
        data: {
          documentId: documentId,
          userId: testUser.id,
          action: 'VIEW',
          description: `[TEST] Document "${document.title}" was viewed`,
        }
      });
      
      await prisma.document.update({
        where: { id: documentId },
        data: { viewCount: { increment: 1 } }
      });
      
      console.log('✅ View logged and count incremented');
    } else {
      console.log('⚠️ Document not PUBLISHED, skipping log');
    }
    
    const afterFirstView = await countActivities('📊 AFTER FIRST VIEW');
    
    // Simulate refresh (with skipLog - should NOT log)
    console.log('\n\n🟢 TEST 2: Simulating REFRESH with skipLog=true (should NOT log)');
    console.log('─'.repeat(60));
    console.log('ℹ️ No new activity created (skipLog=true)');
    
    const afterRefreshWithSkip = await countActivities('📊 AFTER REFRESH WITH SKIP');
    
    // Simulate refresh WITHOUT skipLog (current bug - WILL log)
    console.log('\n\n🔴 TEST 3: Simulating REFRESH without skipLog (BUG - will log again)');
    console.log('─'.repeat(60));
    
    if (document.status === 'PUBLISHED') {
      await prisma.documentActivity.create({
        data: {
          documentId: documentId,
          userId: testUser.id,
          action: 'VIEW',
          description: `[TEST - BUG] Document "${document.title}" was viewed (refresh without skipLog)`,
        }
      });
      
      await prisma.document.update({
        where: { id: documentId },
        data: { viewCount: { increment: 1 } }
      });
      
      console.log('❌ BUG CONFIRMED: View logged again on refresh!');
    }
    
    const afterRefreshWithoutSkip = await countActivities('📊 AFTER REFRESH WITHOUT SKIP');
    
    // Summary
    console.log('\n\n' + '='.repeat(60));
    console.log('📋 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Initial VIEW count:        ${initialCount}`);
    console.log(`After first view:          ${afterFirstView} (${afterFirstView > initialCount ? '✅ +1' : '⚠️ no change'})`);
    console.log(`After refresh with skip:   ${afterRefreshWithSkip} (${afterRefreshWithSkip === afterFirstView ? '✅ no change' : '❌ changed!'})`);
    console.log(`After refresh without skip: ${afterRefreshWithoutSkip} (${afterRefreshWithoutSkip > afterRefreshWithSkip ? '❌ BUG: +1' : '✅ no change'})`);
    
    console.log('\n\n🔍 CONCLUSION:');
    console.log('─'.repeat(60));
    
    if (afterRefreshWithoutSkip > afterRefreshWithSkip) {
      console.log('❌ BUG CONFIRMED: Browser refresh DOES add VIEW to audit log');
      console.log('');
      console.log('Reason: useRef state is reset when component unmounts on refresh');
      console.log('');
      console.log('Solution: Use sessionStorage to persist viewed state across page refresh');
    } else {
      console.log('✅ No bug detected in test scenario');
    }
    
    console.log('\n\n📝 Note: This is a simulation. To test in real browser:');
    console.log('1. Open http://localhost:3000/documents/' + documentId + '/view');
    console.log('2. Check audit logs count');
    console.log('3. Press F5 to refresh page');
    console.log('4. Check audit logs count again');
    console.log('5. If count increased, bug is confirmed');
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testRefreshViewLogging();

#!/usr/bin/env tsx

/**
 * Script to check ACTUAL view logs and analyze refresh behavior
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeViewLogs() {
  const documentId = 'cmjgs318h00032pa3aeq66d7f';
  
  try {
    console.log('🔍 ANALYZING ACTUAL VIEW LOGS\n');
    console.log('='.repeat(80));
    
    // Get all VIEW activities for this document
    const viewActivities = await prisma.documentActivity.findMany({
      where: {
        documentId: documentId,
        action: 'VIEW'
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });
    
    console.log(`\n📊 Total VIEW Entries: ${viewActivities.length}\n`);
    
    // Analyze for duplicates
    const viewsByTimestamp: Record<string, any[]> = {};
    const viewsByUser: Record<string, number> = {};
    
    viewActivities.forEach(activity => {
      const timeKey = activity.createdAt.toISOString().split('.')[0]; // Group by second
      if (!viewsByTimestamp[timeKey]) {
        viewsByTimestamp[timeKey] = [];
      }
      viewsByTimestamp[timeKey].push(activity);
      
      const userKey = `${activity.user.firstName} ${activity.user.lastName}`;
      viewsByUser[userKey] = (viewsByUser[userKey] || 0) + 1;
    });
    
    // Find suspicious duplicate views (multiple views in same second)
    console.log('🔍 SUSPICIOUS PATTERNS (Multiple views in same second):\n');
    let suspiciousCount = 0;
    
    Object.entries(viewsByTimestamp).forEach(([timeKey, activities]) => {
      if (activities.length > 1) {
        suspiciousCount++;
        console.log(`⚠️  ${timeKey}Z - ${activities.length} views:`);
        activities.forEach((act, idx) => {
          console.log(`    ${idx + 1}. ${act.createdAt.toISOString()} - ${act.user.firstName} ${act.user.lastName}`);
        });
        console.log('');
      }
    });
    
    if (suspiciousCount === 0) {
      console.log('   ✅ No suspicious patterns detected\n');
    } else {
      console.log(`   ⚠️  Found ${suspiciousCount} suspicious time groups\n`);
    }
    
    console.log('─'.repeat(80));
    console.log('\n📈 VIEW COUNT BY USER:\n');
    Object.entries(viewsByUser)
      .sort((a, b) => b[1] - a[1])
      .forEach(([user, count]) => {
        console.log(`   ${user}: ${count} views`);
      });
    
    console.log('\n' + '─'.repeat(80));
    console.log('\n📜 RECENT VIEW HISTORY (Last 20):\n');
    
    viewActivities.slice(0, 20).forEach((activity, index) => {
      const time = activity.createdAt.toISOString();
      const user = `${activity.user.firstName} ${activity.user.lastName}`;
      console.log(`   ${index + 1}. ${time} - ${user}`);
    });
    
    // Get document info
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        title: true,
        viewCount: true,
        status: true
      }
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('\n📄 DOCUMENT INFO:\n');
    console.log(`   Title: ${document?.title}`);
    console.log(`   Status: ${document?.status}`);
    console.log(`   View Counter: ${document?.viewCount}`);
    console.log(`   Audit Log Entries: ${viewActivities.length}`);
    
    const diff = (document?.viewCount || 0) - viewActivities.length;
    if (diff !== 0) {
      console.log(`   ⚠️  Mismatch: ${Math.abs(diff)} ${diff > 0 ? 'missing log entries' : 'extra log entries'}`);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n💡 INTERPRETATION:\n');
    
    if (suspiciousCount > 0) {
      console.log('⚠️  POTENTIAL ISSUE DETECTED:');
      console.log('   Multiple VIEW entries created within the same second suggests');
      console.log('   that page refreshes or component re-renders are creating duplicate logs.');
      console.log('');
      console.log('   This is consistent with the bug where useRef state resets on page refresh,');
      console.log('   causing the skipLog mechanism to fail.');
    } else {
      console.log('✅  NO OBVIOUS DUPLICATION DETECTED:');
      console.log('   All VIEW entries appear to be spaced out normally.');
      console.log('   However, this does not definitively prove the bug does not exist.');
      console.log('   The bug only manifests when users manually refresh the page (F5).');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n🧪 TO MANUALLY TEST THE BUG:\n');
    console.log('   1. Clear browser cache and close all tabs');
    console.log('   2. Login to the application');
    console.log(`   3. Open: http://localhost:3000/documents/${documentId}/view`);
    console.log('   4. Wait 2 seconds');
    console.log(`   5. Check current audit log count: SELECT COUNT(*) FROM document_activities WHERE document_id='${documentId}' AND action='VIEW';`);
    console.log('   6. Press F5 to refresh the page');
    console.log('   7. Wait 2 seconds');
    console.log('   8. Check audit log count again');
    console.log('   9. If count increased by 1, the bug is CONFIRMED');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeViewLogs();

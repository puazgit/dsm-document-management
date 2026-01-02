import { prisma } from '../src/lib/prisma';

async function checkViewLogs() {
  try {
    console.log('\n🔍 Checking logs in last 3 minutes...\n');
    
    const activities = await prisma.documentActivity.findMany({
      where: {
        documentId: 'cmjglzp470007139owc5c5tu2',
        action: 'VIEW',
        createdAt: {
          gte: new Date(Date.now() - 3 * 60 * 1000) // Last 3 minutes
        }
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        createdAt: true,
        userId: true,
        metadata: true,
        description: true
      }
    });

    console.log('📊 Recent VIEW logs for document cmjglzp470007139owc5c5tu2:');
    console.log('='.repeat(70));
    
    if (activities.length === 0) {
      console.log('No VIEW logs found for this document');
      return;
    }

    activities.forEach((activity, index) => {
      console.log(`\n${index + 1}. ID: ${activity.id}`);
      console.log(`   Time: ${activity.createdAt.toISOString()}`);
      console.log(`   User: ${activity.userId}`);
      console.log(`   Description: ${activity.description}`);
      console.log(`   Metadata:`, activity.metadata ? JSON.stringify(activity.metadata, null, 2) : 'null');
      
      // Check if this is from new code
      if (activity.metadata?.source === 'document_viewer_get') {
        console.log(`   ✅ FROM NEW CODE (GET endpoint)`);
      } else if (activity.metadata?.source === 'document_viewer') {
        console.log(`   ⚠️ FROM POST endpoint`);
      } else if (activity.metadata?.source === 'search') {
        console.log(`   🔍 FROM SEARCH`);
      } else {
        console.log(`   ❓ FROM OLD CODE (no metadata source)`);
      }
    });

    if (activities.length >= 2) {
      console.log('\n' + '='.repeat(70));
      console.log('🔍 Checking for duplicates...\n');
      
      for (let i = 0; i < activities.length - 1; i++) {
        const current = activities[i];
        const next = activities[i + 1];
        
        if (current.userId === next.userId) {
          const diff = new Date(current.createdAt).getTime() - new Date(next.createdAt).getTime();
          console.log(`Between log #${i + 1} and #${i + 2} (same user):`);
          console.log(`   Time difference: ${diff}ms (${(diff / 1000).toFixed(1)}s)`);
          
          if (diff < 5000) {
            console.log('   ⚠️ POTENTIAL DUPLICATE! (less than 5 seconds)');
          } else if (diff < 300000) { // 5 minutes
            console.log('   ⚠️ Within 5-minute window - should have been prevented!');
          } else {
            console.log('   ✅ OK - more than 5 minutes apart');
          }
          console.log('');
        }
      }
    }

    console.log('='.repeat(70));
    console.log(`\n✅ Total VIEW logs: ${activities.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkViewLogs();

#!/usr/bin/env tsx
/**
 * Script to verify that the view logging fix is working
 * Run this while testing in browser to monitor database changes
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function monitorViewLogs() {
  const documentId = 'cmjgs318h00032pa3aeq66d7f';
  
  console.log('🔍 MONITORING VIEW LOGS FOR DOCUMENT:', documentId);
  console.log('='.repeat(80));
  console.log('\nPress Ctrl+C to stop\n');
  
  let previousCount = 0;
  
  // Get initial count
  const initialActivities = await prisma.documentActivity.findMany({
    where: {
      documentId: documentId,
      action: 'VIEW'
    }
  });
  
  previousCount = initialActivities.length;
  console.log(`📊 Initial VIEW count: ${previousCount}\n`);
  
  // Monitor every 2 seconds
  setInterval(async () => {
    try {
      const activities = await prisma.documentActivity.findMany({
        where: {
          documentId: documentId,
          action: 'VIEW'
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 5,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      });
      
      const currentCount = activities.length;
      
      if (currentCount !== previousCount) {
        const diff = currentCount - previousCount;
        console.log(`\n⚠️  VIEW COUNT CHANGED: ${previousCount} → ${currentCount} (${diff > 0 ? '+' : ''}${diff})`);
        console.log(`   Time: ${new Date().toISOString()}`);
        
        if (diff > 0) {
          console.log(`   🔴 NEW VIEW LOGGED (THIS SHOULD NOT HAPPEN ON REFRESH!)`);
          console.log(`   Latest entries:`);
          activities.slice(0, diff).forEach(act => {
            console.log(`     - ${act.createdAt.toISOString()} by ${act.user.firstName} ${act.user.lastName}`);
          });
        }
        
        previousCount = currentCount;
      } else {
        process.stdout.write(`\r✅ Monitoring... Current count: ${currentCount} (no change)`);
      }
      
    } catch (error) {
      console.error('\n❌ Error:', error);
    }
  }, 2000);
}

console.log('\n📋 INSTRUCTIONS:');
console.log('1. Open browser and navigate to: http://localhost:3000/documents/cmjgs318h00032pa3aeq66d7f/view');
console.log('2. Open DevTools Console (F12) and check logs');
console.log('3. Wait 2 seconds');
console.log('4. Press F5 to refresh the page');
console.log('5. Check if this monitor shows new VIEW entry');
console.log('6. Check browser console for "(skip log - already viewed in session)" message');
console.log('\n');

monitorViewLogs();

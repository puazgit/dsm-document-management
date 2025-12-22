/**
 * Script to synchronize document view/download counters with activity logs
 * Run this to fix any inconsistencies between Documents table and DocumentActivity table
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function syncDocumentCounters() {
  console.log('🔄 Starting document counter synchronization...\n');

  try {
    // Get all documents
    const documents = await prisma.document.findMany({
      select: {
        id: true,
        title: true,
        viewCount: true,
        downloadCount: true,
      },
    });

    console.log(`📊 Found ${documents.length} documents to sync\n`);

    let syncedCount = 0;
    let unchangedCount = 0;

    for (const doc of documents) {
      // Count activities from DocumentActivity table (source of truth)
      const [viewCount, downloadCount] = await Promise.all([
        prisma.documentActivity.count({
          where: { documentId: doc.id, action: 'VIEW' },
        }),
        prisma.documentActivity.count({
          where: { documentId: doc.id, action: 'DOWNLOAD' },
        }),
      ]);

      // Check if sync needed
      const viewDiff = doc.viewCount !== viewCount;
      const downloadDiff = doc.downloadCount !== downloadCount;

      if (viewDiff || downloadDiff) {
        // Update document counters
        await prisma.document.update({
          where: { id: doc.id },
          data: {
            viewCount: viewCount,
            downloadCount: downloadCount,
          },
        });

        console.log(`✅ Synced: ${doc.title.substring(0, 50)}...`);
        console.log(`   Views: ${doc.viewCount} → ${viewCount} ${viewDiff ? '(changed)' : ''}`);
        console.log(`   Downloads: ${doc.downloadCount} → ${downloadCount} ${downloadDiff ? '(changed)' : ''}\n`);
        syncedCount++;
      } else {
        console.log(`⏭️  Skipped: ${doc.title.substring(0, 50)}... (already in sync)`);
        unchangedCount++;
      }
    }

    console.log('\n📈 Synchronization Summary:');
    console.log(`✅ Documents synced: ${syncedCount}`);
    console.log(`⏭️  Documents unchanged: ${unchangedCount}`);
    console.log(`📊 Total processed: ${documents.length}`);
    console.log('\n✨ Synchronization completed successfully!');

  } catch (error) {
    console.error('❌ Error during synchronization:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the sync
syncDocumentCounters()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

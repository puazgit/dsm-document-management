import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migratePendingReviewToInReview() {
  console.log('🔄 Migrating PENDING_REVIEW → IN_REVIEW');
  console.log('='.repeat(80));
  
  try {
    // Step 1: Count affected records
    console.log('\n📊 Step 1: Analyzing current data...');
    
    const pendingReviewCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM documents WHERE status = 'PENDING_REVIEW'
    `;
    
    const workflowTransitionCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM workflow_transitions 
      WHERE from_status = 'PENDING_REVIEW' OR to_status = 'PENDING_REVIEW'
    `;
    
    console.log(`   Documents with PENDING_REVIEW: ${pendingReviewCount[0].count}`);
    console.log(`   Workflow transitions affected: ${workflowTransitionCount[0].count}`);
    
    // Step 2: Backup affected data
    console.log('\n💾 Step 2: Creating backup of affected data...');
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS _backup_documents_pending_review AS
      SELECT * FROM documents WHERE status = 'PENDING_REVIEW'
    `;
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS _backup_workflow_transitions_pending_review AS
      SELECT * FROM workflow_transitions 
      WHERE from_status = 'PENDING_REVIEW' OR to_status = 'PENDING_REVIEW'
    `;
    
    console.log('   ✅ Backup tables created');
    
    // Step 3: Update documents table
    console.log('\n📝 Step 3: Updating documents table...');
    
    const updatedDocuments = await prisma.$executeRaw`
      UPDATE documents 
      SET status = 'IN_REVIEW' 
      WHERE status = 'PENDING_REVIEW'
    `;
    
    console.log(`   ✅ Updated ${updatedDocuments} documents`);
    
    // Step 4: Update workflow_transitions table
    console.log('\n🔄 Step 4: Updating workflow_transitions table...');
    
    const updatedFromStatus = await prisma.$executeRaw`
      UPDATE workflow_transitions 
      SET from_status = 'IN_REVIEW' 
      WHERE from_status = 'PENDING_REVIEW'
    `;
    
    const updatedToStatus = await prisma.$executeRaw`
      UPDATE workflow_transitions 
      SET to_status = 'IN_REVIEW' 
      WHERE to_status = 'PENDING_REVIEW'
    `;
    
    console.log(`   ✅ Updated ${updatedFromStatus} transitions (from_status)`);
    console.log(`   ✅ Updated ${updatedToStatus} transitions (to_status)`);
    
    // Step 5: Verify migration
    console.log('\n🔍 Step 5: Verifying migration...');
    
    const remainingPendingReview = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM documents WHERE status = 'PENDING_REVIEW'
    `;
    
    const newInReviewCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM documents WHERE status = 'IN_REVIEW'
    `;
    
    console.log(`   Remaining PENDING_REVIEW: ${remainingPendingReview[0].count}`);
    console.log(`   New IN_REVIEW count: ${newInReviewCount[0].count}`);
    
    if (remainingPendingReview[0].count === 0n) {
      console.log('   ✅ All PENDING_REVIEW records migrated successfully!');
    } else {
      console.log('   ⚠️  Warning: Some PENDING_REVIEW records remain');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ Migration completed successfully!');
    console.log('\n💡 Backup tables created:');
    console.log('   - _backup_documents_pending_review');
    console.log('   - _backup_workflow_transitions_pending_review');
    console.log('\n⚠️  If rollback needed, run: npm run db:restore:full\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migratePendingReviewToInReview();

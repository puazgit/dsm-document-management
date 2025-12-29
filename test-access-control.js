/**
 * Test access control untuk dokumen DRAFT
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAccessControl() {
  console.log('=== Testing Access Control for DRAFT Document ===\n');
  
  try {
    // Check draft document details
    console.log('1. DRAFT Document Details:');
    const draftDoc = await prisma.document.findFirst({
      where: { 
        title: { contains: 'DRAFT PROSEDUR PIR' }
      },
      include: {
        createdBy: {
          select: { id: true, username: true, email: true, firstName: true, lastName: true }
        }
      }
    });
    
    if (draftDoc) {
      console.log(`   Title: ${draftDoc.title}`);
      console.log(`   Status: ${draftDoc.status}`);
      console.log(`   Is Public: ${draftDoc.is_public}`);
      console.log(`   Created By: ${draftDoc.createdBy?.firstName} ${draftDoc.createdBy?.lastName} (${draftDoc.createdBy?.email})`);
      console.log(`   Creator ID: ${draftDoc.created_by_id}`);
      console.log(`   Access Groups: ${JSON.stringify(draftDoc.access_groups)}`);
    } else {
      console.log('   ❌ DRAFT document not found!');
    }
    
    console.log('\n2. All Users in System:');
    const users = await prisma.user.findMany({
      select: { id: true, username: true, firstName: true, lastName: true, email: true, groupId: true }
    });
    
    for (const user of users) {
      console.log(`   - ${user.firstName} ${user.lastName} (${user.email})`);
      console.log(`     Group: ${user.groupId || 'none'}`);
      
      if (draftDoc) {
        // Check user roles from UserRole join table
        const userRoles = await prisma.userRole.findMany({
          where: { userId: user.id },
          include: { role: true }
        });
        
        const isAdmin = userRoles.some(ur => 
          ur.role.name.toLowerCase() === 'admin' || 
          ur.role.name.toLowerCase() === 'administrator'
        );
        
        // Check if this user can access the draft doc
        const canAccess = 
          isAdmin ||
          user.id === draftDoc.created_by_id ||
          draftDoc.is_public ||
          (user.groupId && draftDoc.access_groups?.includes(user.groupId)) ||
          draftDoc.status === 'PUBLISHED';
        
        console.log(`     Is Admin: ${isAdmin ? 'YES' : 'NO'}`);
        console.log(`     Can access DRAFT doc: ${canAccess ? '✅ YES' : '❌ NO'}`);
      }
    }
    
    console.log('\n3. Recommendation:');
    if (draftDoc && !draftDoc.is_public && draftDoc.status === 'DRAFT') {
      console.log('   ⚠️  DRAFT document is NOT public and status is DRAFT');
      console.log('   Solutions:');
      console.log('   a. Login sebagai admin/administrator');
      console.log('   b. Login sebagai user yang membuat dokumen');
      console.log('   c. Ubah status dokumen menjadi PUBLISHED');
      console.log('   d. Ubah is_public menjadi true');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testAccessControl();

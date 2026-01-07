import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDocument() {
  console.log('🔍 Checking Document: "Proposal Implementasi AI untuk Document Classification"\n');
  console.log('='.repeat(80));
  
  try {
    // Find the document
    const doc = await prisma.document.findFirst({
      where: {
        title: {
          contains: 'Proposal Implementasi AI',
          mode: 'insensitive'
        }
      },
      include: {
        documentType: true,
        createdBy: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            group: {
              select: {
                name: true,
                displayName: true
              }
            }
          }
        }
      }
    });

    if (!doc) {
      console.log('❌ Document NOT FOUND in database');
      console.log('\n💡 Available documents:');
      const allDocs = await prisma.document.findMany({
        select: {
          title: true,
          status: true,
          accessGroups: true
        },
        take: 10
      });
      allDocs.forEach(d => {
        console.log(`   - ${d.title} (${d.status})`);
      });
      return;
    }

    console.log('\n📄 DOCUMENT INFO:');
    console.log(`   ID: ${doc.id}`);
    console.log(`   Title: ${doc.title}`);
    console.log(`   Status: ${doc.status}`);
    console.log(`   Type: ${doc.documentType?.name || 'N/A'}`);
    console.log(`   Created By: ${doc.createdBy?.email} (${doc.createdBy?.firstName} ${doc.createdBy?.lastName})`);
    console.log(`   Creator Group: ${doc.createdBy?.group?.displayName || 'N/A'}`);
    console.log(`   Access Groups: ${doc.accessGroups.length > 0 ? JSON.stringify(doc.accessGroups) : '[]' }`);
    console.log(`   Created At: ${doc.createdAt}`);
    console.log(`   View Count: ${doc.viewCount}`);

    // Check ppd.pusat user
    console.log('\n\n👤 PPD.PUSAT USER INFO:');
    console.log('─'.repeat(80));
    const ppdUser = await prisma.user.findUnique({
      where: { email: 'ppd.pusat@dsm.com' },
      include: {
        group: true,
        userRoles: {
          where: { isActive: true },
          include: {
            role: {
              include: {
                capabilityAssignments: {
                  include: {
                    capability: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!ppdUser) {
      console.log('❌ ppd.pusat@dsm.com user NOT FOUND');
      return;
    }

    console.log(`   Email: ${ppdUser.email}`);
    console.log(`   Group: ${ppdUser.group?.displayName || 'N/A'}`);
    console.log(`   Active: ${ppdUser.isActive}`);
    
    const roles = ppdUser.userRoles.map(ur => ur.role.name);
    console.log(`   Roles: ${roles.join(', ')}`);

    const allCaps = ppdUser.userRoles
      .flatMap(ur => ur.role.capabilityAssignments.map(ca => ca.capability.name));
    const uniqueCaps = [...new Set(allCaps)];
    
    console.log(`   Total Capabilities: ${uniqueCaps.length}`);
    console.log(`   Has ADMIN_ACCESS: ${uniqueCaps.includes('ADMIN_ACCESS') ? '✅' : '❌'}`);
    console.log(`   Has DOCUMENT_FULL_ACCESS: ${uniqueCaps.includes('DOCUMENT_FULL_ACCESS') ? '✅' : '❌'}`);

    // Check access logic
    console.log('\n\n🔐 ACCESS CHECK:');
    console.log('─'.repeat(80));
    
    // Rule 1: Check if has full access
    const hasFullAccess = uniqueCaps.includes('ADMIN_ACCESS') || uniqueCaps.includes('DOCUMENT_FULL_ACCESS');
    console.log(`   1. Has Full Access (ADMIN_ACCESS or DOCUMENT_FULL_ACCESS): ${hasFullAccess ? '✅ YES' : '❌ NO'}`);
    
    // Rule 2: Is document creator
    const isCreator = doc.createdById === ppdUser.id;
    console.log(`   2. Is Document Creator: ${isCreator ? '✅ YES' : '❌ NO'}`);
    
    // Rule 3: Access Groups check
    if (doc.accessGroups.length > 0) {
      const userGroupName = ppdUser.group?.name;
      const inAccessGroup = userGroupName && doc.accessGroups.includes(userGroupName);
      console.log(`   3. Access Groups Restriction: ${doc.accessGroups.join(', ')}`);
      console.log(`      User Group: ${userGroupName || 'N/A'}`);
      console.log(`      In Access Group: ${inAccessGroup ? '✅ YES' : '❌ NO'}`);
    } else {
      console.log(`   3. Access Groups: None (Public document)`);
    }

    // Final verdict
    console.log('\n📊 VERDICT:');
    console.log('─'.repeat(80));
    if (hasFullAccess) {
      console.log('   ✅ Should be VISIBLE - User has FULL ACCESS capability');
    } else if (isCreator) {
      console.log('   ✅ Should be VISIBLE - User is the document creator');
    } else if (doc.accessGroups.length === 0) {
      console.log('   ✅ Should be VISIBLE - No access group restrictions');
    } else {
      const userGroupName = ppdUser.group?.name;
      const inAccessGroup = userGroupName && doc.accessGroups.includes(userGroupName);
      if (inAccessGroup) {
        console.log('   ✅ Should be VISIBLE - User group is in access groups');
      } else {
        console.log('   ❌ Should NOT be visible - User group not in access groups and no full access');
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Check completed\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDocument();

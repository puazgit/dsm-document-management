import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkFannyCapabilities() {
  try {
    console.log('🔍 Checking user "fanny"...\n');

    // Find user fanny
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { contains: 'fanny', mode: 'insensitive' } },
          { firstName: { contains: 'fanny', mode: 'insensitive' } },
          { lastName: { contains: 'fanny', mode: 'insensitive' } }
        ]
      },
      include: {
        userRoles: {
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

    if (!user) {
      console.log('❌ User "fanny" tidak ditemukan\n');
      return;
    }

    console.log(`✅ User ditemukan:`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Email: ${user.email || '-'}\n`);

    // Get all capabilities from roles
    const capabilities = new Set<string>();
    
    console.log(`📋 Roles (${user.userRoles.length}):`);
    for (const userRole of user.userRoles) {
      console.log(`   • ${userRole.role.name} (${userRole.role.displayName})`);
      
      for (const roleCap of userRole.role.capabilityAssignments) {
        capabilities.add(roleCap.capability.name);
        console.log(`     - ${roleCap.capability.name}`);
      }
    }

    // Check specifically for DOCUMENT_SUBMIT_APPROVAL
    console.log(`\n🎯 Check capability untuk IN_REVIEW → PENDING_APPROVAL:`);
    const hasSubmitApproval = capabilities.has('DOCUMENT_SUBMIT_APPROVAL');
    
    if (hasSubmitApproval) {
      console.log(`   ✅ User fanny PUNYA capability: DOCUMENT_SUBMIT_APPROVAL`);
      console.log(`   ✅ User fanny DAPAT mengubah status IN_REVIEW → PENDING_APPROVAL`);
    } else {
      console.log(`   ❌ User fanny TIDAK PUNYA capability: DOCUMENT_SUBMIT_APPROVAL`);
      console.log(`   ❌ User fanny TIDAK DAPAT mengubah status IN_REVIEW → PENDING_APPROVAL`);
      
      console.log(`\n💡 Solusi:`);
      console.log(`   1. Assign role "asisten.manager.pksm" ke user fanny`);
      console.log(`   2. Atau tambahkan capability DOCUMENT_SUBMIT_APPROVAL ke role yang sudah dimiliki fanny`);
    }

    // Show all capabilities
    console.log(`\n📊 Semua capabilities yang dimiliki user fanny:`);
    if (capabilities.size === 0) {
      console.log(`   (Tidak ada capabilities)`);
    } else {
      Array.from(capabilities).sort().forEach(cap => {
        console.log(`   • ${cap}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFannyCapabilities();

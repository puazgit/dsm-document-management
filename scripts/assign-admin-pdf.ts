#!/usr/bin/env ts-node
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function assignAdminPDF() {
  const adminRole = await prisma.role.findUnique({ where: { name: 'administrator' } });
  if (!adminRole) {
    console.log('❌ Administrator role not found');
    return;
  }
  
  console.log('👑 Assigning PDF capabilities to Administrator...');
  for (const capName of ['PDF_VIEW', 'PDF_DOWNLOAD', 'PDF_PRINT', 'PDF_COPY', 'PDF_WATERMARK']) {
    const capability = await prisma.roleCapability.findUnique({ where: { name: capName } });
    
    if (capability) {
      await prisma.roleCapabilityAssignment.upsert({
        where: {
          roleId_capabilityId: {
            roleId: adminRole.id,
            capabilityId: capability.id
          }
        },
        update: {},
        create: {
          roleId: adminRole.id,
          capabilityId: capability.id
        }
      });
      console.log(`   ✅ ${capName}`);
    }
  }
  console.log('✅ Done!');
}

assignAdminPDF().finally(() => prisma.$disconnect());

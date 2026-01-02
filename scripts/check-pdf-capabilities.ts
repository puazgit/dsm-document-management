#!/usr/bin/env ts-node
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkPDFCapabilities() {
  console.log('🔍 Checking PDF Capabilities in Database...\n');
  
  // 1. Check if PDF capabilities exist
  console.log('📋 Step 1: PDF Capabilities in role_capabilities table:');
  const pdfCaps = await prisma.roleCapability.findMany({
    where: {
      name: { startsWith: 'PDF_' }
    },
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      assignments: {
        include: {
          role: {
            select: {
              name: true,
              displayName: true
            }
          }
        }
      }
    }
  });
  
  if (pdfCaps.length === 0) {
    console.log('   ❌ No PDF capabilities found!');
    console.log('   💡 Run: npx ts-node scripts/add-pdf-capabilities.ts');
    return;
  }
  
  console.log(`   ✅ Found ${pdfCaps.length} PDF capabilities:\n`);
  
  for (const cap of pdfCaps) {
    console.log(`   📌 ${cap.name}`);
    console.log(`      Description: ${cap.description}`);
    console.log(`      Category: ${cap.category}`);
    console.log(`      Assigned to ${cap.assignments.length} role(s):`);
    
    if (cap.assignments.length === 0) {
      console.log('         ⚠️  Not assigned to any role yet');
    } else {
      for (const assignment of cap.assignments) {
        console.log(`         ✅ ${assignment.role.displayName} (${assignment.role.name})`);
      }
    }
    console.log('');
  }
  
  // 2. Check all roles
  console.log('\n📋 Step 2: All Roles and their PDF Capabilities:');
  const roles = await prisma.role.findMany({
    select: {
      id: true,
      name: true,
      displayName: true,
      level: true,
      capabilityAssignments: {
        where: {
          capability: {
            name: { startsWith: 'PDF_' }
          }
        },
        include: {
          capability: {
            select: {
              name: true
            }
          }
        }
      }
    },
    orderBy: {
      level: 'desc'
    }
  });
  
  console.log(`   Found ${roles.length} roles:\n`);
  
  for (const role of roles) {
    const pdfCaps = role.capabilityAssignments.map(a => a.capability.name);
    const icon = pdfCaps.length > 0 ? '✅' : '⚠️';
    
    console.log(`   ${icon} ${role.displayName} (${role.name}) - Level ${role.level}`);
    if (pdfCaps.length > 0) {
      console.log(`      PDF Capabilities: ${pdfCaps.join(', ')}`);
    } else {
      console.log(`      No PDF capabilities assigned`);
    }
    console.log('');
  }
  
  // 3. Summary
  console.log('\n📊 Summary:');
  console.log(`   • Total PDF capabilities: ${pdfCaps.length}`);
  console.log(`   • Total roles with PDF access: ${roles.filter(r => r.capabilityAssignments.length > 0).length}`);
  
  const allAssignments = pdfCaps.reduce((sum, cap) => sum + cap.assignments.length, 0);
  console.log(`   • Total assignments: ${allAssignments}`);
  
  console.log('\n💡 To view in UI:');
  console.log('   1. Open: http://localhost:3000/admin/rbac/assignments');
  console.log('   2. Look for "DOCUMENT" category section');
  console.log('   3. PDF capabilities should appear in the matrix');
}

checkPDFCapabilities()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

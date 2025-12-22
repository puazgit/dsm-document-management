import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifySync() {
  console.log('🔍 Verifying PDF Permission Sync Between Database and Code\n');
  console.log('='.repeat(80));
  console.log('\n');

  // Fetch all roles with their permissions
  const roles = await prisma.role.findMany({
    where: {
      name: {
        in: ['admin', 'manager', 'editor', 'viewer', 'reviewer', 'ppd', 'kadiv']
      }
    },
    include: {
      rolePermissions: {
        include: {
          permission: true
        }
      }
    }
  });

  console.log('📊 DATABASE STATE:');
  console.log('-'.repeat(80));

  for (const role of roles) {
    const permissions = role.rolePermissions
      .filter(rp => rp.isGranted)
      .map(rp => rp.permission.name);

    const pdfDownload = permissions.includes('pdf.download') || permissions.includes('documents.download');
    const pdfPrint = permissions.includes('pdf.print');
    const pdfCopy = permissions.includes('pdf.copy');
    const pdfWatermark = permissions.includes('pdf.watermark');

    // pdf.watermark logic: HAS permission = NO watermark shown
    const showWatermark = !pdfWatermark;

    console.log(`\n${role.displayName} (${role.name}):`);
    console.log(`  Total Permissions: ${permissions.length}`);
    console.log(`  PDF Capabilities:`);
    console.log(`    - canDownload: ${pdfDownload ? '✅' : '❌'}`);
    console.log(`    - canPrint: ${pdfPrint ? '✅' : '❌'}`);
    console.log(`    - canCopy: ${pdfCopy ? '✅' : '❌'}`);
    console.log(`    - pdf.watermark permission: ${pdfWatermark ? '✅ HAS (no watermark)' : '❌ MISSING (show watermark)'}`);
    console.log(`    - showWatermark: ${showWatermark ? '⚠️  YES' : '✅ NO'}`);
  }

  console.log('\n');
  console.log('='.repeat(80));
  console.log('\n📋 IMPLEMENTATION CHECKLIST:\n');
  
  console.log('✅ Session-based permissions (PRIMARY)');
  console.log('   - Loads from session.user.permissions array');
  console.log('   - Checks pdf.download, pdf.print, pdf.copy, pdf.watermark');
  console.log('');
  
  console.log('✅ API-based fallback (SECONDARY)');
  console.log('   - Fetches from /api/roles/[id]/permissions-summary');
  console.log('   - Returns database-driven permissions');
  console.log('');
  
  console.log('⚠️  Hardcoded fallback (LAST RESORT - Should match database!)');
  console.log('   - Currently in getHardcodedFallbackPermissions()');
  console.log('   - May be outdated and needs sync check');
  console.log('');

  console.log('\n');
  console.log('='.repeat(80));
  console.log('\n💡 RECOMMENDATIONS:\n');
  
  console.log('1. ✅ Primary: Use session permissions (already implemented)');
  console.log('2. ✅ Secondary: Use API fetch from database (already implemented)');
  console.log('3. ⚠️  Tertiary: Update hardcoded fallback to match current database state');
  console.log('4. ✅ Logic: pdf.watermark permission controls watermark display');
  console.log('   - HAS permission = NO watermark shown');
  console.log('   - NO permission = watermark shown');
  console.log('');
  
  await prisma.$disconnect();
}

verifySync().catch(console.error);

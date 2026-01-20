import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function showDocumentTypes() {
  try {
    const types = await prisma.documentType.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        icon: true,
        color: true,
        _count: {
          select: { documents: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  📋 AVAILABLE DOCUMENT TYPES (documentTypeId)');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('⚠️  documentTypeId adalah WAJIB diisi dalam CSV import!');
    console.log('');
    
    if (types.length === 0) {
      console.log('❌ No active document types found!');
      console.log('   Run: npx prisma db seed');
      return;
    }

    types.forEach((type, index) => {
      console.log(`${index + 1}. ${type.name}`);
      console.log(`   ID: ${type.id}`);
      console.log(`   Slug: ${type.slug}`);
      if (type.description) {
        console.log(`   Description: ${type.description}`);
      }
      console.log(`   Documents: ${type._count.documents}`);
      console.log(`   Icon: ${type.icon || 'N/A'} | Color: ${type.color || 'N/A'}`);
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  Total: ${types.length} active document types`);
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('💡 Usage:');
    console.log('   1. Copy the ID you need');
    console.log('   2. Paste it in the "documentTypeId" column of your CSV');
    console.log('   3. Example CSV row:');
    console.log('      title,description,documentTypeId,...');
    console.log(`      "My Doc","Description","${types[0]?.id || 'PASTE_ID_HERE'}",...`);
    console.log('');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

showDocumentTypes();

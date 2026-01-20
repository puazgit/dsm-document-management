import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getDocumentTypes() {
  const types = await prisma.documentType.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      icon: true,
      color: true
    },
    orderBy: { sortOrder: 'asc' }
  });

  console.log('📋 Available Document Types:\n');
  console.log('Copy ID yang sesuai untuk kolom documentTypeId di CSV\n');
  console.log('='.repeat(90));
  
  types.forEach((type, index) => {
    console.log(`${type.icon || '📄'} ${index + 1}. ${type.name}`);
    console.log(`   Slug:        ${type.slug}`);
    console.log(`   ID:          ${type.id}`);
    console.log(`   Description: ${type.description || '-'}`);
    console.log('-'.repeat(90));
  });

  console.log(`\nTotal: ${types.length} document types\n`);
}

getDocumentTypes()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

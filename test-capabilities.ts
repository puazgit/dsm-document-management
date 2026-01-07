import { prisma } from './src/lib/prisma.js';

async function testCapabilities() {
  try {
    const capabilities = await prisma.roleCapability.findMany({
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });

    console.log('Total capabilities:', capabilities.length);
    console.log('\nAll capabilities:');
    capabilities.forEach(cap => {
      console.log(`  - ${cap.name} (category: ${cap.category || 'NULL'})`);
    });

    const documentCapabilities = capabilities.filter(
      cap => cap.category === 'document' || cap.name === 'ADMIN_ACCESS'
    );
    
    console.log('\nDocument capabilities:', documentCapabilities.length);
    documentCapabilities.forEach(cap => {
      console.log(`  - ${cap.name} (${cap.description})`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCapabilities();

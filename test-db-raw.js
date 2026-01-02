const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testRawQuery() {
  console.log('Testing raw SQL query...\n');
  
  try {
    // Check documents table columns
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'documents' 
      ORDER BY ordinal_position;
    `;
    
    console.log(`Found ${columns.length} columns in documents table:\n`);
    columns.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    
    // Check if is_public exists
    const hasIsPublic = columns.some(col => col.column_name === 'is_public');
    console.log(`\nis_public column exists: ${hasIsPublic ? '❌ YES (should not!)' : '✅ NO (correct!)'}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testRawQuery();

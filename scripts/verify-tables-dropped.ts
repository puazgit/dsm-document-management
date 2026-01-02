import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyTablesDropped() {
  try {
    console.log('🔍 Checking if Permission tables are dropped...\n')

    // Query to check if tables exist
    const tables = await prisma.$queryRawUnsafe<any[]>(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('permissions', 'role_permissions')
    `)

    if (tables.length === 0) {
      console.log('✅ SUCCESS: Permission tables have been dropped')
      console.log('   • permissions table: DROPPED')
      console.log('   • role_permissions table: DROPPED')
    } else {
      console.log('❌ WARNING: Some tables still exist:')
      tables.forEach(t => console.log(`   • ${t.tablename}`))
    }

    console.log('\n🔍 Checking capability tables...\n')

    // Verify capability tables exist
    const capabilityTables = await prisma.$queryRawUnsafe<any[]>(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('role_capabilities', 'role_capability_assignments')
    `)

    if (capabilityTables.length === 2) {
      console.log('✅ Capability tables confirmed:')
      capabilityTables.forEach(t => console.log(`   • ${t.tablename}`))
      
      // Count records
      const capCount = await prisma.roleCapability.count()
      const assignCount = await prisma.roleCapabilityAssignment.count()
      
      console.log('\n📊 Capability data:')
      console.log(`   • RoleCapability records: ${capCount}`)
      console.log(`   • RoleCapabilityAssignment records: ${assignCount}`)
    } else {
      console.log('❌ WARNING: Capability tables missing!')
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verifyTablesDropped()

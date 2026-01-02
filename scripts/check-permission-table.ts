import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function checkTables() {
  try {
    console.log('Checking Permission table...')
    const count = await prisma.permission.count()
    console.log('✅ Permission table EXISTS:', count, 'records')
    return true
  } catch(e: any) {
    console.log('❌ Permission table does NOT exist in database')
    console.log('   This means it was already dropped in a previous migration')
    console.log('   Error:', e.message)
    return false
  } finally {
    await prisma.$disconnect()
  }
}

checkTables()

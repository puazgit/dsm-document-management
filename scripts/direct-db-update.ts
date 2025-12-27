import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Direct database check...\n')
  
  // Get raw SQL result
  const result = await prisma.$queryRaw`
    SELECT id, name, path, type, required_capability, is_active 
    FROM resources 
    WHERE type = 'navigation' 
    AND (path = '/dashboard' OR name = 'Dashboard')
  `
  
  console.log('📋 Raw Database Result:')
  console.log(result)
  console.log('')
  
  // Update directly
  console.log('🔧 Updating Dashboard...')
  
  const updateResult = await prisma.$executeRaw`
    UPDATE resources 
    SET required_capability = 'DASHBOARD_VIEW'
    WHERE type = 'navigation' 
    AND (path = '/dashboard' OR name = 'Dashboard')
  `
  
  console.log(`✅ Updated ${updateResult} row(s)`)
  console.log('')
  
  // Verify
  const verify = await prisma.$queryRaw`
    SELECT id, name, path, required_capability 
    FROM resources 
    WHERE type = 'navigation' 
    AND (path = '/dashboard' OR name = 'Dashboard')
  `
  
  console.log('✅ Verification:')
  console.log(verify)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

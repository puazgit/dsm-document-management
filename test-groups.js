// Test script to check groups API
import { prisma } from '../src/lib/prisma'

async function testGroups() {
  try {
    console.log('Testing database connection...')
    
    // Test basic connection
    await prisma.$connect()
    console.log('✅ Database connected')
    
    // Test groups query
    const groups = await prisma.group.findMany({
      include: {
        _count: {
          select: {
            users: true
          }
        }
      }
    })
    
    console.log(`✅ Found ${groups.length} groups:`)
    groups.forEach(group => {
      console.log(`- ${group.name} (${group.displayName}) - Level ${group.level}`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testGroups()
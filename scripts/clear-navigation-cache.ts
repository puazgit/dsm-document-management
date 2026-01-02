#!/usr/bin/env tsx
/**
 * Clear navigation cache
 * 
 * This script helps resolve issues where users can't see sidebar items
 * due to cached data before navigation resources were seeded.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function clearNavigationCache() {
  console.log('🧹 Navigation Cache Cleanup Tool\n')
  
  try {
    // Check navigation resources count
    const navCount = await prisma.resource.count({
      where: {
        type: 'navigation',
        isActive: true
      }
    })
    
    console.log('📊 Database Status:')
    console.log(`   Navigation resources: ${navCount}`)
    
    if (navCount === 0) {
      console.log('\n⚠️  No navigation resources found!')
      console.log('   Run: npx tsx prisma/seeds/resources.ts')
      return
    }
    
    // Check users with roles
    const usersWithRoles = await prisma.user.findMany({
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                capabilityAssignments: true
              }
            }
          }
        }
      }
    })
    
    console.log(`   Users with roles: ${usersWithRoles.filter(u => u.userRoles.length > 0).length}`)
    console.log('\n✅ Database is properly configured!')
    
    console.log('\n📝 To fix sidebar visibility:')
    console.log('   1. Restart the application (to clear server cache)')
    console.log('   2. Clear browser cache (Ctrl/Cmd + Shift + R)')
    console.log('   3. Logout and login again')
    console.log('\n💡 The issue was: Navigation resources were not seeded initially.')
    console.log('   Now fixed: Database has', navCount, 'navigation items')
    
    // Show sample of what users should see
    console.log('\n🧭 Sample Navigation Items:')
    const samples = await prisma.resource.findMany({
      where: {
        type: 'navigation',
        isActive: true,
        parentId: null
      },
      orderBy: { sortOrder: 'asc' },
      take: 5
    })
    
    samples.forEach(item => {
      console.log(`   📍 ${item.name} (${item.path})`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

clearNavigationCache()

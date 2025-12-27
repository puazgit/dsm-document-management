import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkSessionCapabilities() {
  console.log('🔍 Checking session and capabilities for manager.tik@dsm.com...\n')
  
  try {
    // Find the user with full details
    const user = await prisma.user.findUnique({
      where: { email: 'manager.tik@dsm.com' },
      include: {
        userRoles: {
          where: { isActive: true },
          include: {
            role: {
              include: {
                capabilityAssignments: {
                  include: {
                    capability: true
                  }
                }
              }
            }
          }
        },
        sessions: {
          where: {
            expires: {
              gt: new Date()
            }
          },
          orderBy: {
            expires: 'desc'
          },
          take: 5
        }
      }
    })
    
    if (!user) {
      console.log('❌ User manager.tik@dsm.com not found')
      return
    }
    
    console.log('👤 User:', user.email)
    console.log('   Name:', user.firstName, user.lastName)
    console.log('   ID:', user.id)
    console.log('   Active:', user.isActive ? '✅' : '❌')
    console.log('')
    
    // Show roles
    console.log('📋 Roles:')
    if (user.userRoles.length === 0) {
      console.log('   ❌ (none)')
    } else {
      user.userRoles.forEach(ur => {
        console.log(`   ✓ ${ur.role.name} (${ur.role.displayName})`)
      })
    }
    console.log('')
    
    // Get current capabilities
    const capabilities = user.userRoles.flatMap(ur =>
      ur.role.capabilityAssignments.map(ca => ca.capability.name)
    )
    
    const uniqueCapabilities = [...new Set(capabilities)]
    
    console.log('🔑 Capabilities in Database:')
    if (uniqueCapabilities.length === 0) {
      console.log('   ❌ (none)')
    } else {
      uniqueCapabilities.sort().forEach(cap => {
        console.log(`   ✓ ${cap}`)
      })
    }
    console.log(`   Total: ${uniqueCapabilities.length}`)
    
    // Check for DASHBOARD_VIEW
    const hasDashboardView = uniqueCapabilities.includes('DASHBOARD_VIEW')
    console.log(`\n📊 DASHBOARD_VIEW in database: ${hasDashboardView ? '✅ Present' : '❌ Missing'}`)
    
    // Check sessions
    console.log('\n\n🔐 Active Sessions:')
    if (user.sessions.length === 0) {
      console.log('   ℹ️  No active sessions found')
      console.log('   → User needs to logout and login again to refresh capabilities')
    } else {
      console.log(`   Found ${user.sessions.length} active session(s):`)
      user.sessions.forEach((session, index) => {
        const expiresIn = Math.round((new Date(session.expires).getTime() - Date.now()) / 1000 / 60)
        console.log(`\n   ${index + 1}. Session ID: ${session.sessionToken.substring(0, 20)}...`)
        console.log(`      Expires: ${session.expires.toLocaleString()}`)
        console.log(`      Expires in: ${expiresIn} minutes`)
      })
      
      console.log('\n   ⚠️  NOTE: Active sessions may have OLD capabilities cached!')
      console.log('   → Solution: User must LOGOUT and LOGIN again')
      console.log('   → Or wait for auto-refresh (happens every 1 minute)')
    }
    
    // Recommendations
    console.log('\n\n💡 RECOMMENDATIONS:')
    console.log('=' .repeat(80))
    
    if (!hasDashboardView) {
      console.log('❌ DASHBOARD_VIEW capability is missing in database')
      console.log('   → Need to add DASHBOARD_VIEW to the "manager" role')
    } else {
      console.log('✅ DASHBOARD_VIEW capability exists in database')
      
      if (user.sessions.length > 0) {
        console.log('⚠️  But user has active sessions with potentially OLD capabilities')
        console.log('')
        console.log('   SOLUTION OPTIONS:')
        console.log('   1. Ask user to LOGOUT and LOGIN again (immediate fix)')
        console.log('   2. Wait 1 minute for auto-refresh (automatic)')
        console.log('   3. Delete all sessions to force re-login:')
        console.log(`      DELETE FROM sessions WHERE "userId" = '${user.id}';`)
      } else {
        console.log('✅ No active sessions - user will get fresh capabilities on next login')
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the check
checkSessionCapabilities()
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })

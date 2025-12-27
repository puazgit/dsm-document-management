import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function debugSessionFlow() {
  console.log('🔍 DEBUGGING SESSION FLOW FOR manager.tik@dsm.com')
  console.log('=' .repeat(80))
  
  try {
    const email = 'manager.tik@dsm.com'
    
    // Step 1: Check user in database
    console.log('\n📝 STEP 1: User in Database')
    console.log('-'.repeat(80))
    
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        group: true,
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
        }
      }
    })
    
    if (!user) {
      console.log('❌ User not found!')
      return
    }
    
    console.log('✅ User found:')
    console.log(`   Email: ${user.email}`)
    console.log(`   ID: ${user.id}`)
    console.log(`   Name: ${user.firstName} ${user.lastName}`)
    console.log(`   Active: ${user.isActive}`)
    console.log(`   Group: ${user.group?.name || 'none'}`)
    
    // Step 2: Check roles
    console.log('\n📝 STEP 2: User Roles')
    console.log('-'.repeat(80))
    
    if (user.userRoles.length === 0) {
      console.log('❌ No active roles assigned!')
    } else {
      console.log(`✅ Found ${user.userRoles.length} role(s):`)
      user.userRoles.forEach((ur, i) => {
        console.log(`\n   ${i + 1}. ${ur.role.name}`)
        console.log(`      Display: ${ur.role.displayName}`)
        console.log(`      Active: ${ur.isActive}`)
        console.log(`      Role ID: ${ur.roleId}`)
      })
    }
    
    // Step 3: Check capabilities
    console.log('\n📝 STEP 3: Capabilities')
    console.log('-'.repeat(80))
    
    const capabilities = user.userRoles.flatMap(ur =>
      ur.role.capabilityAssignments.map(ca => ({
        name: ca.capability.name,
        id: ca.capability.id,
        category: ca.capability.category
      }))
    )
    
    const uniqueCapabilities = Array.from(
      new Map(capabilities.map(c => [c.name, c])).values()
    )
    
    if (uniqueCapabilities.length === 0) {
      console.log('❌ No capabilities found!')
    } else {
      console.log(`✅ Found ${uniqueCapabilities.length} unique capability(ies):`)
      uniqueCapabilities.sort((a, b) => a.name.localeCompare(b.name)).forEach((cap, i) => {
        const isDashboardView = cap.name === 'DASHBOARD_VIEW'
        console.log(`   ${i + 1}. ${cap.name} ${isDashboardView ? '🎯' : ''}`)
        console.log(`      Category: ${cap.category || 'none'}`)
      })
      
      const hasDashboardView = uniqueCapabilities.some(c => c.name === 'DASHBOARD_VIEW')
      console.log(`\n   🎯 DASHBOARD_VIEW: ${hasDashboardView ? '✅ PRESENT' : '❌ MISSING'}`)
    }
    
    // Step 4: Simulate JWT callback
    console.log('\n📝 STEP 4: Simulating JWT Callback (what NextAuth will load)')
    console.log('-'.repeat(80))
    
    const userForJWT = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        userRoles: {
          where: { isActive: true },
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true
                  }
                },
                capabilityAssignments: {
                  include: {
                    capability: true
                  }
                }
              }
            }
          }
        }
      }
    })
    
    if (userForJWT) {
      // Simulate what JWT callback does
      const primaryRole = userForJWT.userRoles?.[0]?.role?.name || 'user'
      
      const permissions = userForJWT.userRoles.flatMap(userRole => 
        userRole.role.rolePermissions.map(rp => rp.permission.name)
      )
      const uniquePermissions = [...new Set(permissions)]
      
      const jwtCapabilities = userForJWT.userRoles.flatMap(userRole =>
        userRole.role.capabilityAssignments.map(ca => ca.capability.name)
      )
      const uniqueJWTCapabilities = [...new Set(jwtCapabilities)]
      
      console.log('✅ JWT Token would contain:')
      console.log(`   user.id: ${userForJWT.id}`)
      console.log(`   user.role: ${primaryRole}`)
      console.log(`   permissions: [${uniquePermissions.length} items]`)
      console.log(`   capabilities: [${uniqueJWTCapabilities.length} items]`)
      
      console.log('\n   Capabilities array:')
      uniqueJWTCapabilities.sort().forEach(cap => {
        const isDashboardView = cap === 'DASHBOARD_VIEW'
        console.log(`      - "${cap}"${isDashboardView ? ' 🎯' : ''}`)
      })
      
      const jwtHasDashboardView = uniqueJWTCapabilities.includes('DASHBOARD_VIEW')
      console.log(`\n   🎯 DASHBOARD_VIEW in JWT: ${jwtHasDashboardView ? '✅ WILL BE PRESENT' : '❌ WILL BE MISSING'}`)
    }
    
    // Step 5: Check existing sessions
    console.log('\n📝 STEP 5: Existing Sessions in Database')
    console.log('-'.repeat(80))
    
    const sessions = await prisma.session.findMany({
      where: {
        userId: user.id,
        expires: {
          gt: new Date()
        }
      },
      orderBy: {
        expires: 'desc'
      }
    })
    
    if (sessions.length === 0) {
      console.log('✅ No active sessions (clean slate)')
      console.log('   → User will get fresh capabilities on next login')
    } else {
      console.log(`⚠️  Found ${sessions.length} active session(s):`)
      sessions.forEach((session, i) => {
        const expiresIn = Math.round((new Date(session.expires).getTime() - Date.now()) / 1000 / 60)
        console.log(`\n   ${i + 1}. Token: ${session.sessionToken.substring(0, 30)}...`)
        console.log(`      Expires: ${session.expires.toLocaleString()}`)
        console.log(`      Expires in: ${expiresIn} minutes`)
      })
      
      console.log('\n   ⚠️  These sessions may have OLD cached capabilities!')
    }
    
    // Step 6: Final diagnosis
    console.log('\n\n📋 DIAGNOSIS & SOLUTION')
    console.log('=' .repeat(80))
    
    const dbHasCap = uniqueCapabilities.some(c => c.name === 'DASHBOARD_VIEW')
    
    if (!dbHasCap) {
      console.log('❌ PROBLEM: DASHBOARD_VIEW capability is MISSING in database')
      console.log('\n   SOLUTION:')
      console.log('   1. Add DASHBOARD_VIEW capability to "manager" role')
      console.log('   2. Then user must logout and login again')
    } else if (sessions.length > 0) {
      console.log('⚠️  PROBLEM: Database is correct but sessions are OLD')
      console.log('\n   Database has: ✅ DASHBOARD_VIEW')
      console.log('   But sessions may cache OLD capabilities (without DASHBOARD_VIEW)')
      console.log('\n   SOLUTION OPTIONS:')
      console.log('   A. User: LOGOUT and LOGIN again (recommended)')
      console.log('   B. Wait 1 minute for auto-refresh')
      console.log('   C. Force session deletion:')
      console.log(`      npx prisma db execute --stdin <<< "DELETE FROM sessions WHERE \\"userId\\" = '${user.id}';"`)
    } else {
      console.log('✅ Everything looks correct!')
      console.log('\n   Database has: ✅ DASHBOARD_VIEW')
      console.log('   Sessions: ✅ None (clean)')
      console.log('   JWT will load: ✅ DASHBOARD_VIEW')
      console.log('\n   If user still gets error:')
      console.log('   1. Clear browser cache/cookies')
      console.log('   2. Use incognito/private window')
      console.log('   3. Check browser console for actual error')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

debugSessionFlow()
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })

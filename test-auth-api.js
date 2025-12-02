#!/usr/bin/env node

async function testAuthAndAPI() {
  console.log('🔐 Testing Authentication and API Access...\n')
  
  try {
    const BASE_URL = 'http://localhost:3000'
    
    // 1. Test session first
    console.log('1️⃣ Checking current session...')
    const sessionResponse = await fetch(`${BASE_URL}/api/auth/session`)
    const sessionData = await sessionResponse.json()
    
    console.log('Session status:', sessionResponse.status)
    console.log('Session data:', sessionData)
    
    if (!sessionData.user) {
      console.log('\n⚠️  No active session. User needs to login first.')
      console.log('Please login at: http://localhost:3000/auth/login')
      console.log('Credentials: admin@dsm.com / admin123')
      return
    }
    
    // 2. Test API users access
    console.log('\n2️⃣ Testing /api/users access...')
    const usersResponse = await fetch(`${BASE_URL}/api/users?page=1&limit=10`)
    
    console.log('Users API status:', usersResponse.status)
    
    if (!usersResponse.ok) {
      const errorText = await usersResponse.text()
      console.log('❌ Users API Error:', errorText)
    } else {
      const usersData = await usersResponse.json()
      console.log('✅ Users API Success:', {
        totalUsers: usersData.users?.length || 0,
        currentPage: usersData.page,
        totalPages: usersData.totalPages
      })
    }
    
    // 3. Test API roles access
    console.log('\n3️⃣ Testing /api/roles access...')
    const rolesResponse = await fetch(`${BASE_URL}/api/roles`)
    
    console.log('Roles API status:', rolesResponse.status)
    
    if (!rolesResponse.ok) {
      const errorText = await rolesResponse.text()
      console.log('❌ Roles API Error:', errorText)
    } else {
      const rolesData = await rolesResponse.json()
      console.log('✅ Roles API Success:', {
        totalRoles: Array.isArray(rolesData) ? rolesData.length : 0
      })
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message)
  }
}

testAuthAndAPI()
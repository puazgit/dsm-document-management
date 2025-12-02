#!/usr/bin/env node
/**
 * Simple login test script
 */

const BASE_URL = 'http://localhost:3001'

async function testLogin() {
  console.log('🔐 Testing login and role assignment...\n')
  
  try {
    // 1. Get CSRF token first
    console.log('1️⃣ Getting CSRF token...')
    const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`)
    if (!csrfResponse.ok) {
      throw new Error(`CSRF Error: ${csrfResponse.status}`)
    }
    
    const { csrfToken } = await csrfResponse.json()
    console.log(`✅ Got CSRF token: ${csrfToken.substring(0, 20)}...`)
    
    // 2. Try login
    console.log('\n2️⃣ Attempting login...')
    const loginResponse = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        csrfToken,
        email: 'admin@dsm.com',
        password: 'admin123',
        callbackUrl: '/admin/users',
        json: 'true'
      }),
    })
    
    console.log(`Login status: ${loginResponse.status}`)
    
    if (loginResponse.ok) {
      console.log('✅ Login successful')
      
      // 3. Test API access
      console.log('\n3️⃣ Testing API roles access...')
      const rolesResponse = await fetch(`${BASE_URL}/api/roles`, {
        headers: {
          'Cookie': loginResponse.headers.get('set-cookie') || ''
        }
      })
      
      console.log(`Roles API status: ${rolesResponse.status}`)
      
      if (rolesResponse.ok) {
        const roles = await rolesResponse.json()
        console.log(`✅ Got ${Array.isArray(roles) ? roles.length : 0} roles`)
      } else {
        const error = await rolesResponse.text()
        console.log(`❌ Roles API Error: ${error}`)
      }
    } else {
      const loginError = await loginResponse.text()
      console.log(`❌ Login failed: ${loginError}`)
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message)
  }
}

// Run the test
testLogin()
#!/usr/bin/env node
/**
 * Test script untuk mengecek API role assignment
 */

const BASE_URL = 'http://localhost:3001'

async function testRoleAssignmentAPI() {
  console.log('🧪 Testing Role Assignment API...\n')
  
  try {
    // 1. Test GET /api/roles
    console.log('1️⃣ Testing GET /api/roles...')
    const rolesResponse = await fetch(`${BASE_URL}/api/roles`)
    console.log(`Status: ${rolesResponse.status}`)
    
    if (!rolesResponse.ok) {
      const errorText = await rolesResponse.text()
      console.log(`❌ Error: ${errorText}`)
      return
    }
    
    const roles = await rolesResponse.json()
    console.log(`✅ Found ${Array.isArray(roles) ? roles.length : 0} roles`)
    
    // 2. Test GET /api/users
    console.log('\n2️⃣ Testing GET /api/users...')
    const usersResponse = await fetch(`${BASE_URL}/api/users`)
    console.log(`Status: ${usersResponse.status}`)
    
    if (!usersResponse.ok) {
      const errorText = await usersResponse.text()
      console.log(`❌ Error: ${errorText}`)
      return
    }
    
    const usersData = await usersResponse.json()
    const users = usersData.users || []
    console.log(`✅ Found ${users.length} users`)
    
    // 3. Test specific user role assignment (if we have users and roles)
    if (users.length > 0 && Array.isArray(roles) && roles.length > 0) {
      const testUser = users[0]
      const testRole = roles[0]
      
      console.log(`\n3️⃣ Testing POST /api/users/${testUser.id}/roles...`)
      console.log(`Assigning role "${testRole.displayName}" to user "${testUser.firstName} ${testUser.lastName}"`)
      
      const assignResponse = await fetch(`${BASE_URL}/api/users/${testUser.id}/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roleId: testRole.id }),
      })
      
      console.log(`Status: ${assignResponse.status}`)
      
      if (!assignResponse.ok) {
        const errorData = await assignResponse.json()
        console.log(`❌ Assignment Error:`, errorData)
      } else {
        const result = await assignResponse.json()
        console.log(`✅ Assignment Success:`, result.message)
      }
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message)
  }
}

// Run the test
testRoleAssignmentAPI()
/**
 * Simple Admin Test - Direct API Testing
 * Testing admin@dsm.com access to document APIs directly
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testDirectLogin() {
  console.log('🔐 Testing Direct Login API...');
  
  try {
    // Test with test-login API endpoint that's available
    const response = await axios({
      method: 'POST',
      url: `${BASE_URL}/api/test-login`,
      data: {
        email: 'admin@dsm.com',
        password: 'admin123'
      },
      validateStatus: () => true
    });
    
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, response.data);
    
    if (response.data?.success) {
      console.log('✅ Direct login successful');
      return response.data.user;
    } else {
      console.log('❌ Direct login failed');
      return null;
    }
  } catch (error) {
    console.log(`❌ Direct login error: ${error.message}`);
    return null;
  }
}

async function testApiWithAuth() {
  console.log('\n📊 Testing API Endpoints...');
  
  // Test endpoints that should work for admin
  const endpoints = [
    '/api/users',
    '/api/documents', 
    '/api/analytics',
    '/api/admin/dashboard'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint}...`);
      
      const response = await axios({
        method: 'GET',
        url: `${BASE_URL}${endpoint}`,
        validateStatus: () => true
      });
      
      console.log(`  ${endpoint}: ${response.status} - ${response.status < 400 ? '✅' : '❌'}`);
      
      if (response.status === 401) {
        console.log('  → Requires authentication');
      } else if (response.status === 403) {
        console.log('  → Access denied (role issue)');
      } else if (response.status === 200) {
        console.log('  → Success');
      }
      
    } catch (error) {
      console.log(`  ${endpoint}: Error - ${error.message}`);
    }
  }
}

async function testRoleConsistency() {
  console.log('\n🔍 Testing Role Consistency...');
  
  try {
    // Check what roles are actually in the database
    const response = await axios({
      method: 'GET', 
      url: `${BASE_URL}/api/debug-auth`,
      validateStatus: () => true
    });
    
    console.log(`Debug auth status: ${response.status}`);
    if (response.data) {
      console.log('Auth debug data:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.log(`❌ Role consistency check failed: ${error.message}`);
  }
}

async function main() {
  console.log('🧪 SIMPLE ADMIN ACCESS TEST');
  console.log('=' .repeat(50));
  
  const user = await testDirectLogin();
  await testApiWithAuth();
  await testRoleConsistency();
  
  console.log('\n📋 Test Complete');
}

main().catch(console.error);
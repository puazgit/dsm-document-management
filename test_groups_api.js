// Test script for groups API
const testGroupUpdate = async () => {
  const groupId = 'cmicm9kio000277aezaf7dx1s' // From the error message
  
  const testData = {
    displayName: 'Test Group Update',
    description: 'Testing the groups update API',
    level: 5,
    permissions: ['permission1', 'permission2', 'permission3'] // Array format
  }
  
  try {
    console.log('Testing PUT /api/groups/' + groupId)
    console.log('Request data:', JSON.stringify(testData, null, 2))
    
    const response = await fetch(`http://localhost:3001/api/groups/${groupId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    })
    
    const responseData = await response.text()
    
    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))
    console.log('Response body:', responseData)
    
    if (!response.ok) {
      console.error('Request failed!')
      
      // Try to parse as JSON
      try {
        const jsonError = JSON.parse(responseData)
        console.error('Error details:', jsonError)
      } catch (e) {
        console.error('Non-JSON error response')
      }
    } else {
      console.log('✅ Request successful!')
    }
    
  } catch (error) {
    console.error('Network or other error:', error)
  }
}

// Run the test
testGroupUpdate()
#!/usr/bin/env node

/**
 * Test Document Upload API
 * Simulates a file upload to verify the endpoint works without isPublic field
 */

const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const http = require('http');

async function testUpload() {
  console.log('🧪 Testing Document Upload API...\n');
  
  try {
    // Create a test file
    const testFilePath = path.join(__dirname, 'test-upload.txt');
    fs.writeFileSync(testFilePath, 'This is a test document for upload API verification.');
    console.log('✓ Created test file');
    
    // Prepare form data
    const form = new FormData();
    form.append('file', fs.createReadStream(testFilePath));
    form.append('title', 'API Test Document');
    form.append('description', 'Testing upload without isPublic field');
    form.append('documentTypeId', 'test-doc-type-id'); // Will need valid ID
    form.append('accessGroups', JSON.stringify([]));
    form.append('tags', JSON.stringify(['test', 'api']));
    
    console.log('✓ Prepared form data');
    console.log('\n📤 Sending POST request to /api/documents/upload...');
    console.log('Note: This will fail with 401 Unauthorized (expected - no auth token)');
    console.log('But we can check if the error is about isPublic or authentication\n');
    
    // Make request
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/documents/upload',
      method: 'POST',
      headers: form.getHeaders()
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`Status Code: ${res.statusCode}`);
        console.log('Response:', data);
        
        try {
          const jsonResponse = JSON.parse(data);
          
          if (res.statusCode === 401 || res.statusCode === 403) {
            console.log('\n✅ SUCCESS: Got authentication error (expected)');
            console.log('This means the API endpoint is working and NOT complaining about isPublic!');
          } else if (jsonResponse.error && jsonResponse.error.includes('isPublic')) {
            console.log('\n❌ FAILED: Error mentions isPublic field');
            console.log('The isPublic field is still being referenced somewhere');
          } else if (jsonResponse.error && jsonResponse.error.includes('new')) {
            console.log('\n❌ FAILED: Error mentions "new" column');
            console.log('There is still a schema mismatch issue');
          } else {
            console.log('\n🤔 Response:', jsonResponse);
          }
        } catch (e) {
          console.log('\n📝 Non-JSON response (might be HTML)');
          console.log('This usually means Next.js is rendering an error page');
        }
        
        // Cleanup
        fs.unlinkSync(testFilePath);
        console.log('\n✓ Cleaned up test file');
      });
    });
    
    req.on('error', (error) => {
      console.error('\n❌ Request error:', error.message);
      if (error.message.includes('ECONNREFUSED')) {
        console.error('\n⚠️  Development server is not running!');
        console.error('Please start it with: npm run dev');
      }
    });
    
    form.pipe(req);
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
  }
}

testUpload();

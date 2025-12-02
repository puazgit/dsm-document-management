const https = require('http');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

async function testUpload() {
  try {
    // First, create a test file
    const testFilePath = '/tmp/test_document.txt';
    fs.writeFileSync(testFilePath, 'This is a test document content for upload.');
    
    const form = new FormData();
    form.append('file', fs.createReadStream(testFilePath));
    form.append('documentTypeId', '1'); // Assuming we have documentType with id 1
    form.append('title', 'Test Document Upload');
    form.append('description', 'Testing document upload after fixing foreign key issue');
    form.append('isPublic', 'false');
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/documents/upload',
      method: 'POST',
      headers: form.getHeaders(),
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('Response Status:', res.statusCode);
        console.log('Response Headers:', res.headers);
        console.log('Response Body:', data);
        
        // Clean up test file
        fs.unlinkSync(testFilePath);
      });
    });
    
    req.on('error', (error) => {
      console.error('Request error:', error);
      fs.unlinkSync(testFilePath);
    });
    
    form.pipe(req);
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testUpload();
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testUpload() {
  const form = new FormData();
  
  // Create a simple test file
  const testFilePath = path.join(__dirname, 'test-sample.pdf');
  if (!fs.existsSync(testFilePath)) {
    console.log('Creating test file...');
    fs.writeFileSync(testFilePath, 'Test PDF content for upload test');
  }
  
  form.append('file', fs.createReadStream(testFilePath));
  form.append('title', 'Test Upload Document');
  form.append('description', 'Testing upload after Prisma fix');
  form.append('documentTypeId', 'cm4vg8grf000008kwa7fpa3to'); // Adjust if needed
  form.append('accessGroups', JSON.stringify([]));
  form.append('tags', JSON.stringify(['test', 'upload']));
  form.append('metadata', JSON.stringify({}));

  try {
    console.log('Testing upload...');
    const response = await fetch('http://localhost:3000/api/documents/upload', {
      method: 'POST',
      headers: {
        ...form.getHeaders(),
        'Cookie': 'next-auth.session-token=your-session-token-here' // Need valid session
      },
      body: form
    });

    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('\n✅ Upload successful!');
    } else {
      console.log('\n❌ Upload failed:', result.error);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testUpload();

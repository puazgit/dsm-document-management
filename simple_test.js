#!/usr/bin/env node

// Simple test script to check document upload
const fs = require('fs');

async function testWithCurl() {
  const testFile = '/tmp/test_doc.txt';
  fs.writeFileSync(testFile, 'Test document content');
  
  console.log('Testing document upload without authentication...');
  console.log('File created at:', testFile);
  console.log('\nTo test manually, use this curl command:');
  console.log(`curl -X POST "http://localhost:3000/api/documents/upload" \\`);
  console.log(`  -F "file=@${testFile}" \\`);
  console.log(`  -F "documentTypeId=1" \\`);
  console.log(`  -F "title=Test Document" \\`);
  console.log(`  -F "description=Test upload" \\`);
  console.log(`  -F "isPublic=false"`);
  console.log('\nThis should show authentication error (401), which is expected.\n');
}

testWithCurl();
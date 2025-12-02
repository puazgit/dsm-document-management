console.log('🧪 Testing PDF Download in Modal');
console.log('================================\n');

// Test specifically for modal PDF download button
function testModalPDFDownload() {
  console.log('Testing modal PDF download functionality...\n');

  // Check environment
  console.log('Environment Check:');
  console.log('- typeof window:', typeof window);
  console.log('- typeof document:', typeof document);
  console.log('- typeof window.document:', typeof window?.document);

  if (typeof window === 'undefined') {
    console.log('❌ Not in browser environment - this is the problem!');
    return;
  }

  // Test document.createElement functionality
  try {
    const testElement = document.createElement('a');
    console.log('✅ document.createElement works');
    
    // Simulate the download process used in modal
    const testBlob = new Blob(['Test PDF content'], { type: 'application/pdf' });
    const testUrl = window.URL.createObjectURL(testBlob);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = testUrl;
    downloadLink.download = 'test-modal-download.pdf';
    downloadLink.style.display = 'none';
    
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    window.URL.revokeObjectURL(testUrl);
    
    console.log('✅ Modal PDF download simulation successful');
    
  } catch (error) {
    console.error('❌ Modal PDF download test failed:', error);
    console.error('Error details:', error.message);
  }
}

// Instructions for testing
console.log('🎯 To test the modal PDF download:');
console.log('================================');
console.log('1. Login to http://localhost:3000/auth/login');
console.log('2. Go to http://localhost:3000/documents');
console.log('3. Click on "Preview PDF" for any PDF document');
console.log('4. In the modal, click "Preview" tab');
console.log('5. Click the green "Download PDF" button at bottom');
console.log('6. Check browser console for errors');
console.log('');

console.log('🔍 Expected behavior:');
console.log('- No "document.createElement is not a function" errors');
console.log('- PDF should download successfully');
console.log('- Console should show success messages');
console.log('');

// Run the test if in browser
if (typeof window !== 'undefined') {
  testModalPDFDownload();
} else {
  console.log('⚠️ This script needs to run in browser environment');
  console.log('Copy and paste into browser console when on the documents page');
}

// Export for use in React component if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testModalPDFDownload };
}
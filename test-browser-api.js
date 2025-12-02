// Simple client-side test for document.createElement
console.log('🧪 Client-side Document API Test');
console.log('===============================\n');

// Test if we're in browser environment
console.log('Environment Check:');
console.log('- typeof window:', typeof window);
console.log('- typeof document:', typeof document);
console.log('- typeof window?.document:', typeof window?.document);

if (typeof window !== 'undefined') {
  console.log('\n✅ Running in browser environment');
  
  // Test document.createElement
  try {
    const testElement = document.createElement('a');
    console.log('✅ document.createElement works:', testElement.tagName);
    
    // Test download functionality simulation
    const testBlob = new Blob(['test content'], { type: 'text/plain' });
    const testUrl = window.URL.createObjectURL(testBlob);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = testUrl;
    downloadLink.download = 'test.txt';
    
    console.log('✅ Download link creation works');
    
    // Clean up
    window.URL.revokeObjectURL(testUrl);
    
  } catch (error) {
    console.error('❌ Document API test failed:', error);
  }
  
} else {
  console.log('❌ Not in browser environment (SSR/Node.js)');
}

console.log('\nNext steps:');
console.log('1. Include this script in a client-side component');
console.log('2. Check browser console for results'); 
console.log('3. If this works, the issue might be in component loading/importing');
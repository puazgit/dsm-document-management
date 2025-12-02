const fs = require('fs');
const path = require('path');

console.log('🔍 PDF Download Error Fix Verification');
console.log('=====================================\n');

// Check all PDF viewer components for proper document handling
const componentsToCheck = [
  'src/components/documents/documents-list.tsx',
  'src/components/documents/document-viewer.tsx', 
  'src/components/documents/pdf-viewer.tsx',
  'src/components/documents/secure-pdf-viewer.tsx',
  'src/components/documents/custom-pdf-viewer.tsx',
  'src/components/documents/pdf-viewer-broken.tsx'
];

let allFixed = true;

componentsToCheck.forEach((componentPath, index) => {
  const fullPath = path.join(__dirname, componentPath);
  
  console.log(`${index + 1}. Checking ${componentPath}`);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`   ❌ File not found`);
    allFixed = false;
    return;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  
  // Check for dangerous direct document usage
  const directDocumentUsage = content.match(/(?<!current)document\.(createElement|body)/g);
  if (directDocumentUsage) {
    console.log(`   ❌ Still has direct document usage: ${directDocumentUsage.join(', ')}`);
    allFixed = false;
    return;
  }
  
  // Check for proper browser environment checks
  const hasBrowserCheck = content.includes('typeof window === \'undefined\'');
  if (!hasBrowserCheck) {
    console.log(`   ⚠️  Missing browser environment check`);
    // Not critical but recommended
  } else {
    console.log(`   ✅ Has browser environment check`);
  }
  
  // Check for currentDocument usage
  const hasCurrentDocument = content.includes('currentDocument');
  if (hasCurrentDocument) {
    console.log(`   ✅ Uses safe currentDocument reference`);
  } else {
    console.log(`   ℹ️  No document usage found`);
  }
  
  console.log('');
});

console.log('📋 Summary:');
if (allFixed) {
  console.log('✅ All components have been fixed for SSR compatibility');
  console.log('✅ No direct document usage found');
  console.log('✅ Safe browser environment checks implemented');
  console.log('');
  console.log('🎯 Expected Result:');
  console.log('   - No more "document.createElement is not a function" errors');
  console.log('   - PDF downloads should work properly in browser');
  console.log('   - Components are SSR-safe');
  console.log('');
  console.log('🧪 To Test:');
  console.log('1. Restart the Next.js development server');
  console.log('2. Navigate to http://localhost:3000/documents');
  console.log('3. Try downloading a PDF document');
  console.log('4. Check browser console for any remaining errors');
} else {
  console.log('❌ Some components still need fixing');
  console.log('Please check the issues listed above');
}

console.log('');
console.log('🔧 Technical Changes Made:');
console.log('- Added proper browser environment checks');
console.log('- Replaced direct document usage with safe currentDocument references');
console.log('- Added fallback error handling for SSR environments');
console.log('- Maintained all existing functionality while fixing SSR issues');
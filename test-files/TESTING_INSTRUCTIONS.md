# DSMT File Upload Testing Instructions

## Test Files Created
The following dummy files have been created in `/test-files/` directory for testing upload functionality:

### 1. Text Documents
- **sample-document.txt** (1.2KB) - Basic text file with sample content
- **dsmt-test-report.md** (1.8KB) - Markdown format technical documentation

### 2. Data Files  
- **employee-data.csv** (1.3KB) - CSV format spreadsheet data
- **system-config.json** (1.9KB) - JSON configuration file

### 3. Web & Media Files
- **test-policy.html** (2.3KB) - HTML document with styling
- **test-logo.svg** (697B) - SVG image file
- **sample.env** (349B) - Environment configuration file

## Testing Steps

### Step 1: Access Upload Page
1. Navigate to `http://localhost:3000/documents`
2. Click "Upload Document" button
3. Upload modal should appear

### Step 2: Test Different File Types
Try uploading each file type to verify:
- ✅ File type validation (should accept all created files)
- ✅ File size validation (all files are under 50MB limit)  
- ✅ Progress tracking during upload
- ✅ Success notification after upload
- ✅ File appears in documents list

### Step 3: Test Upload Features
For each file, test:
1. **Drag & Drop**: Drag file from finder to upload area
2. **Click Upload**: Click to browse and select file
3. **Metadata**: Fill in title, description, document type, tags
4. **Permissions**: Test public/private settings
5. **Progress**: Verify upload progress bar works

### Step 4: Verify Storage
After successful uploads:
1. Check files are stored in `uploads/documents/` directory
2. Verify database entries are created
3. Test file download functionality
4. Verify metadata is saved correctly

### Expected Results
- All file types should upload successfully
- Upload progress should be displayed
- Files should be accessible after upload
- Metadata should be editable
- File download should work properly

## Test Data for Form Fields

### Sample Metadata
- **Title**: Use filename without extension
- **Description**: "Test upload of [file_type] format"  
- **Document Type**: Select appropriate type from dropdown
- **Tags**: test, upload, dummy, dsmt, [file_format]
- **Access**: Toggle between public/private

### Document Types to Test
- Technical Documentation (for .md, .html files)
- Spreadsheets (for .csv files)
- Configuration Files (for .json, .env files)
- Images (for .svg files)
- Text Documents (for .txt files)

## Troubleshooting
If upload fails:
1. Check file size (must be under 50MB)
2. Verify file type is supported
3. Check network connection
4. Ensure user is authenticated
5. Check browser console for errors

## Clean Up
After testing, you can:
1. Delete test files from documents page
2. Remove test files from `test-files/` directory
3. Clean up database entries if needed

---
Created: October 22, 2025
Purpose: Testing DSMT file upload functionality
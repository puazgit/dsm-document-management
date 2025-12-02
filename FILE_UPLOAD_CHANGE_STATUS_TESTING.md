# Test File Upload pada Change Status Modal

## Fitur yang Telah Diimplementasikan

### 1. 📁 **File Upload dalam Modal Change Status**
- **Upload Area**: Drag & drop atau click untuk memilih file
- **File Types**: PDF, DOC, DOCX, TXT, MD files
- **Size Limit**: Maximum 10MB per file
- **File Preview**: Menampilkan nama file dan ukuran setelah dipilih
- **Progress Indicator**: Loading bar saat upload berlangsung

### 2. 🔄 **API Integration**
- **Upload Endpoint**: `/api/documents/[id]/upload`
- **Status Change**: `/api/documents/[id]/status` (updated untuk menangani file)
- **Sequential Processing**: File upload dulu, kemudian status change
- **Error Handling**: Rollback jika salah satu step gagal

### 3. 📊 **Document History Tracking**
- **File Changes**: Otomatis track perubahan file dengan `file_replaced` action
- **Status Changes**: Enhanced dengan informasi file update
- **Metadata**: Menyimpan informasi file lama dan baru
- **Timeline**: Menampilkan riwayat lengkap dalam Document History

### 4. 🔐 **Security & Permissions**
- **Role-based Access**: Hanya user dengan permission yang tepat bisa upload
- **File Validation**: Type dan size checking di server
- **Path Security**: Unique filename generation untuk menghindari conflicts
- **Owner Rights**: Document owner selalu bisa update file

## Testing Steps

### Prerequisites
1. Server running di http://localhost:3001
2. Login sebagai user dengan permission documents.update atau owner dokumen
3. Dokumen harus dalam status yang memungkinkan status change

### Test Scenarios

#### 1. **Upload File saat Change Status**
1. Buka halaman documents
2. Klik menu (⋮) pada salah satu dokumen
3. Pilih status change (misalnya DRAFT → PENDING_REVIEW)
4. Di modal yang muncul:
   - Klik area "Click to upload new document file"
   - Pilih file PDF/DOC/DOCX (max 10MB)
   - File preview akan muncul dengan nama dan ukuran
   - Tambahkan comment (optional)
   - Klik "Confirm Change"

#### 2. **Status Change tanpa File**
1. Ikuti langkah 1-3 di atas
2. Skip upload file, langsung isi comment
3. Klik "Confirm Change"
4. Verify hanya status yang berubah di history

#### 3. **File Validation**
1. Coba upload file > 10MB → Should show error
2. Coba upload file type tidak supported → Should show error
3. Coba upload file valid → Should work

#### 4. **History Verification**
1. Setelah upload file + change status
2. Klik tombol "History" pada dokumen
3. Verify ada 2 entries:
   - `file_replaced`: File updated from old.pdf to new.pdf
   - `status_changed`: Status changed from DRAFT to PENDING_REVIEW (file also updated)

### Expected Results

#### ✅ **Success Cases**
- File ter-upload dengan unique filename
- Document file info terupdate di database
- Status berubah sesuai pilihan
- History entries ter-record dengan benar
- Success notification muncul
- Modal tertutup otomatis

#### ❌ **Error Cases**
- File size > 10MB: "File size exceeds 10MB limit"
- Invalid file type: "Invalid file type. Only PDF, DOC, DOCX, TXT, and MD files are allowed"
- Upload failed: Rollback, status tidak berubah
- Permission denied: "Insufficient permissions"

### File Structure After Upload
```
uploads/
  documents/
    1733135123456-sample_document.pdf  # timestamp-filename
    1733135234567-policy_update.docx
```

### Database Changes
```sql
-- Document table updated
UPDATE documents SET
  fileName = 'new_file.pdf',
  filePath = 'uploads/documents/1733135123456-new_file.pdf',
  fileSize = 2048576,
  fileType = 'pdf',
  mimeType = 'application/pdf',
  updatedAt = NOW(),
  updatedById = 'user_id'
WHERE id = 'document_id';

-- History entries created
INSERT INTO document_history (action, changeReason, ...) VALUES
  ('file_replaced', 'File updated from old.pdf to new.pdf'),
  ('status_changed', 'Status changed from DRAFT to PENDING_REVIEW (file also updated)');
```

## Integration Points

### 🔗 **With Existing Features**
- **Document List**: Status updates reflect immediately
- **Document History**: Complete audit trail maintained  
- **Permissions**: Respects existing role-based access control
- **File Management**: Integrates with existing file storage system

### 🎯 **User Experience**
- **Single Action**: Upload file dan change status dalam satu modal
- **Progress Feedback**: Loading states dan progress indicators
- **Error Handling**: Clear error messages dengan suggested actions
- **Responsive Design**: Works di desktop dan mobile

Fitur file upload pada modal change status sudah **fully implemented dan ready untuk testing**! 🚀
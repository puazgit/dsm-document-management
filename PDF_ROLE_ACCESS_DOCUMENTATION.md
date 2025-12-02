# PDF Role-Based Access Control Implementation

## Overview

Sistem ini mengimplementasikan kontrol akses berbasis role untuk dokumen PDF, memungkinkan administrator untuk mengatur siapa yang dapat melihat, mendownload, mencetak, atau menyalin konten PDF berdasarkan role user.

## Features Utama

### 1. Role-Based Permissions
- **Admin**: Akses penuh - dapat download, print, dan copy
- **Manager**: Dapat download dan print, tetapi tidak dapat copy
- **Editor**: Dapat download saja, tidak dapat print atau copy  
- **Reviewer**: Hanya dapat melihat, tidak dapat download/print/copy
- **Viewer**: Hanya dapat melihat, tidak dapat download/print/copy
- **Guest**: Hanya dapat melihat, tidak dapat download/print/copy

### 2. Secure PDF Viewer Component
```typescript
<SecurePDFViewer
  fileUrl="/api/documents/123/view"
  fileName="document.pdf"
  userRole="viewer"
  document={documentObject}
/>
```

### 3. Dual API Endpoints

#### View Endpoint (`/api/documents/[id]/view`)
- Untuk preview PDF tanpa menambah download count
- Semua user dengan akses dapat melihat
- Increment view count, bukan download count
- Headers untuk inline viewing, bukan download

#### Download Endpoint (`/api/documents/[id]/download`)  
- Untuk download file dengan role permission check
- Hanya role tertentu yang dapat mengakses
- Increment download count
- Headers untuk file download

## Implementation Details

### 1. Component Structure

**SecurePDFViewer Component (`/src/components/documents/pdf-viewer.tsx`)**
```typescript
interface SecurePDFViewerProps {
  fileUrl: string;
  fileName: string;
  userRole: string;
  canDownload?: boolean;
  document?: any;
}
```

**Features:**
- Role badge display
- Permission indicators (Download/Print/Copy status)
- Conditional button rendering
- Security notices for restricted users
- Inline PDF preview using iframe

### 2. Backend Protection

**Download Route (`/src/app/api/documents/[id]/download/route.ts`)**
```typescript
const rolePermissions = {
  'ADMIN': { canDownload: true },
  'MANAGER': { canDownload: true },
  'EDITOR': { canDownload: true },
  'REVIEWER': { canDownload: false },
  'VIEWER': { canDownload: false },
  'GUEST': { canDownload: false }
};
```

**View Route (`/src/app/api/documents/[id]/view/route.ts`)**
- Tidak ada pembatasan role untuk viewing
- Semua user dengan akses dokumen dapat melihat
- Logging aktivitas view terpisah dari download

### 3. User Interface

**Visual Indicators:**
- Role badges dengan warna berbeda
- ✓/✗ indicators untuk permissions
- Disabled buttons untuk aksi yang tidak diizinkan
- Security notices informatif

**Permission Display:**
```
✓ Download  ✓ Print  ✗ Copy  (Manager Role)
✗ Download  ✗ Print  ✗ Copy  (Viewer Role)
```

## Security Measures

### 1. Backend Validation
- Session authentication required
- Role-based permission checks
- Document access control (public/private/group)
- File existence validation

### 2. Audit Trail
- View activities logged separately
- Download activities tracked with user info
- Activity descriptions include user role

### 3. Frontend Protection
- Conditional rendering based on permissions
- Clear user feedback for denied actions
- Separate endpoints prevent accidental downloads

## Usage Examples

### 1. Basic Implementation
```tsx
import { SecurePDFViewer } from './pdf-viewer';

function DocumentViewer({ document, userSession }) {
  return (
    <SecurePDFViewer
      fileUrl={`/api/documents/${document.id}/view`}
      fileName={document.fileName}
      userRole={userSession?.user?.role || 'viewer'}
      document={document}
    />
  );
}
```

### 2. Custom Permissions
```tsx
<SecurePDFViewer
  fileUrl="/api/documents/123/view"
  fileName="sensitive.pdf"
  userRole="editor"
  canDownload={false} // Override role permission
  document={document}
/>
```

### 3. In Document List
```tsx
<SecurePDFViewer
  fileUrl={`/api/documents/${selectedDocument.id}/view`}
  fileName={selectedDocument.fileName}
  userRole={userSession?.user?.role || 'viewer'}
  document={selectedDocument}
/>
```

## Testing

### Demo Page
Akses `/pdf-demo` untuk testing berbagai role:

1. **Role Selection**: Pilih role dari Admin hingga Guest
2. **Permission Testing**: Lihat perbedaan akses untuk setiap role  
3. **UI Feedback**: Perhatikan perubahan button dan indikator
4. **Security Notices**: Lihat pesan untuk user dengan akses terbatas

### Test Scenarios

1. **Admin User**:
   - Dapat melihat dan mendownload PDF
   - Download button aktif dan berwarna hijau
   - Semua permission indicators menunjukkan ✓

2. **Viewer User**:
   - Dapat melihat PDF dalam iframe
   - Download button disabled dan abu-abu
   - Security notice muncul menjelaskan pembatasan

3. **Manager vs Editor**:
   - Manager: dapat download dan print
   - Editor: dapat download tapi tidak print

## Configuration

### Role Hierarchy
Roles dapat dikonfigurasi dalam `rolePermissions` object:

```typescript
const rolePermissions = {
  'admin': { canDownload: true, canPrint: true, canCopy: true },
  'manager': { canDownload: true, canPrint: true, canCopy: false },
  'editor': { canDownload: true, canPrint: false, canCopy: false },
  'reviewer': { canDownload: false, canPrint: false, canCopy: false },
  'viewer': { canDownload: false, canPrint: false, canCopy: false },
  'guest': { canDownload: false, canPrint: false, canCopy: false }
};
```

### Custom Overrides
- Document owners selalu dapat mendownload
- Admin selalu dapat mendownload
- `canDownload` prop dapat override role permissions

## File Structure

```
src/
├── components/documents/
│   └── pdf-viewer.tsx              # SecurePDFViewer component
├── app/
│   ├── documents/page.tsx          # Documents page with role integration
│   ├── pdf-demo/page.tsx          # Demo page for testing
│   └── api/documents/[id]/
│       ├── view/route.ts          # View endpoint (no download count)
│       └── download/route.ts      # Download endpoint (with role check)
```

## Browser Compatibility

- **PDF Viewing**: Menggunakan iframe dengan native browser PDF viewer
- **Download Protection**: Backend validation mencegah bypass
- **Mobile Support**: Responsive design dengan touch-friendly controls

## Performance Considerations

- **Separate Endpoints**: View dan download terpisah untuk efisiensi
- **Caching Headers**: Proper cache control untuk security
- **File Streaming**: Large PDF files di-stream untuk performa optimal

## Future Enhancements

1. **Watermarking**: Tambahkan watermark berdasarkan user role
2. **Time-based Access**: Akses terbatas berdasarkan waktu
3. **IP Restrictions**: Batasi akses berdasarkan lokasi
4. **Advanced Logging**: Detail analytics untuk document access
5. **DRM Integration**: Digital Rights Management untuk protection tambahan

## Troubleshooting

### Common Issues

1. **PDF tidak muncul**:
   - Check browser PDF support
   - Verify file path dan permissions
   - Check network requests di DevTools

2. **Download tidak berfungsi**:
   - Verify user role dalam session
   - Check API endpoint response
   - Validate file existence di server

3. **Role tidak terupdate**:
   - Refresh session data
   - Check database user role assignment
   - Verify session management

### Debug Mode

Tambahkan logging untuk troubleshooting:

```typescript
console.log('User Role:', userRole);
console.log('Permissions:', currentPermissions);
console.log('Can Download:', canUserDownload);
```

## Kesimpulan

Implementasi ini memberikan kontrol granular terhadap akses PDF documents berdasarkan user role, dengan keamanan berlapis dari frontend hingga backend, user experience yang jelas, dan audit trail yang komprehensif.
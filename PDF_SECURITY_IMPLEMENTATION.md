# Advanced PDF Viewer with Download Restrictions

Implementasi lengkap client-side PDF viewer dengan pembatasan download dan fitur keamanan canggih menggunakan PDF.js dan React PDF.

## 🔒 Fitur Keamanan

### 1. **Role-Based Access Control (RBAC)**
```tsx
const rolePermissions = {
  'admin': { canDownload: true, canPrint: true, canCopy: true, maxZoom: 3.0 },
  'org_manager': { canDownload: true, canPrint: true, canCopy: false, maxZoom: 2.5 },
  'editor': { canDownload: true, canPrint: false, canCopy: false, maxZoom: 2.0 },
  'reviewer': { canDownload: false, canPrint: false, canCopy: false, maxZoom: 1.8 },
  'viewer': { canDownload: false, canPrint: false, canCopy: false, maxZoom: 1.5 },
  'guest': { canDownload: false, canPrint: false, canCopy: false, maxZoom: 1.2 }
};
```

### 2. **Client-Side Security Measures**
- ✅ **Right-click prevention** - Blokir context menu
- ✅ **Keyboard shortcuts blocking** - Cegah Ctrl+S, Ctrl+P, F12, dll
- ✅ **Text selection control** - Kontrol berdasarkan role
- ✅ **Drag & drop prevention** - Cegah drag konten
- ✅ **Developer tools detection** - Deteksi pembukaan DevTools
- ✅ **Print screen blocking** - Blokir screenshot
- ✅ **Watermark overlay** - Overlay watermark untuk role tertentu

### 3. **PDF.js Integration**
- ✅ **Custom controls** - Kontrol navigasi dan zoom sendiri
- ✅ **Disabled browser PDF toolbar** - Sembunyikan toolbar browser
- ✅ **Secure rendering** - Rendering aman tanpa akses file asli
- ✅ **Version control** - Support multiple PDF versions

## 🚀 Penggunaan

### 1. **Basic Implementation**
```tsx
import AdvancedPDFViewer from '@/components/documents/advanced-pdf-viewer';

function DocumentView() {
  return (
    <AdvancedPDFViewer
      fileUrl="/api/documents/123/view"
      fileName="confidential-report.pdf"
      userRole="viewer"
      document={documentObject}
    />
  );
}
```

### 2. **Advanced Configuration**
```tsx
<AdvancedPDFViewer
  fileUrl="/api/documents/123/view"
  fileName="sensitive-document.pdf"
  userRole="editor"
  canDownload={false}  // Override role permission
  canPrint={false}     // Override role permission
  canCopy={false}      // Override role permission
  watermark="CONFIDENTIAL"
  document={documentObject}
  onSecurityViolation={(type, details) => {
    console.log('Security violation:', type, details);
    // Send to monitoring system
  }}
/>
```

### 3. **Security Hook Usage**
```tsx
import useSecurityMeasures from '@/hooks/use-security-measures';

function SecureComponent() {
  useSecurityMeasures({
    onSecurityViolation: (type, details) => {
      // Handle security violations
      logSecurityEvent(type, details);
    },
    blockRightClick: true,
    blockKeyboardShortcuts: true,
    blockTextSelection: true,
    detectDevTools: true
  });

  return (
    <div className="secure-content no-select">
      {/* Your secure content */}
    </div>
  );
}
```

## 🛠️ Komponen yang Tersedia

### 1. **AdvancedPDFViewer** 
- PDF.js dengan kontrol penuh
- Role-based permissions
- Security monitoring
- Watermark support

### 2. **SecurePDFViewer**
- iframe-based viewer
- Lightweight alternative
- Basic security features

### 3. **useSecurityMeasures Hook**
- Comprehensive security measures
- Event blocking
- Violation monitoring

## 📋 Props Interface

```typescript
interface AdvancedPDFViewerProps {
  fileUrl: string;                    // URL PDF file
  fileName: string;                   // Nama file untuk display
  userRole?: string;                  // Role user (admin, org_manager, dll)
  canDownload?: boolean;              // Override download permission
  canPrint?: boolean;                 // Override print permission  
  canCopy?: boolean;                  // Override copy permission
  document?: any;                     // Document object metadata
  watermark?: string;                 // Custom watermark text
  onSecurityViolation?: (            // Security violation callback
    type: string, 
    details: any
  ) => void;
}
```

## 🔍 Security Violations Monitoring

### Jenis Pelanggaran yang Dideteksi:
- `RIGHT_CLICK_ATTEMPT` - Percobaan klik kanan
- `KEYBOARD_SHORTCUT_BLOCKED` - Shortcut yang diblokir
- `DEV_TOOLS_DETECTED` - Developer tools terbuka
- `DRAG_ATTEMPT` - Percobaan drag content
- `TEXT_SELECTION_BLOCKED` - Seleksi teks diblokir
- `PRINT_SCREEN_BLOCKED` - Print screen diblokir
- `ZOOM_ATTEMPT` - Percobaan zoom tanpa izin
- `DOWNLOAD_ATTEMPT` - Percobaan download tanpa izin

### Callback Handler:
```tsx
const handleSecurityViolation = (type: string, details: any) => {
  const violation = {
    type,
    timestamp: new Date().toISOString(),
    userRole: currentUserRole,
    fileName: currentFileName,
    details,
    userAgent: navigator.userAgent,
    ipAddress: userIP // dari server
  };
  
  // Send to monitoring service
  fetch('/api/security/violations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(violation)
  });
  
  // Local handling
  console.warn('Security violation:', violation);
};
```

## 🎨 CSS Classes untuk Security

```css
/* Disable text selection */
.no-select {
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

/* Disable drag */
.no-drag {
  -webkit-user-drag: none;
  user-drag: none;
  pointer-events: none;
}

/* Secure content container */
.secure-content {
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
}

/* Hide from print */
.no-print {
  display: none !important;
}

/* Blur when compromised */
.security-blur {
  filter: blur(5px);
  pointer-events: none;
}
```

## 🚀 Demo Page

Lihat implementasi lengkap di halaman demo:
```
http://localhost:3001/pdf-security-demo
```

Demo menampilkan:
- ✅ Role switching dalam real-time
- ✅ Security violations logging
- ✅ Feature comparison table
- ✅ Interactive testing

## 📝 Server-Side Integration

### API Endpoint untuk PDF View:
```typescript
// pages/api/documents/[id]/view.ts
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const userRole = req.session?.user?.role;
  
  // Check permissions
  if (!canViewDocument(userRole, id)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // Stream PDF with appropriate headers
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="document.pdf"');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-cache');
  
  // Stream PDF content
  const fileStream = fs.createReadStream(getDocumentPath(id));
  fileStream.pipe(res);
}
```

### Security Headers:
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Security headers untuk PDF
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Content-Security-Policy', 
    "frame-ancestors 'self'; object-src 'none';"
  );
  
  return response;
}
```

## ⚠️ Limitasi & Catatan Keamanan

### Client-Side Limitations:
1. **Tidak 100% secure** - User yang terampil masih bisa bypass
2. **Browser compatibility** - Beberapa fitur mungkin tidak work di semua browser
3. **JavaScript dependent** - Bisa di-disable oleh user

### Recommendations:
1. **Kombinasi dengan server-side security**
2. **Monitoring dan logging aktif**
3. **Regular security updates**
4. **User education tentang policy**

### Best Practices:
- ✅ Always validate permissions di server-side
- ✅ Log semua security violations
- ✅ Implement rate limiting untuk API
- ✅ Use HTTPS untuk semua PDF requests
- ✅ Regular security audits
- ✅ Monitor user behavior patterns

## 🔧 Troubleshooting

### PDF.js Worker Issues:
```bash
# Install worker dependency
npm install --save-dev copy-webpack-plugin

# Add to next.config.js
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  webpack: (config) => {
    config.plugins.push(
      new CopyPlugin({
        patterns: [
          {
            from: 'node_modules/pdfjs-dist/build/pdf.worker.min.js',
            to: 'static/chunks/'
          }
        ]
      })
    );
    return config;
  }
};
```

### CORS Issues:
```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/documents/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS' },
        ],
      },
    ];
  },
};
```

### Performance Optimization:
- ✅ Use lazy loading untuk PDF pages
- ✅ Implement virtual scrolling untuk large documents
- ✅ Cache PDF data di localStorage (dengan encryption)
- ✅ Optimize bundle size dengan code splitting

## 📚 Resources

- [PDF.js Documentation](https://mozilla.github.io/pdf.js/)
- [React PDF Documentation](https://github.com/wojtekmaj/react-pdf)
- [Web Security Best Practices](https://owasp.org/www-project-web-security-testing-guide/)
- [Content Security Policy Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
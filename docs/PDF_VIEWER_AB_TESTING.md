# PDF Viewer A/B Testing Implementation

## Overview
Implementasi A/B testing untuk membandingkan dua versi PDF viewer:
- **Legacy Viewer**: iframe-based dengan custom security controls
- **Enhanced Viewer**: EmbedPDF dengan fitur advanced (annotations, search, zoom, dll)

## Architecture

### Components

1. **SecurePDFViewer** (`pdf-viewer.tsx`)
   - iframe-based viewer
   - Role-based permission control
   - Disable download/print/copy
   - Activity tracking
   - **Status**: Production-ready (existing)

2. **EnhancedPDFViewer** (`enhanced-pdf-viewer.tsx`)
   - EmbedPDF-based viewer (@embedpdf/snippet)
   - Advanced features: annotations, search, zoom, rotate
   - Same permission system as legacy
   - Activity tracking compatible
   - **Status**: Testing phase

3. **PDFViewerWrapper** (`pdf-viewer-wrapper.tsx`)
   - Smart wrapper component
   - Feature flag switcher
   - Dapat override per-instance
   - Debug logging

### Feature Flag

Environment variable untuk control A/B testing:

```bash
# .env or .env.local
NEXT_PUBLIC_USE_ENHANCED_PDF_VIEWER="false"  # Default: legacy viewer
```

**Options:**
- `"true"` → Use Enhanced Viewer (EmbedPDF)
- `"false"` → Use Legacy Viewer (iframe)

## Usage

### Option 1: Global Switch (via env variable)

```bash
# .env
NEXT_PUBLIC_USE_ENHANCED_PDF_VIEWER="true"
```

```tsx
// Component automatically uses enhanced viewer
import { PDFViewerWrapper } from '@/components/documents/pdf-viewer-wrapper';

<PDFViewerWrapper
  fileUrl="/api/documents/123/download"
  fileName="document.pdf"
  userRole="admin"
  canDownload={true}
  document={document}
/>
```

### Option 2: Per-Instance Override

```tsx
// Force enhanced viewer for specific document
<PDFViewerWrapper
  fileUrl="/api/documents/123/download"
  fileName="document.pdf"
  userRole="admin"
  canDownload={true}
  document={document}
  useEnhanced={true}  // Override: always use enhanced
/>

// Force legacy viewer
<PDFViewerWrapper
  useEnhanced={false}  // Override: always use legacy
  {...props}
/>
```

### Option 3: Direct Import (bypass wrapper)

```tsx
// Use enhanced viewer directly
import { EnhancedPDFViewer } from '@/components/documents/enhanced-pdf-viewer';

<EnhancedPDFViewer {...props} />

// Use legacy viewer directly
import { SecurePDFViewer } from '@/components/documents/pdf-viewer';

<SecurePDFViewer {...props} />
```

## Migration Guide

### Step 1: Update Existing Components

Replace direct `SecurePDFViewer` imports with `PDFViewerWrapper`:

**Before:**
```tsx
import { SecurePDFViewer } from '@/components/documents/pdf-viewer';

<SecurePDFViewer
  fileUrl={`/api/documents/${doc.id}/download`}
  fileName={doc.fileName}
  userRole={session.user.role}
  canDownload={false}
  document={doc}
/>
```

**After:**
```tsx
import { PDFViewerWrapper } from '@/components/documents/pdf-viewer-wrapper';

<PDFViewerWrapper
  fileUrl={`/api/documents/${doc.id}/download`}
  fileName={doc.fileName}
  userRole={session.user.role}
  canDownload={false}
  document={doc}
/>
```

### Step 2: Files to Update

1. **src/components/documents/documents-list.tsx** (line ~865)
   ```tsx
   - import { SecurePDFViewer } from './pdf-viewer'
   + import { PDFViewerWrapper } from './pdf-viewer-wrapper'
   
   - <SecurePDFViewer
   + <PDFViewerWrapper
   ```

2. **src/components/search/search-page.tsx** (line ~577)
   ```tsx
   - const SecurePDFViewer = dynamic(...)
   + const PDFViewerWrapper = dynamic(() => 
   +   import('@/components/documents/pdf-viewer-wrapper').then(mod => ({ default: mod.PDFViewerWrapper })),
   +   { ssr: false }
   + )
   
   - <SecurePDFViewer
   + <PDFViewerWrapper
   ```

## Testing Strategy

### Phase 1: Internal Testing (Current)
- ✅ Install @embedpdf/snippet
- ✅ Create EnhancedPDFViewer component
- ✅ Create PDFViewerWrapper with feature flag
- 🔄 Test basic functionality
- 🔄 Test permission system
- 🔄 Test activity tracking

### Phase 2: A/B Testing
1. **Control Group (50% users)**: Legacy viewer
2. **Test Group (50% users)**: Enhanced viewer
3. **Metrics to track**:
   - Page load time
   - User engagement (time spent viewing)
   - Error rates
   - User satisfaction (surveys)
   - Browser compatibility

### Phase 3: Rollout
Based on metrics:
- If Enhanced > Legacy → Set `USE_ENHANCED_PDF_VIEWER=true` globally
- If Legacy > Enhanced → Keep legacy, remove enhanced
- If Mixed → Provide user preference toggle

## Feature Comparison

| Feature | Legacy (iframe) | Enhanced (EmbedPDF) |
|---------|----------------|---------------------|
| View PDF | ✅ | ✅ |
| Zoom/Pan | ⚠️ (browser) | ✅ (built-in) |
| Search | ❌ | ✅ |
| Annotations | ❌ | ✅ |
| Text Selection | ⚠️ (can disable) | ✅ (controlled) |
| Print Control | ✅ | ✅ |
| Download Control | ✅ | ✅ |
| Copy Control | ✅ | ✅ |
| Activity Tracking | ✅ | ✅ |
| Bundle Size | ~0 KB | ~500 KB (estimated) |
| Browser Compat | ✅✅ | ✅ (modern browsers) |
| Mobile Support | ✅ | ✅ |
| Offline Support | ❌ | ❌ |

## Performance Considerations

### Bundle Size Impact
```bash
# Check bundle size after install
npm run build

# Compare .next/static/chunks/
# Before: ~X MB
# After: ~X + 0.5 MB (EmbedPDF)
```

### Lazy Loading
Enhanced viewer di-lazy load untuk minimize initial bundle:
```tsx
const PDFViewerWrapper = dynamic(
  () => import('@/components/documents/pdf-viewer-wrapper'),
  { ssr: false }
);
```

## Security Considerations

### Same Permission System
Both viewers use identical permission checking:
1. Load from `/api/documents/[id]/permissions`
2. Apply role-based controls
3. Track activities via `/api/documents/[id]/activities`

### EmbedPDF Specific
- ✅ Disable toolbar download button
- ✅ Disable print from viewer
- ✅ Control text selection
- ⚠️ Browser extensions masih bisa bypass
- ⚠️ DevTools masih bisa akses

## Troubleshooting

### Enhanced Viewer Not Loading
1. Check console for errors
2. Verify @embedpdf/snippet installed: `npm list @embedpdf/snippet`
3. Check file URL is correct API endpoint
4. Verify CORS if using external PDF

### Feature Flag Not Working
1. Restart Next.js server after env change
2. Check env variable: `console.log(process.env.NEXT_PUBLIC_USE_ENHANCED_PDF_VIEWER)`
3. Verify `NEXT_PUBLIC_` prefix (required for client-side)

### Permissions Not Applied
1. Check API response: `/api/documents/[id]/permissions`
2. Verify session exists
3. Check console logs for permission loading

## Rollback Plan

If enhanced viewer causes issues:

### Quick Rollback (No Code Change)
```bash
# Set flag to false
NEXT_PUBLIC_USE_ENHANCED_PDF_VIEWER="false"

# Restart server
npm run dev
```

### Complete Rollback
1. Uninstall package: `npm uninstall @embedpdf/snippet`
2. Revert imports back to `SecurePDFViewer`
3. Remove `enhanced-pdf-viewer.tsx`
4. Remove `pdf-viewer-wrapper.tsx`
5. Remove feature flag from .env

## Future Enhancements

### User Preference Toggle
Allow users to choose viewer:
```tsx
// Add to user settings
interface UserPreferences {
  pdfViewer: 'legacy' | 'enhanced';
}

// Use in wrapper
<PDFViewerWrapper
  useEnhanced={userPrefs.pdfViewer === 'enhanced'}
  {...props}
/>
```

### Role-Based Auto Selection
```tsx
const roleToViewer = {
  admin: 'enhanced',     // Need annotations
  editor: 'enhanced',    // Need search
  viewer: 'legacy',      // Basic viewing
};

<PDFViewerWrapper
  useEnhanced={roleToViewer[userRole] === 'enhanced'}
  {...props}
/>
```

## References

- EmbedPDF Docs: https://www.embedpdf.com/
- GitHub: https://github.com/embedpdf/embed-pdf-viewer
- License: MIT
